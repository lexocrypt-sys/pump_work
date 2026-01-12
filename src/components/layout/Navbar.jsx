import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, X, Sun, Moon, Wallet, ChevronDown, User,
  LayoutDashboard, LogOut, MessageSquare, Loader2, RefreshCw, Power
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InitialsAvatar } from '@/components/ui/InitialsAvatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { cn, truncateAddress } from '@/lib/utils'

const baseNavLinks = [
  { name: 'Find Jobs', href: '/jobs' },
  { name: 'Hire Freelancers', href: '/freelancers' },
]

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const {
    user,
    profile,
    isLoading,
    isAuthenticated,
    isClient,
    isFreelancer,
    isAdmin,
    isWalletConnected,
    isWalletConnecting,
    walletAddress,
    signOut,
    connectWallet,
    disconnectWallet,
    forceRefreshAuth
  } = useAuth()

  const [isRefreshing, setIsRefreshing] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const getDashboardLink = () => {
    if (isAdmin) return '/dashboard/admin'
    if (isClient) return '/dashboard/client'
    return '/dashboard/freelancer'
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }


  // Get nickname with priority: profile > user metadata > fallback
  // Use user metadata as fallback while profile is loading to prevent showing 'User' during refresh
  const nickname = profile?.nickname
    || user?.user_metadata?.nickname
    || 'User'

  // Dynamic nav links based on user type
  const getNavLinks = () => {
    const links = [...baseNavLinks]
    if (isAuthenticated) {
      if (isClient) {
        links.push({ name: 'Post a Job', href: '/post-job' })
      } else if (isFreelancer) {
        links.push({ name: 'Post Service', href: '/post-service' })
      }
    }
    return links
  }

  const navLinks = getNavLinks()

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300 border-b",
        scrolled
          ? "bg-background/80 backdrop-blur-lg border-border shadow-sm"
          : "bg-background/0 border-transparent"
      )}
    >
      <nav className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
            <span className="text-lg font-bold">P</span>
          </div>
          <span className="text-xl font-bold tracking-tight">PumpWork</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-colors hover:bg-muted/50 hover:text-primary",
                location.pathname === link.href ? "text-primary bg-primary/5" : "text-muted-foreground"
              )}
            >
              {link.name}
            </Link>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full transition-colors hover:bg-muted/50 hover:text-primary",
              location.pathname === '/token' ? "text-primary bg-primary/5" : "text-muted-foreground"
            )}
            onClick={() => navigate('/token')}
          >
            Token
          </Button>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Refresh button - shown when authenticated */}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="hidden sm:flex rounded-full text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* Wallet Connection */}
          {isWalletConnected ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:flex gap-2 rounded-full border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all font-mono"
                >
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-medium">{truncateAddress(walletAddress)}</span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Connected Wallet
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Role Display */}
                <DropdownMenuItem className="gap-2 cursor-default focus:bg-transparent">
                  <div className="flex items-center gap-2 w-full">
                    <User className="h-4 w-4" />
                    <span>Role:</span>
                    <span className={cn(
                      "ml-auto capitalize font-medium",
                      profile?.user_type === 'freelancer' && "text-purple-500",
                      profile?.user_type === 'client' && "text-blue-500",
                      profile?.user_type === 'admin' && "text-red-500"
                    )}>
                      {profile?.user_type || 'none'}
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Copy Address */}
                <DropdownMenuItem
                  onClick={() => {
                    if (walletAddress) {
                      navigator.clipboard.writeText(walletAddress)
                    }
                  }}
                  className="cursor-pointer gap-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Address
                </DropdownMenuItem>
                {/* Disconnect */}
                <DropdownMenuItem onClick={disconnectWallet} className="cursor-pointer text-destructive focus:text-destructive gap-2">
                  <LogOut className="h-4 w-4" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={connectWallet}
              disabled={isWalletConnecting}
              className="hidden sm:flex gap-2 rounded-full hover:bg-primary hover:text-white transition-all group"
            >
              {isWalletConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Connect Wallet</span>
                </>
              )}
            </Button>
          )}

          {/* User Auth State */}
          {isAuthenticated ? (
            <>
              {/* Messages button */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/messages')}
              >
                <MessageSquare className="h-5 w-5" />
              </Button>

              {/* Mobile: Avatar only */}
              <div className="sm:hidden">
                <InitialsAvatar nickname={nickname} size="sm" />
              </div>

              {/* Desktop: Full dropdown menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden sm:flex relative h-auto w-auto gap-2 pl-2 pr-3 rounded-full">
                    <InitialsAvatar nickname={nickname} size="sm" />
                    <span className="text-sm font-medium">{nickname}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-card">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="font-medium leading-none">{nickname}</p>
                      <p className="text-xs leading-none text-muted-foreground capitalize">{profile?.user_type}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(getDashboardLink())}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/profile/${profile?.id}`)}>
                    <User className="mr-2 h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/messages')}>
                    <MessageSquare className="mr-2 h-4 w-4" /> Messages
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" className="rounded-full" onClick={() => navigate('/login')}>
                Log in
              </Button>
              <Button className="rounded-full gradient-bg shadow-md hover:shadow-lg transition-all" onClick={() => navigate('/register')}>
                Sign up
              </Button>
            </div>
          )}

          {/* Mobile Menu Trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-full"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b bg-background/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="container px-4 py-6 space-y-6">
              <div className="flex flex-col space-y-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center text-lg font-medium text-foreground/80 hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                ))}
                <button
                  onClick={() => { navigate('/token'); setMobileMenuOpen(false); }}
                  className="flex items-center text-lg font-medium text-foreground/80 hover:text-primary transition-colors text-left"
                >
                  Token
                </button>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Theme</span>
                  <Button variant="outline" size="icon" className="rounded-full" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {!isAuthenticated && (
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="w-full rounded-full" onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}>
                    Log in
                  </Button>
                  <Button className="w-full rounded-full gradient-bg" onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}>
                    Sign up
                  </Button>
                </div>
              )}

              {isAuthenticated && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center gap-3 px-2">
                    <InitialsAvatar nickname={nickname} size="md" />
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">{nickname}</p>
                      <p className="text-xs text-muted-foreground capitalize">{profile?.user_type}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="w-full rounded-full" onClick={() => { navigate(getDashboardLink()); setMobileMenuOpen(false); }}>
                      <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                    </Button>
                    <Button variant="outline" className="w-full rounded-full" onClick={() => { navigate(`/profile/${profile?.id}`); setMobileMenuOpen(false); }}>
                      <User className="mr-2 h-4 w-4" /> Profile
                    </Button>
                  </div>
                  <Button variant="outline" className="w-full rounded-full" onClick={() => { navigate('/messages'); setMobileMenuOpen(false); }}>
                    <MessageSquare className="mr-2 h-4 w-4" /> Messages
                  </Button>
                  <Button variant="destructive" className="w-full rounded-full" onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </Button>
                </div>
              )}

              <div className="pt-2 space-y-2">
                {isWalletConnected ? (
                  <>
                    <div className="flex items-center justify-center gap-2 py-2 px-3 bg-muted/50 rounded-full">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm font-medium">{truncateAddress(walletAddress)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="rounded-full" onClick={connectWallet}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Change
                      </Button>
                      <Button variant="outline" className="rounded-full text-destructive hover:text-destructive" onClick={disconnectWallet}>
                        <Power className="mr-2 h-4 w-4" /> Disconnect
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full rounded-full justify-center"
                    onClick={connectWallet}
                    disabled={isWalletConnecting}
                  >
                    {isWalletConnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
