import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useServiceRequests() {
  const [serviceRequests, setServiceRequests] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch service requests for a specific service post
  const fetchServiceRequests = async (servicePostId) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('service_requests')
        .select(`
          *,
          client:client_id (
            id,
            nickname,
            rating,
            review_count,
            total_spent,
            jobs_posted
          ),
          service_post:service_post_id (
            id,
            title,
            price,
            price_type,
            delivery_time
          )
        `)
        .eq('service_post_id', servicePostId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setServiceRequests(data || [])
      return { data, error: null }
    } catch (err) {
      console.error('Error fetching service requests:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch service requests received by freelancer (for their services)
  const fetchFreelancerServiceRequests = async (freelancerId) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('service_requests')
        .select(`
          *,
          client:client_id (
            id,
            nickname,
            rating,
            review_count,
            total_spent,
            jobs_posted
          ),
          service_post:service_post_id (
            id,
            title,
            price,
            price_type,
            delivery_time,
            category
          )
        `)
        .eq('freelancer_id', freelancerId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setServiceRequests(data || [])
      return { data, error: null }
    } catch (err) {
      console.error('Error fetching freelancer service requests:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch service requests sent by client
  const fetchClientServiceRequests = async (clientId) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('service_requests')
        .select(`
          *,
          freelancer:freelancer_id (
            id,
            nickname,
            rating,
            review_count,
            skills,
            jobs_completed
          ),
          service_post:service_post_id (
            id,
            title,
            price,
            price_type,
            delivery_time,
            category
          )
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setServiceRequests(data || [])
      return { data, error: null }
    } catch (err) {
      console.error('Error fetching client service requests:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Create new service request (client hiring a freelancer)
  const createServiceRequest = async (requestData) => {
    setIsLoading(true)
    setError(null)

    try {
      // First check if request already exists
      const { data: existing } = await supabase
        .from('service_requests')
        .select('id')
        .eq('service_post_id', requestData.service_post_id)
        .eq('client_id', requestData.client_id)
        .single()

      if (existing) {
        throw new Error('You have already sent a request for this service')
      }

      const { data, error: createError } = await supabase
        .from('service_requests')
        .insert([requestData])
        .select()
        .single()

      if (createError) throw createError

      return { data, error: null }
    } catch (err) {
      console.error('Error creating service request:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Update service request status
  const updateServiceRequestStatus = async (requestId, status) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: updateError } = await supabase
        .from('service_requests')
        .update({ status })
        .eq('id', requestId)
        .select()
        .single()

      if (updateError) throw updateError

      return { data, error: null }
    } catch (err) {
      console.error('Error updating service request:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Accept service request (freelancer accepts)
  const acceptServiceRequest = async (requestId) => {
    return updateServiceRequestStatus(requestId, 'accepted')
  }

  // Reject service request (freelancer rejects)
  const rejectServiceRequest = async (requestId) => {
    return updateServiceRequestStatus(requestId, 'rejected')
  }

  // Withdraw service request (client withdraws)
  const withdrawServiceRequest = async (requestId) => {
    return updateServiceRequestStatus(requestId, 'withdrawn')
  }

  // Get single service request
  const fetchServiceRequestById = async (requestId) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('service_requests')
        .select(`
          *,
          client:client_id (
            id,
            nickname,
            rating,
            review_count,
            total_spent
          ),
          freelancer:freelancer_id (
            id,
            nickname,
            rating,
            review_count
          ),
          service_post:service_post_id (
            id,
            title,
            price,
            price_type,
            delivery_time
          )
        `)
        .eq('id', requestId)
        .single()

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err) {
      console.error('Error fetching service request:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Check if client has already requested a service
  const checkServiceRequestExists = async (servicePostId, clientId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('service_requests')
        .select('id, status')
        .eq('service_post_id', servicePostId)
        .eq('client_id', clientId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

      return { data, error: null }
    } catch (err) {
      console.error('Error checking service request:', err)
      return { data: null, error: err }
    }
  }

  return {
    serviceRequests,
    isLoading,
    error,
    fetchServiceRequests,
    fetchFreelancerServiceRequests,
    fetchClientServiceRequests,
    createServiceRequest,
    updateServiceRequestStatus,
    acceptServiceRequest,
    rejectServiceRequest,
    withdrawServiceRequest,
    fetchServiceRequestById,
    checkServiceRequestExists,
  }
}
