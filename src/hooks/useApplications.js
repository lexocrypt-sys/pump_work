import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useApplications() {
  const [applications, setApplications] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch applications for a specific job post
  const fetchJobApplications = async (jobPostId) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('job_applications')
        .select(`
          *,
          freelancer:freelancer_id (
            id,
            nickname,
            rating,
            review_count,
            skills,
            bio,
            jobs_completed
          ),
          job_post:job_post_id (
            id,
            title,
            budget,
            budget_type
          )
        `)
        .eq('job_post_id', jobPostId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setApplications(data || [])
      return { data, error: null }
    } catch (err) {
      console.error('Error fetching job applications:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch applications by freelancer
  const fetchFreelancerApplications = async (freelancerId) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('job_applications')
        .select(`
          *,
          job_post:job_post_id (
            id,
            title,
            description,
            budget,
            budget_type,
            category,
            status,
            client:client_id (
              id,
              nickname,
              rating,
              review_count
            )
          )
        `)
        .eq('freelancer_id', freelancerId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setApplications(data || [])
      return { data, error: null }
    } catch (err) {
      console.error('Error fetching freelancer applications:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Create new application
  const createApplication = async (applicationData) => {
    setIsLoading(true)
    setError(null)

    try {
      // First check if application already exists
      const { data: existing } = await supabase
        .from('job_applications')
        .select('id')
        .eq('job_post_id', applicationData.job_post_id)
        .eq('freelancer_id', applicationData.freelancer_id)
        .single()

      if (existing) {
        throw new Error('You have already applied to this job')
      }

      const { data, error: createError } = await supabase
        .from('job_applications')
        .insert([applicationData])
        .select()
        .single()

      if (createError) throw createError

      return { data, error: null }
    } catch (err) {
      console.error('Error creating application:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Update application status (accept/reject)
  const updateApplicationStatus = async (applicationId, status) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: updateError } = await supabase
        .from('job_applications')
        .update({ status })
        .eq('id', applicationId)
        .select()
        .single()

      if (updateError) throw updateError

      return { data, error: null }
    } catch (err) {
      console.error('Error updating application:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Withdraw application
  const withdrawApplication = async (applicationId) => {
    return updateApplicationStatus(applicationId, 'withdrawn')
  }

  // Accept application
  const acceptApplication = async (applicationId) => {
    return updateApplicationStatus(applicationId, 'accepted')
  }

  // Reject application
  const rejectApplication = async (applicationId) => {
    return updateApplicationStatus(applicationId, 'rejected')
  }

  // Get single application
  const fetchApplicationById = async (applicationId) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('job_applications')
        .select(`
          *,
          freelancer:freelancer_id (
            id,
            nickname,
            rating,
            review_count,
            skills,
            bio,
            jobs_completed
          ),
          job_post:job_post_id (
            id,
            title,
            budget,
            budget_type,
            client:client_id (
              id,
              nickname
            )
          )
        `)
        .eq('id', applicationId)
        .single()

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err) {
      console.error('Error fetching application:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Check if user has applied to a job
  const checkApplicationExists = async (jobPostId, freelancerId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('job_applications')
        .select('id, status')
        .eq('job_post_id', jobPostId)
        .eq('freelancer_id', freelancerId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

      return { data, error: null }
    } catch (err) {
      console.error('Error checking application:', err)
      return { data: null, error: err }
    }
  }

  return {
    applications,
    isLoading,
    error,
    fetchJobApplications,
    fetchFreelancerApplications,
    createApplication,
    updateApplicationStatus,
    withdrawApplication,
    acceptApplication,
    rejectApplication,
    fetchApplicationById,
    checkApplicationExists,
  }
}
