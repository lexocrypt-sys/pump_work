import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useContracts() {
  const [contracts, setContracts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch contracts for a client
  const fetchClientContracts = async (clientId, status = null) => {
    setIsLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('contracts')
        .select(`
          *,
          client:client_id (
            id,
            nickname,
            rating
          ),
          freelancer:freelancer_id (
            id,
            nickname,
            rating,
            review_count
          ),
          job_post:job_post_id (
            id,
            title,
            category
          ),
          service_post:service_post_id (
            id,
            title,
            category
          )
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setContracts(data || [])
      return { data, error: null }
    } catch (err) {
      console.error('Error fetching client contracts:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch contracts for a freelancer
  const fetchFreelancerContracts = async (freelancerId, status = null) => {
    setIsLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('contracts')
        .select(`
          *,
          client:client_id (
            id,
            nickname,
            rating,
            review_count
          ),
          freelancer:freelancer_id (
            id,
            nickname,
            rating
          ),
          job_post:job_post_id (
            id,
            title,
            category
          ),
          service_post:service_post_id (
            id,
            title,
            category
          )
        `)
        .eq('freelancer_id', freelancerId)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setContracts(data || [])
      return { data, error: null }
    } catch (err) {
      console.error('Error fetching freelancer contracts:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Create new contract (when accepting an application)
  const createContract = async (contractData) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: createError } = await supabase
        .from('contracts')
        .insert([contractData])
        .select(`
          *,
          client:client_id (
            id,
            nickname,
            rating
          ),
          freelancer:freelancer_id (
            id,
            nickname,
            rating,
            review_count
          ),
          job_post:job_post_id (
            id,
            title,
            category
          ),
          service_post:service_post_id (
            id,
            title,
            category
          )
        `)
        .single()

      if (createError) throw createError

      return { data, error: null }
    } catch (err) {
      console.error('Error creating contract:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Update contract status
  const updateContractStatus = async (contractId, status) => {
    setIsLoading(true)
    setError(null)

    try {
      const updates = { status }

      if (status === 'completed') {
        updates.completed_at = new Date().toISOString()
      }

      const { data, error: updateError } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', contractId)
        .select()
        .single()

      if (updateError) throw updateError

      return { data, error: null }
    } catch (err) {
      console.error('Error updating contract:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Complete contract
  const completeContract = async (contractId) => {
    return updateContractStatus(contractId, 'completed')
  }

  // Cancel contract
  const cancelContract = async (contractId) => {
    return updateContractStatus(contractId, 'cancelled')
  }

  // Submit work (freelancer action)
  const submitWork = async (contractId, notes = null) => {
    setIsLoading(true)
    setError(null)

    try {
      const updates = {
        status: 'submitted',
        submitted_at: new Date().toISOString()
      }

      if (notes) {
        updates.description = notes
      }

      const { data, error: updateError } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', contractId)
        .select()
        .single()

      if (updateError) throw updateError

      return { data, error: null }
    } catch (err) {
      console.error('Error submitting work:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Approve submitted work (client action)
  const approveWork = async (contractId) => {
    setIsLoading(true)
    setError(null)

    try {
      const updates = {
        status: 'completed',
        completed_at: new Date().toISOString()
      }

      const { data, error: updateError } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', contractId)
        .select()
        .single()

      if (updateError) throw updateError

      return { data, error: null }
    } catch (err) {
      console.error('Error approving work:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Request revisions (client action)
  const requestRevisions = async (contractId, revisionNotes) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: currentContract } = await supabase
        .from('contracts')
        .select('revision_count')
        .eq('id', contractId)
        .single()

      const updates = {
        status: 'active',
        revision_notes: revisionNotes,
        revision_count: (currentContract?.revision_count || 0) + 1
      }

      const { data, error: updateError } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', contractId)
        .select()
        .single()

      if (updateError) throw updateError

      return { data, error: null }
    } catch (err) {
      console.error('Error requesting revisions:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Get single contract
  const fetchContractById = async (contractId) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('contracts')
        .select(`
          *,
          client:client_id (
            id,
            nickname,
            rating,
            review_count
          ),
          freelancer:freelancer_id (
            id,
            nickname,
            rating,
            review_count,
            skills
          ),
          job_post:job_post_id (
            id,
            title,
            description,
            category,
            budget,
            budget_type
          ),
          service_post:service_post_id (
            id,
            title,
            description,
            category,
            price,
            price_type
          )
        `)
        .eq('id', contractId)
        .single()

      if (fetchError) throw fetchError

      return { data, error: null }
    } catch (err) {
      console.error('Error fetching contract:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  // Update escrow amount
  const updateEscrowAmount = async (contractId, amount) => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: updateError } = await supabase
        .from('contracts')
        .update({ escrow_amount: amount })
        .eq('id', contractId)
        .select()
        .single()

      if (updateError) throw updateError

      return { data, error: null }
    } catch (err) {
      console.error('Error updating escrow:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    contracts,
    isLoading,
    error,
    fetchClientContracts,
    fetchFreelancerContracts,
    createContract,
    updateContractStatus,
    completeContract,
    cancelContract,
    fetchContractById,
    updateEscrowAmount,
    submitWork,
    approveWork,
    requestRevisions,
  }
}
