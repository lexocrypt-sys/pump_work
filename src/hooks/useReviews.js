import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useReviews() {
  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch reviews for a user (reviewee)
  const fetchUserReviews = async (userId) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:reviewer_id (
            id,
            nickname,
            rating,
            user_type
          ),
          contract:contract_id (
            id,
            title,
            agreed_amount
          )
        `)
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setReviews(data || [])
      return { data, error: null }
    } catch (err) {
      console.error('Error fetching reviews:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Create a review
  const createReview = async (reviewData) => {
    setIsLoading(true)
    setError(null)

    try {
      // Check if review already exists for this contract
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('contract_id', reviewData.contract_id)
        .eq('reviewer_id', reviewData.reviewer_id)
        .single()

      if (existing) {
        throw new Error('You have already reviewed this contract')
      }

      const { data, error: createError } = await supabase
        .from('reviews')
        .insert([reviewData])
        .select(`
          *,
          reviewer:reviewer_id (
            id,
            nickname,
            rating
          ),
          contract:contract_id (
            id,
            title
          )
        `)
        .single()

      if (createError) throw createError

      return { data, error: null }
    } catch (err) {
      console.error('Error creating review:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Check if user has reviewed a contract
  const checkReviewExists = async (contractId, reviewerId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at')
        .eq('contract_id', contractId)
        .eq('reviewer_id', reviewerId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

      return { data, error: null }
    } catch (err) {
      console.error('Error checking review:', err)
      return { data: null, error: err }
    }
  }

  // Get review by contract and reviewer
  const fetchReviewByContract = async (contractId, reviewerId) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:reviewer_id (
            id,
            nickname
          ),
          reviewee:reviewee_id (
            id,
            nickname
          )
        `)
        .eq('contract_id', contractId)
        .eq('reviewer_id', reviewerId)
        .single()

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err) {
      console.error('Error fetching review:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Get reviews written by a user (as reviewer)
  const fetchReviewsByReviewer = async (reviewerId) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewee:reviewee_id (
            id,
            nickname,
            rating
          ),
          contract:contract_id (
            id,
            title
          )
        `)
        .eq('reviewer_id', reviewerId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setReviews(data || [])
      return { data, error: null }
    } catch (err) {
      console.error('Error fetching reviews by reviewer:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    reviews,
    isLoading,
    error,
    fetchUserReviews,
    createReview,
    checkReviewExists,
    fetchReviewByContract,
    fetchReviewsByReviewer,
  }
}
