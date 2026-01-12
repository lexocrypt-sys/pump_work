import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useJobPosts() {
  const [jobs, setJobs] = useState([])
  const [isLoading, setIsLoading] = useState(false) // Start as false, only true when actively fetching
  const [error, setError] = useState(null)

  // Fetch all jobs with filters
  const fetchJobs = useCallback(async (filters = {}) => {
    console.log('[useJobPosts] fetchJobs called with filters:', filters)
    try {
      setIsLoading(true)
      setError(null)

      let query = supabase
        .from('job_posts')
        .select(`
          *,
          client:profiles!client_id(id, nickname, rating, review_count, user_type)
        `)

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      } else {
        query = query.in('status', ['open', 'in_progress'])
      }

      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      if (filters.skills && filters.skills.length > 0) {
        query = query.overlaps('skills', filters.skills)
      }

      if (filters.budgetMin !== undefined) {
        query = query.gte('budget', filters.budgetMin)
      }

      if (filters.budgetMax !== undefined) {
        query = query.lte('budget', filters.budgetMax)
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      // Sort
      const sortBy = filters.sortBy || 'created_at'
      const sortOrder = filters.sortOrder || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      console.log('[useJobPosts] Executing Supabase query...')

      // Execute query
      const { data, error: fetchError } = await query

      console.log('[useJobPosts] Query complete. Data:', data?.length, 'Error:', fetchError)

      if (fetchError) {
        throw fetchError
      }

      setJobs(data || [])
      return { data, error: null }
    } catch (err) {
      console.error('[useJobPosts] Error fetching jobs:', err)
      const errorMessage = err.message || 'Failed to fetch jobs. Please try again.'
      setError(errorMessage)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch single job by ID
  const fetchJobById = async (id) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('job_posts')
        .select(`
          *,
          client:profiles!client_id(id, nickname, rating, review_count, user_type, bio, wallet_address)
        `)
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err) {
      console.error('Error fetching job:', err)
      return { data: null, error: err }
    }
  }

  // Create new job post
  const createJob = async (jobData) => {
    try {
      const { data, error: createError } = await supabase
        .from('job_posts')
        .insert({
          ...jobData,
          status: 'open',
        })
        .select(`
          *,
          client:profiles!client_id(id, nickname, rating, review_count, user_type)
        `)
        .single()

      if (createError) throw createError

      return { data, error: null }
    } catch (err) {
      console.error('Error creating job:', err)
      return { data: null, error: err }
    }
  }

  // Update job post
  const updateJob = async (id, updates) => {
    try {
      const { data, error: updateError } = await supabase
        .from('job_posts')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          client:profiles!client_id(id, nickname, rating, review_count, user_type)
        `)
        .single()

      if (updateError) throw updateError

      return { data, error: null }
    } catch (err) {
      console.error('Error updating job:', err)
      return { data: null, error: err }
    }
  }

  // Delete job post
  const deleteJob = async (id) => {
    try {
      const { error: deleteError } = await supabase
        .from('job_posts')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      return { error: null }
    } catch (err) {
      console.error('Error deleting job:', err)
      return { error: err }
    }
  }

  // Get jobs by client ID
  const fetchClientJobs = async (clientId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('job_posts')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err) {
      console.error('Error fetching client jobs:', err)
      return { data: null, error: err }
    }
  }

  return {
    jobs,
    isLoading,
    error,
    fetchJobs,
    fetchJobById,
    createJob,
    updateJob,
    deleteJob,
    fetchClientJobs,
  }
}
