import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

// Retry helper with exponential backoff
async function withRetry(fn, { retries = 2, baseDelay = 1000, shouldRetry = () => true } = {}) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry on abort or if shouldRetry returns false
      if (error.name === 'AbortError' || error.message?.includes('AbortError')) {
        throw error
      }

      if (attempt < retries && shouldRetry(error)) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      throw error
    }
  }
  throw lastError
}

// Throttle helper
function throttle(fn, delay) {
  let lastCall = 0
  let timeoutId = null

  return (...args) => {
    const now = Date.now()
    const remaining = delay - (now - lastCall)

    if (remaining <= 0) {
      lastCall = now
      fn(...args)
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now()
        timeoutId = null
        fn(...args)
      }, remaining)
    }
  }
}

/**
 * Token Configuration
 * Using Helius RPC for mainnet token balance checking
 */
const HELIUS_RPC_URL = "https://lurleen-mzv5vx-fast-mainnet.helius-rpc.com"
const TOKEN_MINT = "8LSpERCFafc1qfxrHVj4QaZ9k1jgNuUNAfVMJ9gApump"

/**
 * Fetch SPL token balance from Solana mainnet using Helius RPC
 * @param {string} walletAddress - Solana wallet address
 * @returns {Promise<number>} Token balance (UI amount)
 */
async function fetchTokenBalance(walletAddress) {
  try {
    const response = await fetch(HELIUS_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          walletAddress,
          { mint: TOKEN_MINT },
          { encoding: "jsonParsed" },
        ],
      }),
    })

    const json = await response.json()

    if (!json.result?.value) {
      console.log("No token accounts found for wallet")
      return 0
    }

    let total = 0
    for (const acc of json.result.value) {
      const tokenAmount = acc.account.data.parsed.info.tokenAmount
      const amount = tokenAmount.uiAmount ?? Number(tokenAmount.uiAmountString)
      total += amount
    }

    console.log("MAINNET TOKEN BALANCE:", total)
    return total
  } catch (err) {
    console.error("Token balance check failed:", err)
    return 0
  }
}

