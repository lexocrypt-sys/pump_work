import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

/**
 * ProtectedRoute - Wrapper component for routes that require authentication
 * 
 * Features:
 * - Shows loading spinner while auth state is initializing
 * - Redirects to /login if not authenticated
 * - Preserves the intended destination URL for post-login redirect
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // Show loading state while auth is initializing
  // This prevents flash of login page on refresh
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Redirect to login if not authenticated
  // Store the attempted URL for redirect after login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // User is authenticated, render the protected content
  return children
}
