import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useServicePosts() {
  const [services, setServices] = useState([])
  const [isLoading, setIsLoading] = useState(false) // Start as false, only true when actively fetching
  const [error, setError] = useState(null)

  // Fetch all service posts with filters
  const fetchServices = useCallback(async (filters = {}) => {
    try {
      setIsLoading(true)
      setError(null)

      let query = supabase
        .from('service_posts')
        .select(`
          *,
          freelancer:profiles!freelancer_id(id, nickname, rating, review_count, user_type, skills, bio)
        `)

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      } else {
        query = query.eq('status', 'active')
      }

      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      if (filters.skills && filters.skills.length > 0) {
        query = query.overlaps('skills', filters.skills)
      }

      if (filters.priceMin !== undefined) {
        query = query.gte('price', filters.priceMin)
      }

      if (filters.priceMax !== undefined) {
        query = query.lte('price', filters.priceMax)
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      // Sort
      const sortBy = filters.sortBy || 'created_at'
      const sortOrder = filters.sortOrder || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      // Execute query
      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      setServices(data || [])
      return { data, error: null }
    } catch (err) {
      console.error('Error fetching services:', err)
      const errorMessage = err.message || 'Failed to fetch services. Please try again.'
      setError(errorMessage)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch single service by ID
  const fetchServiceById = async (id) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('service_posts')
        .select(`
          *,
          freelancer:profiles!freelancer_id(id, nickname, rating, review_count, user_type, skills, bio, wallet_address, jobs_completed, total_earned)
        `)
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err) {
      console.error('Error fetching service:', err)
      return { data: null, error: err }
    }
  }

  // Create new service post
  const createService = async (serviceData) => {
    try {
      const { data, error: createError } = await supabase
        .from('service_posts')
        .insert({
          ...serviceData,
          status: 'active',
        })
        .select(`
          *,
          freelancer:profiles!freelancer_id(id, nickname, rating, review_count, user_type)
        `)
        .single()

      if (createError) throw createError

      return { data, error: null }
    } catch (err) {
      console.error('Error creating service:', err)
      return { data: null, error: err }
    }
  }

  // Update service post
  const updateService = async (id, updates) => {
    try {
      const { data, error: updateError } = await supabase
        .from('service_posts')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          freelancer:profiles!freelancer_id(id, nickname, rating, review_count, user_type)
        `)
        .single()

      if (updateError) throw updateError

      return { data, error: null }
    } catch (err) {
      console.error('Error updating service:', err)
      return { data: null, error: err }
    }
  }

  // Delete service post (soft delete by changing status)
  const deleteService = async (id) => {
    try {
      const { error: deleteError } = await supabase
        .from('service_posts')
        .update({ status: 'deleted' })
        .eq('id', id)

      if (deleteError) throw deleteError

      return { error: null }
    } catch (err) {
      console.error('Error deleting service:', err)
      return { error: err }
    }
  }

  // Get services by freelancer ID
  const fetchFreelancerServices = async (freelancerId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('service_posts')
        .select('*')
        .eq('freelancer_id', freelancerId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err) {
      console.error('Error fetching freelancer services:', err)
      return { data: null, error: err }
    }
  }

  return {
    services,
    isLoading,
    error,
    fetchServices,
    fetchServiceById,
    createService,
    updateService,
    deleteService,
    fetchFreelancerServices,
  }
}