export function AuthProvider({ children }) {
  // Core state
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [authError, setAuthError] = useState(null)

  // Wallet state (for non-authenticated users)
  const [localWalletAddress, setLocalWalletAddress] = useState(null)
  const [isWalletConnecting, setIsWalletConnecting] = useState(false)
  const [liveTokenBalance, setLiveTokenBalance] = useState(0) // Real-time blockchain balance

  // Refs for cleanup and race condition prevention
  const mountedRef = useRef(true)
  const initCompleteRef = useRef(false)
  const backgroundRetryRef = useRef(null)
  const profileSubscriptionRef = useRef(null)

  // Fetch user profile from profiles table
  const fetchProfile = useCallback(async (userId, options = {}) => {
    const { timeout = 5000, useRetry = true } = options

    const fetchFn = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // Profile doesn't exist yet - not an error
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data
    }

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), timeout)
      )

      const fetchPromise = useRetry
        ? withRetry(fetchFn, {
          retries: 2,
          baseDelay: 1000,
          shouldRetry: (error) =>
            error.message?.includes('fetch') ||
            error.message?.includes('network') ||
            error.message?.includes('Failed to fetch')
        })
        : fetchFn()

      return await Promise.race([fetchPromise, timeoutPromise])
    } catch (error) {
      // Ignore abort errors
      if (error.name === 'AbortError' || error.message?.includes('AbortError')) {
        return null
      }
      throw error
    }
  }, [])

  /**
   * Fetch user profile by wallet address
   * Used for wallet-based authentication - looks up existing user by their wallet
   * 
   * TODO: For full SIWS (Sign In With Solana) implementation:
   * - Replace this with a call to Supabase Edge Function
   * - Edge Function would verify wallet signature and return JWT
   * - See: https://docs.phantom.app/solana/signing-a-message
   */
  const fetchProfileByWallet = useCallback(async (walletAddress, options = {}) => {
    const { timeout = 5000 } = options

    const fetchFn = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single()

      if (error) {
        // Profile doesn't exist for this wallet - not an error, just means new user
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data
    }

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), timeout)
      )

      return await Promise.race([fetchFn(), timeoutPromise])
    } catch (error) {
      if (error.name === 'AbortError' || error.message?.includes('AbortError')) {
        return null
      }
      throw error
    }
  }, [])

  // Subscribe to profile changes
  const subscribeToProfile = useCallback((userId) => {
    // Cleanup existing subscription
    if (profileSubscriptionRef.current) {
      supabase.removeChannel(profileSubscriptionRef.current)
    }

    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (mountedRef.current && payload.new) {
            setProfile(payload.new)
          }
        }
      )
      .subscribe()

    profileSubscriptionRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      profileSubscriptionRef.current = null
    }
  }, [])

  // Update auth state from session
  const updateAuthState = useCallback(async (session, options = {}) => {
    const { retryInBackground = true, isInitial = false } = options

    // Clear any pending background retry
    if (backgroundRetryRef.current) {
      clearTimeout(backgroundRetryRef.current)
      backgroundRetryRef.current = null
    }

    if (!session?.user) {
      // Batch state updates
      setUser(null)
      setProfile(null)
      setAuthError(null)
      return
    }

    setUser(session.user)
    setAuthError(null)

    try {
      setIsProfileLoading(true)
      const profileData = await fetchProfile(session.user.id, {
        timeout: isInitial ? 5000 : 10000,
        useRetry: true,
      })

      if (mountedRef.current) {
        setProfile(profileData)

        // Subscribe to profile updates
        if (profileData) {
          subscribeToProfile(session.user.id)
        }
      }
    } catch (error) {
      const isTimeout = error.message?.includes('timeout')

      console.warn(
        isTimeout
          ? 'Profile fetch timed out - user authenticated but profile delayed'
          : 'Profile fetch failed:',
        error.message
      )

      if (mountedRef.current) {
        setProfile(null)

        // Retry in background if timeout and requested
        if (isTimeout && retryInBackground) {
          backgroundRetryRef.current = setTimeout(async () => {
            if (!mountedRef.current) return

            try {
              console.log('Retrying profile fetch in background...')
              const profileData = await fetchProfile(session.user.id, {
                timeout: 15000,
                useRetry: true,
              })

              if (mountedRef.current && profileData) {
                setProfile(profileData)
                subscribeToProfile(session.user.id)
                console.log('Background profile fetch succeeded')
              }
            } catch (retryError) {
              console.warn('Background profile retry failed:', retryError.message)
            }
          }, 3000)
        }
      }
    } finally {
      if (mountedRef.current) {
        setIsProfileLoading(false)
      }
    }
  }, [fetchProfile, subscribeToProfile])

  // Initialize auth state on mount
  useEffect(() => {
    mountedRef.current = true
    let fallbackTimeoutId = null

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting initial session:', error)
          await supabase.auth.signOut().catch(() => { })

          if (mountedRef.current) {
            setAuthError(error)
            setIsLoading(false)
            initCompleteRef.current = true
          }
          return
        }

        if (session?.user) {
          // Check if session needs refresh
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
          const isExpiringSoon = expiresAt - Date.now() < 60000

          if (isExpiringSoon) {
            console.log('Session expiring soon, refreshing...')
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

            if (refreshError || !refreshData.session) {
              console.warn('Session refresh failed:', refreshError)
              await supabase.auth.signOut().catch(() => { })

              if (mountedRef.current) {
                setUser(null)
                setProfile(null)
                setAuthError(refreshError)
                setIsLoading(false)
                initCompleteRef.current = true
              }
              return
            }

            if (mountedRef.current) {
              await updateAuthState(refreshData.session, { isInitial: true })
            }
          } else {
            if (mountedRef.current) {
              await updateAuthState(session, { isInitial: true })
            }
          }
        }

        if (mountedRef.current) {
          initCompleteRef.current = true
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        await supabase.auth.signOut().catch(() => { })

        if (mountedRef.current) {
          setUser(null)
          setProfile(null)
          setAuthError(error)
          setIsLoading(false)
          initCompleteRef.current = true
        }
      }
    }

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return

        console.log('Auth event:', event, session?.user?.email || 'no user')

        // Handle token refresh failure
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('Token refresh failed, clearing session')
          setUser(null)
          setProfile(null)
          setIsLoading(false)
          return
        }

        // Skip INITIAL_SESSION if we've already initialized
        if (event === 'INITIAL_SESSION') {
          if (!initCompleteRef.current && session?.user) {
            await updateAuthState(session, { isInitial: true })
            setIsLoading(false)
          }
          initCompleteRef.current = true
          return
        }

        // Handle session events
        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
          case 'USER_UPDATED':
            if (session?.user) {
              await updateAuthState(session)
            }
            setIsLoading(false)
            break

          case 'SIGNED_OUT':
          case 'USER_DELETED':
            // Cleanup profile subscription
            if (profileSubscriptionRef.current) {
              supabase.removeChannel(profileSubscriptionRef.current)
              profileSubscriptionRef.current = null
            }
            setUser(null)
            setProfile(null)
            setIsLoading(false)
            break
        }
      }
    )

    // Start initialization
    initializeAuth()

    // Fallback timeout for stuck loading
    fallbackTimeoutId = setTimeout(() => {
      if (mountedRef.current && !initCompleteRef.current) {
        console.warn('Auth initialization timeout (12s) - forcing completion')
        setIsLoading(false)
        initCompleteRef.current = true
      }
    }, 12000)

    // Throttled visibility change handler
    const handleVisibilityChange = throttle(async () => {
      if (document.visibilityState !== 'visible' || !mountedRef.current) return

      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Session check failed:', error)
          if (error.message?.includes('invalid') || error.message?.includes('expired')) {
            await supabase.auth.signOut()
          }
          return
        }

        if (session?.user) {
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
          if (expiresAt - Date.now() < 60000) {
            console.log('Refreshing expiring session on visibility change...')
            await supabase.auth.refreshSession()
          }

          if (mountedRef.current) {
            setUser(session.user)
          }
        }
      } catch (err) {
        console.error('Error checking session on visibility change:', err)
      }
    }, 5000) // Throttle to max once per 5 seconds

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mountedRef.current = false

      // Cleanup timeouts
      if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId)
      if (backgroundRetryRef.current) clearTimeout(backgroundRetryRef.current)

      // Cleanup subscriptions
      subscription.unsubscribe()
      if (profileSubscriptionRef.current) {
        supabase.removeChannel(profileSubscriptionRef.current)
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [updateAuthState])

  // Phantom wallet event listeners
  useEffect(() => {
    // Only use window.phantom.solana to avoid Brave wallet interference
    const phantom = window?.phantom?.solana
    if (!phantom?.isPhantom) return

    const handleAccountChanged = (publicKey) => {
      if (publicKey) {
        setLocalWalletAddress(publicKey.toString())
      } else {
        setLocalWalletAddress(null)
      }
    }

    const handleDisconnect = () => {
      setLocalWalletAddress(null)
    }

    phantom.on('accountChanged', handleAccountChanged)
    phantom.on('disconnect', handleDisconnect)

    // Try eager connection for returning trusted users
    phantom.connect({ onlyIfTrusted: true })
      .then((resp) => setLocalWalletAddress(resp.publicKey.toString()))
      .catch(() => { }) // Silent fail for non-trusted apps

    return () => {
      phantom.off('accountChanged', handleAccountChanged)
      phantom.off('disconnect', handleDisconnect)
    }
  }, [])

  // Sign up with email, password, nickname and user type
  const signUp = useCallback(async (email, password, nickname, userType) => {
    setAuthError(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nickname,
            user_type: userType,
          },
        },
      })

      if (error) throw error

      // Wait for trigger to create profile, then fetch it
      if (data.user) {
        await new Promise(resolve => setTimeout(resolve, 500))

        try {
          const profileData = await fetchProfile(data.user.id, { timeout: 5000 })
          setProfile(profileData)
        } catch (profileError) {
          console.warn('Profile fetch after signup failed:', profileError)
          // Don't fail signup - profile will be fetched later
        }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      setAuthError(error)
      return { data: null, error }
    }
  }, [fetchProfile])

  // Sign in with email and password
  const signIn = useCallback(async (email, password) => {
    setAuthError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message?.includes('Email not confirmed')) {
          const customError = new Error(
            'Please confirm your email address before signing in. Check your inbox for the confirmation link.'
          )
          customError.code = 'email_not_confirmed'
          throw customError
        }
        throw error
      }

      if (data.user) {
        try {
          const profileData = await fetchProfile(data.user.id, { timeout: 5000 })
          setProfile(profileData)

          if (profileData) {
            subscribeToProfile(data.user.id)
          }
        } catch (profileError) {
          console.warn('Profile fetch failed during sign in:', profileError)
          // Don't fail sign in - auth state change will handle it
        }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      setAuthError(error)
      return { data: null, error }
    }
  }, [fetchProfile, subscribeToProfile])

  // Sign out
  const signOut = useCallback(async () => {
    try {
      // Cleanup profile subscription
      if (profileSubscriptionRef.current) {
        supabase.removeChannel(profileSubscriptionRef.current)
        profileSubscriptionRef.current = null
      }

      // Clear background retry
      if (backgroundRetryRef.current) {
        clearTimeout(backgroundRetryRef.current)
        backgroundRetryRef.current = null
      }

      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      setProfile(null)
      setAuthError(null)

      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error }
    }
  }, [])

  // Update user profile
  const updateProfile = useCallback(async (updates) => {
    if (!user) {
      const error = new Error('No user logged in')
      return { data: null, error }
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      // Profile subscription will update state automatically
      // But we update immediately for responsiveness
      setProfile(data)

      return { data, error: null }
    } catch (error) {
      console.error('Update profile error:', error)
      return { data: null, error }
    }
  }, [user])

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (!user) return { data: null, error: new Error('No user logged in') }

    try {
      setIsProfileLoading(true)
      const profileData = await fetchProfile(user.id, { timeout: 10000 })
      setProfile(profileData)
      return { data: profileData, error: null }
    } catch (error) {
      console.error('Refresh profile error:', error)
      return { data: null, error }
    } finally {
      setIsProfileLoading(false)
    }
  }, [user, fetchProfile])

  // Force refresh auth session
  const forceRefreshAuth = useCallback(async () => {
    setIsLoading(true)
    setAuthError(null)

    try {
      console.log('Force refreshing auth session...')

      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Session check failed:', error)
        await supabase.auth.signOut().catch(() => { })
        setUser(null)
        setProfile(null)
        setAuthError(error)
        setIsLoading(false)
        return { error }
      }

      if (session?.user) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

        if (refreshError || !refreshData.session) {
          console.warn('Session refresh failed:', refreshError)
          await supabase.auth.signOut().catch(() => { })
          setUser(null)
          setProfile(null)
          setAuthError(refreshError)
          setIsLoading(false)
          return { error: refreshError }
        }

        await updateAuthState(refreshData.session)
        setIsLoading(false)
        return { error: null }
      } else {
        setUser(null)
        setProfile(null)
        setIsLoading(false)
        return { error: new Error('No active session') }
      }
    } catch (error) {
      console.error('Force refresh failed:', error)
      await supabase.auth.signOut().catch(() => { })
      setUser(null)
      setProfile(null)
      setAuthError(error)
      setIsLoading(false)
      return { error }
    }
  }, [updateAuthState])

  /**
   * Connect Phantom wallet and check if profile exists
   * 
   * TODO: For full SIWS (Sign In With Solana) implementation:
   * - After connecting, prompt user to sign a message
   * - Send signature to Edge Function for verification
   * - Edge Function returns JWT if valid
   * - Use JWT to create Supabase session
   */
  const connectWallet = useCallback(async () => {
    try {
      setIsWalletConnecting(true)

      // Only use window.phantom.solana to avoid Brave wallet interference
      const phantom = window?.phantom?.solana

      if (!phantom?.isPhantom) {
        window.open('https://phantom.app/', '_blank')
        setIsWalletConnecting(false)
        return { error: new Error('Phantom wallet not installed') }
      }

      // Connect to Phantom
      const response = await phantom.connect()
      const address = response.publicKey.toString()

      // Store locally
      setLocalWalletAddress(address)

      // Fetch real token balance from blockchain (mainnet)
      let balance = 0
      try {
        balance = await fetchTokenBalance(address)
        setLiveTokenBalance(balance)
      } catch (err) {
        console.warn('Token balance fetch failed:', err)
      }

      // Check if profile exists for this wallet address
      let existingProfile = null
      try {
        existingProfile = await fetchProfileByWallet(address)
      } catch (err) {
        console.warn('Profile lookup failed:', err)
      }

      // If user is logged in with email, update their profile with wallet
      if (user && !existingProfile) {
        await updateProfile({ wallet_address: address })
      }

      setIsWalletConnecting(false)
      return {
        address,
        profile: existingProfile,
        profileExists: !!existingProfile,
        tokenBalance: balance,
        error: null
      }
    } catch (err) {
      console.error('Wallet connection failed:', err)
      setIsWalletConnecting(false)

      // Handle common Phantom errors
      if (err.code === 4001) {
        return { error: new Error('Connection rejected by user') }
      }

      if (err.message?.includes('Unexpected error')) {
        alert('Phantom encountered an error.\n\nTry these fixes:\n1. Reinstall Phantom extension\n2. Go to brave://settings/wallet and set Default Solana wallet to "None"\n3. Refresh this page')
        return { error: new Error('Phantom extension error - try reinstalling') }
      }

      return { error: err }
    }
  }, [user, updateProfile, fetchProfileByWallet])

  /**
   * Sign in with wallet - authenticates user based on wallet address
   * Looks up profile by wallet_address and sets as current user
   * 
   * TODO: For full SIWS (Sign In With Solana) implementation:
   * 1. Generate nonce from server
   * 2. Prompt user to sign message: "Sign in to PumpWork\nNonce: {nonce}"
   * 3. Send signature to Supabase Edge Function
   * 4. Edge Function verifies signature using @solana/web3.js
   * 5. If valid, Edge Function creates JWT with user data
   * 6. Use supabase.auth.setSession() with the JWT
   * 
   * Current implementation: Simple wallet lookup (no cryptographic verification)
   */
  const signInWithWallet = useCallback(async () => {
    setAuthError(null)
    setIsWalletConnecting(true)

    try {
      // Connect wallet first
      const { address, profile: walletProfile, error: connectError } = await connectWallet()

      if (connectError) {
        setAuthError(connectError)
        setIsWalletConnecting(false)
        return { data: null, error: connectError }
      }

      if (!address) {
        const error = new Error('No wallet address received')
        setAuthError(error)
        setIsWalletConnecting(false)
        return { data: null, error }
      }

      // If profile exists for this wallet, "log them in" by setting profile state
      if (walletProfile) {
        setProfile(walletProfile)
        // Note: This is a "soft" login - no real Supabase session
        // The profile data acts as the user's identity
        setIsWalletConnecting(false)
        return {
          data: {
            profile: walletProfile,
            address,
            isNewUser: false
          },
          error: null
        }
      }

      // No profile exists - user needs to register
      setIsWalletConnecting(false)
      return {
        data: {
          address,
          isNewUser: true,
          profile: null
        },
        error: null
      }
    } catch (err) {
      console.error('Wallet sign in error:', err)
      setAuthError(err)
      setIsWalletConnecting(false)
      return { data: null, error: err }
    }
  }, [connectWallet])

  /**
   * Register new user with wallet
   * Creates a profile entry with the wallet address
   * 
   * TODO: For full SIWS, this would:
   * 1. Verify wallet signature
   * 2. Create auth.users entry via Edge Function
   * 3. Profile trigger creates profiles entry
   */
  const registerWithWallet = useCallback(async (walletAddress, nickname, userType) => {
    setAuthError(null)

    try {
      // Check if wallet already has a profile
      const existingProfile = await fetchProfileByWallet(walletAddress)
      if (existingProfile) {
        return {
          data: null,
          error: new Error('This wallet is already registered')
        }
      }

      // For now, we need a Supabase user to create a profile (due to RLS)
      // This is a limitation that would be solved with Edge Functions
      // 
      // Workaround: Create a "wallet user" using a generated email
      // This is a temporary solution until full SIWS is implemented
      const tempEmail = `${walletAddress.slice(0, 8)}@wallet.pumpwork.local`
      const tempPassword = `wallet_${walletAddress}_${Date.now()}`

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: tempEmail,
        password: tempPassword,
        options: {
          data: {
            nickname,
            user_type: userType,
            wallet_address: walletAddress,
            is_wallet_user: true
          }
        }
      })

      if (signUpError) {
        // If email exists, the wallet might already be registered under a temp email
        if (signUpError.message?.includes('already registered')) {
          return {
            data: null,
            error: new Error('This wallet appears to already be registered')
          }
        }
        throw signUpError
      }

      // Wait for profile trigger
      await new Promise(resolve => setTimeout(resolve, 500))

      // Update profile with wallet address
      if (signUpData.user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            wallet_address: walletAddress,
            nickname,
            user_type: userType
          })
          .eq('id', signUpData.user.id)

        if (updateError) {
          console.warn('Profile update error:', updateError)
        }

        // Fetch the updated profile
        const profile = await fetchProfile(signUpData.user.id)
        setProfile(profile)
      }

      return {
        data: {
          user: signUpData.user,
          session: signUpData.session
        },
        error: null
      }
    } catch (err) {
      console.error('Wallet registration error:', err)
      setAuthError(err)
      return { data: null, error: err }
    }
  }, [fetchProfileByWallet, fetchProfile])

  const disconnectWallet = useCallback(async () => {
    try {
      // Only use window.phantom.solana to avoid Brave wallet interference
      const phantom = window?.phantom?.solana

      if (phantom?.isPhantom) {
        await phantom.disconnect()
      }

      setLocalWalletAddress(null)

      if (user) {
        await updateProfile({ wallet_address: null })
      }

      return { error: null }
    } catch (err) {
      console.error('Wallet disconnect failed:', err)
      return { error: err }
    }
  }, [user, updateProfile])

  // Clear auth error
  const clearAuthError = useCallback(() => {
    setAuthError(null)
  }, [])

  /**
   * Token thresholds for role access
   * - 1K tokens = Client (can hire freelancers)
   * - 10K tokens = Freelancer (can offer services)
   * - 50K tokens = Boosted Freelancer (premium visibility)
   */
  const TOKEN_THRESHOLDS = {
    CLIENT: 1000,           // 1K tokens to be a client
    FREELANCER: 10000,      // 10K tokens to be a freelancer
    BOOSTED_FREELANCER: 50000,  // 50K tokens for boosted status
  }

  // Memoized computed values with token-based role access
  const computedValues = useMemo(() => {
    // Prioritize live blockchain balance over stored profile balance
    const tokenBalance = liveTokenBalance > 0 ? liveTokenBalance : (profile?.token_balance || 0)

    // Determine access levels based on token holdings
    const canBeClient = tokenBalance >= TOKEN_THRESHOLDS.CLIENT
    const canBeFreelancer = tokenBalance >= TOKEN_THRESHOLDS.FREELANCER
    const isBoostedFreelancer = tokenBalance >= TOKEN_THRESHOLDS.BOOSTED_FREELANCER

    // User's stored role from profile
    const storedRole = profile?.user_type

    // Actual role: stored role is valid only if user has enough tokens
    // If they don't have enough tokens, they lose that role access
    let effectiveRole = storedRole
    if (storedRole === 'freelancer' && !canBeFreelancer) {
      // Lost freelancer access, downgrade to client if possible
      effectiveRole = canBeClient ? 'client' : null
    } else if (storedRole === 'client' && !canBeClient) {
      // Lost client access
      effectiveRole = null
    }

    return {
      isAuthenticated: !!user || !!profile,  // Auth via email OR wallet-based profile

      // Role based on stored profile type (but validated against tokens)
      isClient: effectiveRole === 'client' || storedRole === 'admin',
      isFreelancer: effectiveRole === 'freelancer' || storedRole === 'admin',
      isAdmin: storedRole === 'admin',

      // Token-based access flags
      canBeClient,
      canBeFreelancer,
      isBoostedFreelancer,

      // Actual effective role after token validation
      effectiveRole,
      storedRole,

      // Wallet connection
      isWalletConnected: !!(localWalletAddress || profile?.wallet_address),
      walletAddress: localWalletAddress || profile?.wallet_address || null,
      tokenBalance,
      liveTokenBalance, // Also expose the raw live balance

      // Token thresholds for UI display
      tokenThresholds: TOKEN_THRESHOLDS,
    }
  }, [user, profile, localWalletAddress, liveTokenBalance])

  // Check if user has minimum tokens for a specific threshold
  const hasMinTokens = useCallback((required) => {
    return computedValues.tokenBalance >= required
  }, [computedValues.tokenBalance])

  // Check if user can access a specific role
  const canAccessRole = useCallback((role) => {
    switch (role) {
      case 'client':
        return computedValues.canBeClient
      case 'freelancer':
        return computedValues.canBeFreelancer
      case 'boosted':
        return computedValues.isBoostedFreelancer
      case 'admin':
        return computedValues.isAdmin
      default:
        return false
    }
  }, [computedValues])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    // State
    user,
    profile,
    isLoading,
    isProfileLoading,
    authError,
    isWalletConnecting,

    // Computed values
    ...computedValues,

    // Actions
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    forceRefreshAuth,
    connectWallet,
    disconnectWallet,
    hasMinTokens,
    canAccessRole,
    clearAuthError,
    // Wallet authentication (simple mode - TODO: upgrade to SIWS)
    signInWithWallet,
    registerWithWallet,
  }), [
    user,
    profile,
    isLoading,
    isProfileLoading,
    authError,
    isWalletConnecting,
    computedValues,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    forceRefreshAuth,
    connectWallet,
    disconnectWallet,
    hasMinTokens,
    canAccessRole,
    clearAuthError,
    signInWithWallet,
    registerWithWallet,
  ])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * AuthReadyGate - Prevents children from rendering until auth is initialized
 */
