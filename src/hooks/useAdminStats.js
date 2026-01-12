import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useAdminStats() {
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch comprehensive platform statistics
  const fetchPlatformStats = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch all stats in parallel
      const [
        usersResult,
        jobsResult,
        servicesResult,
        applicationsResult,
        contractsResult,
        messagesResult,
        reviewsResult,
      ] = await Promise.all([
        // Total users by type
        supabase.from('profiles').select('user_type', { count: 'exact' }),
        // Job posts by status
        supabase.from('job_posts').select('status', { count: 'exact' }),
        // Service posts
        supabase.from('service_posts').select('status', { count: 'exact' }),
        // Applications
        supabase.from('job_applications').select('status', { count: 'exact' }),
        // Contracts
        supabase.from('contracts').select('status', { count: 'exact' }),
        // Messages
        supabase.from('messages').select('id', { count: 'exact', head: true }),
        // Reviews
        supabase.from('reviews').select('rating', { count: 'exact' }),
      ])

      // Count users by type
      const usersByType = usersResult.data?.reduce((acc, user) => {
        acc[user.user_type] = (acc[user.user_type] || 0) + 1
        return acc
      }, {})

      // Count jobs by status
      const jobsByStatus = jobsResult.data?.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1
        return acc
      }, {})

      // Count services by status
      const servicesByStatus = servicesResult.data?.reduce((acc, service) => {
        acc[service.status] = (acc[service.status] || 0) + 1
        return acc
      }, {})

      // Count applications by status
      const applicationsByStatus = applicationsResult.data?.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1
        return acc
      }, {})

      // Count contracts by status
      const contractsByStatus = contractsResult.data?.reduce((acc, contract) => {
        acc[contract.status] = (acc[contract.status] || 0) + 1
        return acc
      }, {})

      const platformStats = {
        users: {
          total: usersResult.count || 0,
          clients: usersByType?.client || 0,
          freelancers: usersByType?.freelancer || 0,
          admins: usersByType?.admin || 0,
        },
        jobs: {
          total: jobsResult.count || 0,
          open: jobsByStatus?.open || 0,
          in_progress: jobsByStatus?.in_progress || 0,
          completed: jobsByStatus?.completed || 0,
          cancelled: jobsByStatus?.cancelled || 0,
        },
        services: {
          total: servicesResult.count || 0,
          active: servicesByStatus?.active || 0,
          paused: servicesByStatus?.paused || 0,
        },
        applications: {
          total: applicationsResult.count || 0,
          pending: applicationsByStatus?.pending || 0,
          accepted: applicationsByStatus?.accepted || 0,
          rejected: applicationsByStatus?.rejected || 0,
        },
        contracts: {
          total: contractsResult.count || 0,
          active: contractsByStatus?.active || 0,
          completed: contractsByStatus?.completed || 0,
          cancelled: contractsByStatus?.cancelled || 0,
        },
        messages: {
          total: messagesResult.count || 0,
        },
        reviews: {
          total: reviewsResult.count || 0,
          averageRating: reviewsResult.data?.length > 0
            ? (reviewsResult.data.reduce((sum, r) => sum + r.rating, 0) / reviewsResult.data.length).toFixed(2)
            : 0,
        },
      }

      setStats(platformStats)
      return { data: platformStats, error: null }
    } catch (err) {
      console.error('Error fetching platform stats:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch recent activity
  const fetchRecentActivity = async (limit = 10) => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch recent users
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id, nickname, user_type, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)

      // Fetch recent jobs
      const { data: recentJobs } = await supabase
        .from('job_posts')
        .select(`
          id,
          title,
          status,
          created_at,
          client:client_id (nickname)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      // Fetch recent contracts
      const { data: recentContracts } = await supabase
        .from('contracts')
        .select(`
          id,
          title,
          status,
          created_at,
          client:client_id (nickname),
          freelancer:freelancer_id (nickname)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      return {
        data: {
          recentUsers: recentUsers || [],
          recentJobs: recentJobs || [],
          recentContracts: recentContracts || [],
        },
        error: null,
      }
    } catch (err) {
      console.error('Error fetching recent activity:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch all users (for admin user management)
  const fetchAllUsers = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err) {
      console.error('Error fetching all users:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    stats,
    isLoading,
    error,
    fetchPlatformStats,
    fetchRecentActivity,
    fetchAllUsers,
  }
}
