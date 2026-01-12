import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, 
  Loader2, 
  MessageSquare, 
  ArrowLeft, 
  AlertCircle,
  Search,
  MoreVertical,
  CheckCheck,
  ChevronDown,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InitialsAvatar } from '@/components/ui/InitialsAvatar'
import { useAuth } from '@/context/AuthContext'
import { useChat } from '@/hooks/useChat'
import { formatTimeAgo, cn } from '@/lib/utils'

// Date separator component
function DateSeparator({ date }) {
  const formatDate = (dateStr) => {
    const msgDate = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (msgDate.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (msgDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return msgDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'short', 
        day: 'numeric',
        year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-muted/80 backdrop-blur-sm text-muted-foreground text-xs px-3 py-1 rounded-full">
        {formatDate(date)}
      </div>
    </div>
  )
}

// Skeleton loader for conversations
function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-24" />
        <div className="h-3 bg-muted rounded w-32" />
      </div>
    </div>
  )
}

// Skeleton loader for messages
function MessageSkeleton({ isOwn }) {
  return (
    <div className={cn("flex gap-2 animate-pulse", isOwn && "flex-row-reverse")}>
      <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
      <div className={cn("flex flex-col gap-1", isOwn && "items-end")}>
        <div className={cn(
          "h-10 rounded-2xl bg-muted",
          isOwn ? "w-32" : "w-48"
        )} />
        <div className="h-3 bg-muted rounded w-12" />
      </div>
    </div>
  )
}

