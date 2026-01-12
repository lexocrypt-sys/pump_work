import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Wallet, ArrowRight, User, Briefcase, AlertCircle, Loader2, CheckCircle2, Coins, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

/**
 * Register Page - Wallet-Only Registration
 * 
 * Token-Based Role Access:
 * - 1K tokens = Client (can hire freelancers)
 * - 10K tokens = Freelancer (can offer services)
 * - 50K tokens = Boosted Freelancer (premium visibility)
 * 
 * Role is determined by token balance, not manual selection.
 */
export default function Register() {
  const navigate = useNavigate()
  const {
    profile,
    isAuthenticated,
    isWalletConnected,
    isWalletConnecting,
    walletAddress,
    tokenBalance,
    canBeClient,
    canBeFreelancer,
    isBoostedFreelancer,
    tokenThresholds,
    connectWallet,
    registerWithWallet
  } = useAuth()
  const [nickname, setNickname] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('connect') // 'connect', 'tokens', 'nickname'
  const [nicknameAvailable, setNicknameAvailable] = useState(null)
  const [isCheckingNickname, setIsCheckingNickname] = useState(false)

  // Token thresholds (fallback if not from context)
  const THRESHOLDS = tokenThresholds || {
    CLIENT: 1000,
    FREELANCER: 10000,
    BOOSTED_FREELANCER: 50000
  }

  // Navigate to dashboard once authenticated and profile is loaded
  useEffect(() => {
    if (isAuthenticated && profile && profile.nickname) {
      const userType = profile.user_type
      let dashboardPath = '/dashboard/freelancer'

      if (userType === 'client') {
        dashboardPath = '/dashboard/client'
      } else if (userType === 'admin') {
        dashboardPath = '/dashboard/admin'
      }

      navigate(dashboardPath)
    }
  }, [isAuthenticated, profile, navigate])

  // Move to token check when wallet connects
  useEffect(() => {
    if (isWalletConnected && walletAddress && step === 'connect') {
      setStep('tokens')
    }
  }, [isWalletConnected, walletAddress, step])

  const handleWalletConnect = async () => {
    setError('')
    const { profile: existingProfile, error: connectError } = await connectWallet()

    if (connectError) {
      setError(connectError.message || 'Failed to connect wallet')
      return
    }

    // If profile already exists for this wallet, redirect to login
    if (existingProfile) {
      navigate('/login')
    }
    // Otherwise, useEffect will move to token check
  }

  // Determine role based on token balance
  const determinedRole = () => {
    const balance = tokenBalance || 0
    if (balance >= THRESHOLDS.FREELANCER) {
      return 'freelancer'
    } else if (balance >= THRESHOLDS.CLIENT) {
      return 'client'
    }
    return null
  }

  const checkNicknameAvailability = async (nicknameToCheck) => {
    if (!nicknameToCheck || nicknameToCheck.trim().length < 3) {
      setNicknameAvailable(null)
      return null
    }

    setIsCheckingNickname(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('check_nickname_available', {
        nickname_to_check: nicknameToCheck.trim()
      })

      if (rpcError) {
        console.error('Error checking nickname:', rpcError)
        setNicknameAvailable(null)
        return null
      }

      const isAvailable = data?.available === true
      setNicknameAvailable(isAvailable)
      return isAvailable
    } catch (err) {
      console.error('Error checking nickname availability:', err)
      setNicknameAvailable(null)
      return null
    } finally {
      setIsCheckingNickname(false)
    }
  }

  const handleNicknameChange = (e) => {
    const value = e.target.value
    setNickname(value)
    setError('')

    // Debounce nickname check
    if (value.trim().length >= 3) {
      const timeoutId = setTimeout(() => {
        checkNicknameAvailability(value)
      }, 500)
      return () => clearTimeout(timeoutId)
    } else {
      setNicknameAvailable(null)
    }
  }

  const handleContinueToNickname = () => {
    const role = determinedRole()
    if (!role) {
      setError(`You need at least ${THRESHOLDS.CLIENT.toLocaleString()} tokens to register. Get some tokens first!`)
      return
    }
    setStep('nickname')
  }

  const handleCompleteRegistration = async () => {
    const role = determinedRole()

    if (!role) {
      setError('Insufficient token balance')
      return
    }

    if (!nickname.trim()) {
      setError('Please enter a nickname')
      return
    }
    if (nickname.length < 3) {
      setError('Nickname must be at least 3 characters')
      return
    }
    if (nickname.length > 20) {
      setError('Nickname must be 20 characters or less')
      return
    }
    if (nicknameAvailable === false) {
      setError('This nickname is already taken')
      return
    }

    if (!walletAddress) {
      setError('Wallet not connected. Please reconnect.')
      setStep('connect')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Register with wallet - role is determined by token balance
      const { data, error: regError } = await registerWithWallet(
        walletAddress,
        nickname.trim(),
        role
      )

      if (regError) {
        setError(regError.message || 'Failed to complete registration')
        setIsLoading(false)
        return
      }

      // Navigate to appropriate dashboard
      navigate(role === 'client' ? '/dashboard/client' : '/dashboard/freelancer')
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message || 'An unexpected error occurred')
      setIsLoading(false)
    }
  }

  const formatTokens = (amount) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`
    }
    return amount.toString()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-grid-small-white/[0.05]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="shadow-2xl">
          <CardHeader className="text-center pb-2">
            <Link to="/" className="flex items-center justify-center gap-2 mb-4 group">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:scale-105 transition-transform">
                P
              </div>
              <span className="text-2xl font-bold tracking-tight">PumpWork</span>
            </Link>
            <CardTitle className="text-xl">Create Account</CardTitle>
            <CardDescription className="text-base">
              {step === 'connect' && 'Connect your wallet to get started'}
              {step === 'tokens' && 'Token-based access verification'}
              {step === 'nickname' && 'Set your display name'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-500 bg-red-500/10 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Step 1: Connect Wallet */}
            {step === 'connect' && (
              <div className="space-y-4">
                <div className="text-center p-6 bg-muted/30 rounded-xl border border-border/50">
                  <Wallet className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your Solana wallet. Your role is determined by your token balance.
                  </p>
                  <Button
                    className="w-full gradient-bg h-12 text-base shadow-lg shadow-primary/20"
                    onClick={handleWalletConnect}
                    disabled={isWalletConnecting}
                  >
                    {isWalletConnecting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="h-5 w-5 mr-2" />
                        Connect Wallet
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Token requirements info */}
                <div className="p-4 bg-muted/20 rounded-xl border border-border/30">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Coins className="h-4 w-4 text-primary" />
                    Token Requirements
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3 w-3 text-blue-500" />
                        <span>Client</span>
                      </div>
                      <span className="font-medium text-blue-500">{formatTokens(THRESHOLDS.CLIENT)} tokens</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-purple-500" />
                        <span>Freelancer</span>
                      </div>
                      <span className="font-medium text-purple-500">{formatTokens(THRESHOLDS.FREELANCER)} tokens</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-pink-500" />
                        <span>Boosted Freelancer</span>
                      </div>
                      <span className="font-medium text-pink-500">{formatTokens(THRESHOLDS.BOOSTED_FREELANCER)} tokens</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Token Verification */}
            {step === 'tokens' && (
              <div className="space-y-4">
                {/* Connected wallet display */}
                <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    Wallet Connected
                  </span>
                </div>

                {/* Token Balance Display */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border/50 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Your Token Balance</p>
                  <p className="text-3xl font-bold text-primary">
                    {(tokenBalance || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PUMP tokens</p>
                </div>

                {/* Access Level */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-center mb-3">Your Access Level</p>

                  {/* Client Check */}
                  <div className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    canBeClient
                      ? "bg-blue-500/10 border-blue-500/30"
                      : "bg-muted/20 border-border/30 opacity-50"
                  )}>
                    <div className="flex items-center gap-2">
                      <Briefcase className={cn("h-4 w-4", canBeClient ? "text-blue-500" : "text-muted-foreground")} />
                      <span className="font-medium">Client Access</span>
                    </div>
                    {canBeClient ? (
                      <CheckCircle2 className="h-5 w-5 text-blue-500" />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Need {formatTokens(THRESHOLDS.CLIENT)} tokens
                      </span>
                    )}
                  </div>

                  {/* Freelancer Check */}
                  <div className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    canBeFreelancer
                      ? "bg-purple-500/10 border-purple-500/30"
                      : "bg-muted/20 border-border/30 opacity-50"
                  )}>
                    <div className="flex items-center gap-2">
                      <User className={cn("h-4 w-4", canBeFreelancer ? "text-purple-500" : "text-muted-foreground")} />
                      <span className="font-medium">Freelancer Access</span>
                    </div>
                    {canBeFreelancer ? (
                      <CheckCircle2 className="h-5 w-5 text-purple-500" />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Need {formatTokens(THRESHOLDS.FREELANCER)} tokens
                      </span>
                    )}
                  </div>

                  {/* Boosted Check */}
                  <div className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    isBoostedFreelancer
                      ? "bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-pink-500/30"
                      : "bg-muted/20 border-border/30 opacity-50"
                  )}>
                    <div className="flex items-center gap-2">
                      <Zap className={cn("h-4 w-4", isBoostedFreelancer ? "text-pink-500" : "text-muted-foreground")} />
                      <span className="font-medium">Boosted Status</span>
                    </div>
                    {isBoostedFreelancer ? (
                      <CheckCircle2 className="h-5 w-5 text-pink-500" />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Need {formatTokens(THRESHOLDS.BOOSTED_FREELANCER)} tokens
                      </span>
                    )}
                  </div>
                </div>

                {/* Determined Role */}
                {determinedRole() && (
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/30 text-center">
                    <p className="text-sm">
                      You will register as:{' '}
                      <span className="font-bold text-primary capitalize">{determinedRole()}</span>
                      {isBoostedFreelancer && ' (Boosted)'}
                    </p>
                  </div>
                )}

                <Button
                  className="w-full gradient-bg h-11"
                  onClick={handleContinueToNickname}
                  disabled={!determinedRole()}
                >
                  {determinedRole() ? (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    'Insufficient Tokens'
                  )}
                </Button>
              </div>
            )}

            {/* Step 3: Nickname */}
            {step === 'nickname' && (
              <div className="space-y-4">
                {/* Role display */}
                <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  {determinedRole() === 'freelancer' ? (
                    <User className="h-4 w-4 text-primary" />
                  ) : (
                    <Briefcase className="h-4 w-4 text-primary" />
                  )}
                  <span className="text-sm font-medium text-primary capitalize">
                    {determinedRole()} Account
                    {isBoostedFreelancer && ' (Boosted)'}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Choose your nickname</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nickname (3-20 characters)"
                      className={cn(
                        "pl-10",
                        nicknameAvailable === false && "border-red-500 focus-visible:ring-red-500",
                        nicknameAvailable === true && "border-green-500 focus-visible:ring-green-500"
                      )}
                      value={nickname}
                      onChange={handleNicknameChange}
                      disabled={isLoading}
                      maxLength={20}
                    />
                    {isCheckingNickname && (
                      <div className="absolute right-3 top-3">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    )}
                    {!isCheckingNickname && nicknameAvailable === false && nickname.trim().length >= 3 && (
                      <div className="absolute right-3 top-3">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      </div>
                    )}
                    {!isCheckingNickname && nicknameAvailable === true && nickname.trim().length >= 3 && (
                      <div className="absolute right-3 top-3">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                    )}
                  </div>
                  {nicknameAvailable === false && nickname.trim().length >= 3 && (
                    <p className="text-xs text-red-500">This nickname is already taken</p>
                  )}
                  {nicknameAvailable === true && nickname.trim().length >= 3 && (
                    <p className="text-xs text-green-500">Nickname is available</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep('tokens')}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 gradient-bg"
                    onClick={handleCompleteRegistration}
                    disabled={isLoading || !nickname.trim() || nickname.length < 3 || nicknameAvailable === false}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Complete
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
