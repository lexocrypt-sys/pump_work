import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export function useChat() {
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [error, setError] = useState(null)
  
  // Cache to reduce redundant API calls
  const conversationsCacheRef = useRef(new Map())
  const lastFetchRef = useRef({ userId: null, timestamp: 0 })

  // Fetch all conversations for a user with caching
  const fetchConversations = useCallback(async (userId, forceRefresh = false) => {
    // Skip if recently fetched (within 5 seconds) unless forced
    const now = Date.now()
    if (
      !forceRefresh &&
      lastFetchRef.current.userId === userId &&
      now - lastFetchRef.current.timestamp < 5000
    ) {
      return { data: conversations, error: null }
    }

    setIsLoadingConversations(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('conversations')
        .select(`
          *,
          participant_1:participant_1_id (
            id,
            nickname,
            rating
          ),
          participant_2:participant_2_id (
            id,
            nickname,
            rating
          )
        `)
        .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (fetchError) throw fetchError

      const convs = data || []
      setConversations(convs)
      
      // Update cache
      convs.forEach(conv => {
        conversationsCacheRef.current.set(conv.id, conv)
      })
      
      lastFetchRef.current = { userId, timestamp: now }

      return { data: convs, error: null }
    } catch (err) {
      console.error('Error fetching conversations:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoadingConversations(false)
    }
  }, [conversations])

  // Get or create conversation between two users
  const getOrCreateConversation = useCallback(async (userId1, userId2) => {
    setError(null)

    try {
      // Ensure participant_1_id < participant_2_id for unique constraint
      const [participant1, participant2] = userId1 < userId2 
        ? [userId1, userId2] 
        : [userId2, userId1]

      // Check cache first (avoid DB call)
      const cachedConv = Array.from(conversationsCacheRef.current.values()).find(
        conv => conv.participant_1_id === participant1 && conv.participant_2_id === participant2
      )
      
      if (cachedConv) {
        return { data: cachedConv, error: null }
      }

      // Check database using maybeSingle() to avoid error on no results
      const { data: existing, error: fetchError } = await supabase
        .from('conversations')
        .select(`
          *,
          participant_1:participant_1_id (
            id,
            nickname,
            rating
          ),
          participant_2:participant_2_id (
            id,
            nickname,
            rating
          )
        `)
        .eq('participant_1_id', participant1)
        .eq('participant_2_id', participant2)
        .maybeSingle()

      if (fetchError) throw fetchError

      if (existing) {
        conversationsCacheRef.current.set(existing.id, existing)
        return { data: existing, error: null }
      }

      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert([{
          participant_1_id: participant1,
          participant_2_id: participant2,
        }])
        .select(`
          *,
          participant_1:participant_1_id (
            id,
            nickname,
            rating
          ),
          participant_2:participant_2_id (
            id,
            nickname,
            rating
          )
        `)
        .single()

      if (createError) throw createError

      conversationsCacheRef.current.set(newConv.id, newConv)
      
      // Add to conversations list
      setConversations(prev => [newConv, ...prev])

      return { data: newConv, error: null }
    } catch (err) {
      console.error('Error getting/creating conversation:', err)
      setError(err)
      return { data: null, error: err }
    }
  }, [])

  // Fetch messages for a conversation with pagination support
  const fetchMessages = useCallback(async (conversationId, { limit = 100, before = null } = {}) => {
    setIsLoadingMessages(true)
    setError(null)

    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            id,
            nickname
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (before) {
        query = query.lt('created_at', before)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setMessages(data || [])
      return { data, error: null }
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError(err)
      return { data: null, error: err }
    } finally {
      setIsLoadingMessages(false)
    }
  }, [])

  // Send a message
  const sendMessage = useCallback(async (conversationId, senderId, content) => {
    setError(null)

    try {
      const trimmedContent = content.trim()
      if (!trimmedContent) {
        throw new Error('Message content cannot be empty')
      }

      const { data, error: sendError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: senderId,
          content: trimmedContent,
        }])
        .select(`
          *,
          sender:sender_id (
            id,
            nickname
          )
        `)
        .single()

      if (sendError) throw sendError

      // Update conversation's last_message_at (fire and forget - non-blocking)
      supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)
        .then()
        .catch(console.error)

      // Update local conversations list order
      setConversations(prev => {
        const updated = prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, last_message_at: new Date().toISOString() }
            : conv
        )
        return updated.sort((a, b) => 
          new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
        )
      })

      return { data, error: null }
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err)
      return { data: null, error: err }
    }
  }, [])

  // Mark messages as read (fire and forget - non-blocking)
  const markMessagesAsRead = useCallback((conversationId, userId) => {
    supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false)
      .then()
      .catch(console.error)
  }, [])

  // Subscribe to new messages in a conversation
  const subscribeToMessages = useCallback((conversationId, callback) => {
    const channelName = `messages:${conversationId}:${Date.now()}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch the full message with sender info
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:sender_id (
                id,
                nickname
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            callback(data)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Get unread message count with caching
  const getUnreadCount = useCallback(async (userId) => {
    try {
      // Use a single optimized query with join
      const { count, error: countError } = await supabase
        .from('messages')
        .select('*, conversations!inner(*)', { count: 'exact', head: true })
        .or(
          `conversations.participant_1_id.eq.${userId},conversations.participant_2_id.eq.${userId}`
        )
        .neq('sender_id', userId)
        .eq('is_read', false)

      if (countError) throw countError

      return { data: count || 0, error: null }
    } catch (err) {
      // Fallback to original method if the join query fails
      try {
        const { data: convs } = await supabase
          .from('conversations')
          .select('id')
          .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)

        if (!convs || convs.length === 0) {
          return { data: 0, error: null }
        }

        const conversationIds = convs.map(c => c.id)

        const { count, error: countError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', conversationIds)
          .neq('sender_id', userId)
          .eq('is_read', false)

        if (countError) throw countError

        return { data: count || 0, error: null }
      } catch (fallbackErr) {
        console.error('Error getting unread count:', fallbackErr)
        return { data: 0, error: fallbackErr }
      }
    }
  }, [])

  // Subscribe to conversation updates (new messages, etc.)
  const subscribeToConversations = useCallback((userId, callback) => {
    const channelName = `conversations:${userId}:${Date.now()}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          if (
            payload.new.participant_1_id === userId ||
            payload.new.participant_2_id === userId
          ) {
            callback(payload)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Clear messages when switching conversations
  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  // Add message locally (for optimistic updates)
  const addMessageLocally = useCallback((message) => {
    setMessages(prev => [...prev, message])
  }, [])

  // Update message locally (for replacing optimistic message with real one)
  const updateMessageLocally = useCallback((tempId, realMessage) => {
    setMessages(prev => prev.map(m => m.id === tempId ? realMessage : m))
  }, [])

  // Remove message locally (for failed sends)
  const removeMessageLocally = useCallback((messageId) => {
    setMessages(prev => prev.filter(m => m.id !== messageId))
  }, [])

  return {
    conversations,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isLoading: isLoadingConversations || isLoadingMessages, // Backward compatibility
    error,
    fetchConversations,
    getOrCreateConversation,
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    subscribeToMessages,
    subscribeToConversations,
    getUnreadCount,
    clearMessages,
    addMessageLocally,
    updateMessageLocally,
    removeMessageLocally,
  }
}