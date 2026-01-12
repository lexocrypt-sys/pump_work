import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (fetchError) throw fetchError

      setCategories(data || [])
      return { data, error: null }
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError(err.message)
      return { data: null, error: err }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories,
  }
}
