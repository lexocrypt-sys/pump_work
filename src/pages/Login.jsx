import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Wallet, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'

/**
 * Login Page - Wallet-Only Authentication
 * 
 * Current implementation: Simple wallet lookup (profile by wallet_address)
 * 
 * TODO: For full SIWS (Sign In With Solana) implementation:
 * 1. Connect wallet
 * 2. Request nonce from Supabase Edge Function
 * 3. Sign message with wallet
 * 4. Send signature to Edge Function for verification
 * 5. Edge Function returns JWT for authenticated session
 */
export default function Login() {
  const navigate = useNavigate()
  const {
    profile,
    isAuthenticated,
    isWalletConnecting,
    signInWithWallet
  } = useAuth()
  const [error, setError] = useState('')

  // Navigate to dashboard once authenticated and profile is loaded
  useEffect(() => {
    if (isAuthenticated && profile) {
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

  // Also check for wallet-based profile (soft login)
  useEffect(() => {
    if (!isAuthenticated && profile && profile.wallet_address) {
      // User has a wallet-based profile, navigate to dashboard
      const userType = profile.user_type
      let dashboardPath = '/dashboard/freelancer'

      if (userType === 'client') {
        dashboardPath = '/dashboard/client'
      }

      navigate(dashboardPath)
    }
  }, [isAuthenticated, profile, navigate])

  const handleWalletSignIn = async () => {
    setError('')

    const { data, error: signInError } = await signInWithWallet()

    if (signInError) {
      setError(signInError.message || 'Failed to sign in with wallet')
      return
    }

    if (data?.isNewUser) {
      // No account for this wallet, redirect to register
      navigate('/register')
    }
    // If successful and not new user, useEffect will handle navigation
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Mesh */}
      <div className="absolute inset-0 bg-grid-small-white/[0.05]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
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
            <CardTitle className="text-xl">Welcome Back</CardTitle>
            <CardDescription className="text-base">
              Connect your Solana wallet to enter
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-500 bg-red-500/10 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Wallet Connection - Primary Action */}
            <div className="space-y-4">
              <div className="text-center p-6 bg-muted/30 rounded-xl border border-border/50">
                <Wallet className="h-12 w-12 mx-auto mb-4 text-primary" />
                <p className="text-sm text-muted-foreground mb-4">
                  Sign in securely using your Solana wallet. No passwords needed.
                </p>
                <Button
                  className="w-full gradient-bg h-12 text-base shadow-lg shadow-primary/20"
                  onClick={handleWalletSignIn}
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

              <div className="text-center text-xs text-muted-foreground">
                <p>Supported wallets: Phantom, Solflare, and more</p>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              New here?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Create account
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