export function AuthReadyGate({ children, fallback }) {
  const { isLoading, forceRefreshAuth, authError, clearAuthError } = useAuth()
  const [showRecovery, setShowRecovery] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const stuckTimerRef = useRef(null)

  useEffect(() => {
    if (!isLoading) {
      setShowRecovery(false)
      setIsRecovering(false)
      if (stuckTimerRef.current) {
        clearTimeout(stuckTimerRef.current)
        stuckTimerRef.current = null
      }
      return
    }

    // Show recovery option after 8 seconds
    stuckTimerRef.current = setTimeout(() => {
      setShowRecovery(true)
    }, 8000)

    return () => {
      if (stuckTimerRef.current) {
        clearTimeout(stuckTimerRef.current)
      }
    }
  }, [isLoading])

  const handleRecovery = async () => {
    setIsRecovering(true)
    clearAuthError()

    try {
      await forceRefreshAuth()
    } catch (error) {
      console.error('Recovery failed:', error)
    } finally {
      setIsRecovering(false)
    }
  }

  const handleContinueWithoutProfile = () => {
    // Force loading to complete even without profile
    window.location.reload()
  }

  if (isLoading) {
    if (fallback) return fallback

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md px-4">
          <div className="relative">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>

          <p className="text-muted-foreground text-sm text-center">
            {isRecovering ? 'Reconnecting...' : 'Initializing...'}
          </p>

          {/* Error display */}
          {authError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
              <p className="text-sm text-destructive">
                {authError.message || 'Authentication error occurred'}
              </p>
            </div>
          )}

          {/* Recovery options */}
          {showRecovery && !isRecovering && (
            <div className="flex flex-col items-center gap-3 mt-4 animate-in fade-in duration-300">
              <p className="text-sm text-muted-foreground text-center">
                Taking longer than expected...
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleRecovery}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Retry Connection
                </button>

                <button
                  onClick={handleContinueWithoutProfile}
                  className="px-4 py-2 bg-muted text-muted-foreground rounded-full text-sm font-medium hover:bg-muted/80 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return children
}

/**
 * RequireAuth - Wrapper that redirects to login if not authenticated
 */
export function RequireAuth({ children, redirectTo = '/login' }) {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate ? useNavigate() : null

  useEffect(() => {
    if (!isLoading && !isAuthenticated && navigate) {
      navigate(redirectTo, { replace: true })
    }
  }, [isLoading, isAuthenticated, redirectTo, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return children
}

/**
 * RequireProfile - Wrapper that shows loading until profile is available
 */
export function RequireProfile({ children, fallback }) {
  const { profile, isProfileLoading, refreshProfile } = useAuth()
  const [showRetry, setShowRetry] = useState(false)

  useEffect(() => {
    if (isProfileLoading || profile) {
      setShowRetry(false)
      return
    }

    // Show retry after 3 seconds if no profile
    const timer = setTimeout(() => {
      if (!profile) {
        setShowRetry(true)
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [isProfileLoading, profile])

  if (profile) {
    return children
  }

  if (fallback) return fallback

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading profile...</p>

        {showRetry && (
          <button
            onClick={refreshProfile}
            className="text-sm text-primary hover:underline"
          >
            Retry loading profile
          </button>
        )}
      </div>
    </div>
  )
}