// New message toast notification
function NewMessageToast({ message, onView, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full mx-4"
    >
      <Card 
        className="p-4 shadow-lg cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onView}
      >
        <div className="flex items-center gap-3">
          <InitialsAvatar nickname={message.sender?.nickname} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{message.sender?.nickname}</p>
            <p className="text-sm text-muted-foreground truncate">{message.content}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

// Message bubble with improved design
function MessageBubble({ message, isOwn, profile, showTimestamp, onRetry }) {
  const [showTime, setShowTime] = useState(false)
  const isPending = message._isPending
  const isFailed = message._failed

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ 
        opacity: isPending ? 0.7 : 1, 
        y: 0, 
        scale: 1 
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-2 group", isOwn && "flex-row-reverse")}
      onMouseEnter={() => setShowTime(true)}
      onMouseLeave={() => setShowTime(false)}
    >
      {/* Avatar - only show for first message in group */}
      <div className="w-8 shrink-0">
        {showTimestamp && (
          <InitialsAvatar
            nickname={isOwn ? profile.nickname : message.sender?.nickname}
            size="xs"
            className="mt-1"
          />
        )}
      </div>

      <div className={cn("flex flex-col max-w-[75%] sm:max-w-[65%]", isOwn && "items-end")}>
        {/* Message bubble */}
        <div
          className={cn(
            "relative rounded-2xl px-4 py-2 break-words",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md",
            isFailed && "bg-destructive/20 border border-destructive cursor-pointer hover:bg-destructive/30",
            "transition-colors"
          )}
          onClick={isFailed ? () => onRetry(message) : undefined}
          role={isFailed ? "button" : undefined}
          tabIndex={isFailed ? 0 : undefined}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          
          {/* Read status for own messages */}
          {isOwn && !isFailed && !isPending && (
            <span className="absolute -bottom-0.5 -right-0.5 text-primary-foreground/70">
              <CheckCheck className="h-3.5 w-3.5" />
            </span>
          )}
        </div>

        {/* Timestamp and status */}
        <AnimatePresence>
          {(showTimestamp || showTime || isPending || isFailed) && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-1 mt-1 px-1"
            >
              {isFailed && (
                <AlertCircle className="h-3 w-3 text-destructive" />
              )}
              {isPending && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
              <span className={cn(
                "text-xs",
                isFailed ? "text-destructive" : "text-muted-foreground"
              )}>
                {isFailed 
                  ? 'Failed • Tap to retry' 
                  : isPending 
                    ? 'Sending...' 
                    : formatTimeAgo(message.created_at)
                }
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// Conversation list item with preview
function ConversationItem({ conversation, isSelected, otherParticipant, onClick, unreadCount = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-4 cursor-pointer transition-all duration-200",
        "hover:bg-muted/50 active:bg-muted/70",
        isSelected && "bg-primary/10 hover:bg-primary/10 border-l-2 border-primary"
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <InitialsAvatar nickname={otherParticipant?.nickname} size="md" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "font-medium truncate",
            unreadCount > 0 && "font-semibold"
          )}>
            {otherParticipant?.nickname || 'Unknown User'}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {conversation.last_message_at ? formatTimeAgo(conversation.last_message_at) : ''}
          </span>
        </div>
        
        {/* Last message preview */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn(
            "text-sm truncate",
            unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
          )}>
            {conversation.last_message_preview || 'Start a conversation'}
          </p>
          
          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="shrink-0 min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Auto-growing textarea
function AutoGrowTextarea({ value, onChange, onKeyDown, disabled, maxLength, inputRef }) {
  const textareaRef = useRef(null)
  
  // Combine refs
  useEffect(() => {
    if (inputRef) {
      inputRef.current = textareaRef.current
    }
  }, [inputRef])

  // Auto-grow
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [value])

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder="Type a message..."
      disabled={disabled}
      maxLength={maxLength}
      rows={1}
      className={cn(
        "flex-1 resize-none bg-transparent border-0 focus:ring-0 focus:outline-none",
        "text-sm placeholder:text-muted-foreground",
        "min-h-[40px] max-h-[120px] py-2.5 px-0",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      aria-label="Message input"
    />
  )
}

export default function Messages() {
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile } = useAuth()
  
  const {
    conversations,
    isLoadingConversations,
    isLoadingMessages,
    fetchConversations,
    getOrCreateConversation,
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    subscribeToMessages,
  } = useChat()

  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messageInput, setMessageInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [localMessages, setLocalMessages] = useState([])
  const [sendError, setSendError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [newMessageToast, setNewMessageToast] = useState(null)
  
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)
  const processedUserParamRef = useRef(null)
  const subscriptionRef = useRef(null)
  const initialLoadDoneRef = useRef(false)
  const messageIdsRef = useRef(new Set())

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    
    const query = searchQuery.toLowerCase()
    return conversations.filter(conv => {
      const other = conv.participant_1_id === profile?.id 
        ? conv.participant_2 
        : conv.participant_1
      return other?.nickname?.toLowerCase().includes(query)
    })
  }, [conversations, searchQuery, profile?.id])

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups = []
    let currentDate = null

    localMessages.forEach((message, index) => {
      const messageDate = new Date(message.created_at).toDateString()
      
      if (messageDate !== currentDate) {
        groups.push({ type: 'date', date: message.created_at, id: `date-${messageDate}` })
        currentDate = messageDate
      }

      // Check if we should show timestamp (first message or 5+ min gap)
      const prevMessage = localMessages[index - 1]
      const showTimestamp = !prevMessage || 
        new Date(message.created_at) - new Date(prevMessage.created_at) > 5 * 60 * 1000 ||
        prevMessage.sender_id !== message.sender_id

      groups.push({ type: 'message', message, showTimestamp })
    })

    return groups
  }, [localMessages])

  // Memoize the other participant
  const otherParticipant = useMemo(() => {
    if (!selectedConversation || !profile) return null
    return selectedConversation.participant_1_id === profile.id
      ? selectedConversation.participant_2
      : selectedConversation.participant_1
  }, [selectedConversation, profile])

  // Get other participant for conversations list
  const getOtherParticipant = useCallback((conversation) => {
    if (!conversation || !profile) return null
    return conversation.participant_1_id === profile.id
      ? conversation.participant_2
      : conversation.participant_1
  }, [profile])

  // Scroll handlers
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    requestAnimationFrame(() => {
      const container = messagesContainerRef.current
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: behavior
        })
      }
    })
  }, [])

  const handleScroll = useCallback((e) => {
    const container = e.target
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    setShowScrollButton(!isNearBottom)
  }, [])

  // Initial load
  useEffect(() => {
    if (profile?.id && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true
      fetchConversations(profile.id)
    }
  }, [profile?.id, fetchConversations])

  // Handle user query parameter
  useEffect(() => {
    const userId = searchParams.get('user')
    
    if (!userId || !profile?.id || userId === profile.id) return
    if (isLoadingConversations && conversations.length === 0) return
    if (processedUserParamRef.current === userId) return

    const handleUserParam = async () => {
      processedUserParamRef.current = userId

      const existingConv = conversations.find(
        (conv) =>
          (conv.participant_1_id === profile.id && conv.participant_2_id === userId) ||
          (conv.participant_1_id === userId && conv.participant_2_id === profile.id)
      )

      if (existingConv) {
        setSelectedConversation(existingConv)
        navigate(`/messages/${existingConv.id}`, { replace: true })
        setSearchParams({}, { replace: true })
        return
      }

      const { data: conv, error } = await getOrCreateConversation(profile.id, userId)
      if (!error && conv) {
        setSelectedConversation(conv)
        navigate(`/messages/${conv.id}`, { replace: true })
        setSearchParams({}, { replace: true })
        fetchConversations(profile.id, true)
      }
    }

    handleUserParam()
  }, [searchParams, profile?.id, isLoadingConversations, conversations, getOrCreateConversation, navigate, setSearchParams, fetchConversations])

  // Reset processed user param
  useEffect(() => {
    if (!searchParams.get('user')) {
      processedUserParamRef.current = null
    }
  }, [searchParams])

  // Handle conversation selection from URL
  useEffect(() => {
    if (!conversationId) {
      setSelectedConversation(null)
      return
    }

    if (conversations.length === 0) return

    const conv = conversations.find(c => c.id === conversationId)
    if (conv) {
      setSelectedConversation(conv)
    }
  }, [conversationId, conversations])

  // Handle message loading and subscription
  useEffect(() => {
    if (!selectedConversation?.id || !profile?.id) {
      setLocalMessages([])
      messageIdsRef.current.clear()
      return
    }

    if (subscriptionRef.current) {
      subscriptionRef.current()
      subscriptionRef.current = null
    }

    setLocalMessages([])
    messageIdsRef.current.clear()

    const loadMessages = async () => {
      const { data } = await fetchMessages(selectedConversation.id)
      if (data) {
        setLocalMessages(data)
        data.forEach(m => messageIdsRef.current.add(m.id))
        scrollToBottom('auto')
      }
    }

    loadMessages()
    markMessagesAsRead(selectedConversation.id, profile.id)

    subscriptionRef.current = subscribeToMessages(
      selectedConversation.id,
      (newMessage) => {
        if (messageIdsRef.current.has(newMessage.id)) return
        if (newMessage.sender_id === profile.id) return

        messageIdsRef.current.add(newMessage.id)
        setLocalMessages(prev => [...prev, newMessage])
        markMessagesAsRead(selectedConversation.id, profile.id)
        
        // Show toast if scrolled up
        const container = messagesContainerRef.current
        if (container) {
          const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
          if (!isNearBottom) {
            setNewMessageToast(newMessage)
          } else {
            scrollToBottom()
          }
        }
      }
    )

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current()
        subscriptionRef.current = null
      }
    }
  }, [selectedConversation?.id, profile?.id, fetchMessages, markMessagesAsRead, subscribeToMessages, scrollToBottom])

  // Handlers
  const handleSelectConversation = useCallback((conv) => {
    if (selectedConversation?.id === conv.id) return
    setSelectedConversation(conv)
    navigate(`/messages/${conv.id}`)
  }, [selectedConversation?.id, navigate])

  const handleBack = useCallback(() => {
    setSelectedConversation(null)
    navigate('/messages')
  }, [navigate])

  const handleSendMessage = useCallback(async (e) => {
    e?.preventDefault()
    setSendError(null)

    const trimmedMessage = messageInput.trim()
    if (!trimmedMessage || !selectedConversation || isSending || !profile?.id) {
      return
    }

    setIsSending(true)
    const tempId = `temp-${Date.now()}-${Math.random()}`
    
    const optimisticMessage = {
      id: tempId,
      conversation_id: selectedConversation.id,
      sender_id: profile.id,
      content: trimmedMessage,
      created_at: new Date().toISOString(),
      is_read: false,
      sender: { id: profile.id, nickname: profile.nickname },
      _isPending: true,
    }
    
    messageIdsRef.current.add(tempId)
    setLocalMessages(prev => [...prev, optimisticMessage])
    setMessageInput('')
    scrollToBottom()
    inputRef.current?.focus()

    const { data, error } = await sendMessage(
      selectedConversation.id,
      profile.id,
      trimmedMessage
    )

    if (!error && data) {
      messageIdsRef.current.delete(tempId)
      messageIdsRef.current.add(data.id)
      setLocalMessages(prev => 
        prev.map(m => m.id === tempId ? { ...data, _isPending: false } : m)
      )
    } else {
      setLocalMessages(prev => 
        prev.map(m => m.id === tempId ? { ...m, _isPending: false, _failed: true } : m)
      )
      setSendError('Failed to send message')
    }

    setIsSending(false)
  }, [messageInput, selectedConversation, isSending, profile, sendMessage, scrollToBottom])

  const handleRetryMessage = useCallback((failedMessage) => {
    messageIdsRef.current.delete(failedMessage.id)
    setLocalMessages(prev => prev.filter(m => m.id !== failedMessage.id))
    setMessageInput(failedMessage.content)
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback((e) => {
    // Send on Enter (without shift) or Cmd/Ctrl + Enter
    if ((e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }, [handleSendMessage])

  const handleRefresh = useCallback(() => {
    if (profile?.id) {
      fetchConversations(profile.id, true)
    }
  }, [profile?.id, fetchConversations])

  // Loading state
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-12 pb-4">
      {/* New message toast */}
      <AnimatePresence>
        {newMessageToast && (
          <NewMessageToast
            message={newMessageToast}
            onView={() => {
              scrollToBottom()
              setNewMessageToast(null)
            }}
            onDismiss={() => setNewMessageToast(null)}
          />
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 h-[calc(100vh-8rem)]">
        <div className="flex gap-4 h-full">
          {/* Conversations List */}
          <motion.div
            initial={false}
            animate={{ 
              x: selectedConversation ? -20 : 0,
              opacity: selectedConversation ? 0.95 : 1 
            }}
            className={cn(
              "w-full md:w-80 lg:w-96 shrink-0",
              selectedConversation && "hidden md:block"
            )}
          >
            <Card className="glass-card h-full overflow-hidden flex flex-col">
              {/* Header with search */}
              <div className="p-4 border-b space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Messages</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isLoadingConversations}
                    className="h-8 w-8"
                  >
                    <RefreshCw className={cn(
                      "h-4 w-4",
                      isLoadingConversations && "animate-spin"
                    )} />
                  </Button>
                </div>
                
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="pl-9 bg-muted/50"
                  />
                </div>
              </div>

              {/* Conversations list */}
              <div className="flex-1 overflow-y-auto">
                {isLoadingConversations && conversations.length === 0 ? (
                  <div className="divide-y">
                    {[...Array(5)].map((_, i) => (
                      <ConversationSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                    {searchQuery ? (
                      <>
                        <Search className="h-12 w-12 mb-4 opacity-50" />
                        <p className="font-medium mb-1">No results found</p>
                        <p className="text-sm">Try a different search term</p>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
                        <p className="font-medium mb-2">No conversations yet</p>
                        <p className="text-sm mb-4">Start chatting with clients or freelancers</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate('/jobs')}
                        >
                          Browse Jobs
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredConversations.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isSelected={selectedConversation?.id === conv.id}
                        otherParticipant={getOtherParticipant(conv)}
                        onClick={() => handleSelectConversation(conv)}
                        unreadCount={conv.unread_count || 0}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Chat Window */}
          <motion.div
            initial={false}
            animate={{ 
              x: selectedConversation ? 0 : 20,
              scale: selectedConversation ? 1 : 0.98
            }}
            className={cn(
              "flex-1 min-w-0",
              !selectedConversation && "hidden md:block"
            )}
          >
            <Card className="glass-card h-full overflow-hidden flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b flex items-center gap-3 shrink-0 bg-background/50 backdrop-blur-sm">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden shrink-0 -ml-2"
                      onClick={handleBack}
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    
                    <div className="relative">
                      <InitialsAvatar nickname={otherParticipant?.nickname} size="md" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">
                        {otherParticipant?.nickname || 'Unknown User'}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {otherParticipant?.rating > 0 && (
                          <>
                            <span className="text-yellow-500">★</span>
                            <span>{otherParticipant.rating.toFixed(1)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Messages */}
                  <div 
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 space-y-2"
                  >
                    {isLoadingMessages && localMessages.length === 0 ? (
                      <div className="space-y-4 py-4">
                        <MessageSkeleton isOwn={false} />
                        <MessageSkeleton isOwn={true} />
                        <MessageSkeleton isOwn={false} />
                        <MessageSkeleton isOwn={true} />
                      </div>
                    ) : localMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                            <MessageSquare className="h-10 w-10 text-primary" />
                          </div>
                          <p className="font-medium mb-1">Start the conversation</p>
                          <p className="text-sm">Say hello to {otherParticipant?.nickname}!</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {groupedMessages.map((item, index) => {
                          if (item.type === 'date') {
                            return <DateSeparator key={item.id} date={item.date} />
                          }
                          
                          return (
                            <MessageBubble
                              key={item.message.id}
                              message={item.message}
                              isOwn={item.message.sender_id === profile.id}
                              profile={profile}
                              showTimestamp={item.showTimestamp}
                              onRetry={handleRetryMessage}
                            />
                          )
                        })}
                      </>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Scroll to bottom button */}
                  <AnimatePresence>
                    {showScrollButton && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute bottom-24 right-8"
                      >
                        <Button
                          size="icon"
                          variant="secondary"
                          className="rounded-full shadow-lg"
                          onClick={() => scrollToBottom()}
                        >
                          <ChevronDown className="h-5 w-5" />
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error Banner */}
                  <AnimatePresence>
                    {sendError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 py-2 bg-destructive/10 text-destructive text-sm text-center flex items-center justify-center gap-2"
                      >
                        <AlertCircle className="h-4 w-4" />
                        {sendError}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs"
                          onClick={() => setSendError(null)}
                        >
                          Dismiss
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Input Area */}
                  <div className="p-4 border-t shrink-0 bg-background/50 backdrop-blur-sm">
                    <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                      {/* Attachment button */}

                      {/* Input container */}
                      <div className="flex-1 flex items-end gap-2 bg-muted/50 rounded-2xl px-4 border focus-within:border-primary transition-colors">
                        <AutoGrowTextarea
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          disabled={isSending}
                          maxLength={2000}
                          inputRef={inputRef}
                        />
                        
                      </div>

                      {/* Send button */}
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!messageInput.trim() || isSending}
                        className={cn(
                          "shrink-0 rounded-full h-10 w-10 transition-all",
                          messageInput.trim() 
                            ? "gradient-bg scale-100" 
                            : "bg-muted text-muted-foreground scale-95"
                        )}
                        aria-label="Send message"
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </form>
                    
                    {/* Character count - only show when nearing limit */}
                    <AnimatePresence>
                      {messageInput.length > 1800 && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className={cn(
                            "text-xs mt-2 text-right",
                            messageInput.length > 1950 ? "text-destructive" : "text-muted-foreground"
                          )}
                        >
                          {messageInput.length}/2000
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                /* Empty state */
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center max-w-sm">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <MessageSquare className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Your Messages</h3>
                    <p className="text-sm mb-6">
                      Select a conversation from the list to start messaging, or find someone new to chat with.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" onClick={() => navigate('/jobs')}>
                        Browse Jobs
                      </Button>
                      <Button variant="outline" onClick={() => navigate('/freelancers')}>
                        Find Freelancers
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}