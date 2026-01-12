import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useProfiles() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch profile by ID
  const fetchProfile = async (userId) => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError(err.message)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch multiple profiles (for listing freelancers, etc.)
  const fetchProfiles = async (filters = {}) => {
    try {
      setIsLoading(true)
      setError(null)

      let query = supabase.from('profiles').select('*')

      if (filters.user_type) {
        query = query.eq('user_type', filters.user_type)
      }

      if (filters.skills && filters.skills.length > 0) {
        query = query.overlaps('skills', filters.skills)
      }

      if (filters.minRating) {
        query = query.gte('rating', filters.minRating)
      }

      // Sort
      const sortBy = filters.sortBy || 'created_at'
      const sortOrder = filters.sortOrder || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err) {
      console.error('Error fetching profiles:', err)
      setError(err.message)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Update profile
  const updateProfile = async (userId, updates) => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (updateError) throw updateError

      return { data, error: null }
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err.message)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Get profile stats
  const fetchProfileStats = async (userId) => {
    try {
      // Fetch jobs posted (if client)
      const { count: jobsPosted } = await supabase
        .from('job_posts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', userId)

      // Fetch contracts (as client or freelancer)
      const { count: contractsAsClient } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', userId)

      const { count: contractsAsFreelancer } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('freelancer_id', userId)

      // Fetch completed jobs
      const { count: completedJobs } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('freelancer_id', userId)
        .eq('status', 'completed')

      return {
        data: {
          jobsPosted: jobsPosted || 0,
          contractsAsClient: contractsAsClient || 0,
          contractsAsFreelancer: contractsAsFreelancer || 0,
          completedJobs: completedJobs || 0,
        },
        error: null,
      }
    } catch (err) {
      console.error('Error fetching profile stats:', err)
      return { data: null, error: err }
    }
  }

  return {
    isLoading,
    error,
    fetchProfile,
    fetchProfiles,
    updateProfile,
    fetchProfileStats,
  }
}
