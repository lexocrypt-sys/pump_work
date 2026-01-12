import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
}

// Custom fetch with timeout to prevent hanging requests
const fetchWithTimeout = (url, options = {}) => {
  const timeout = 15000 // 15 second timeout

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    console.error('Supabase request timeout after 15s, aborting:', url)
    controller.abort()
  }, timeout)

  // Merge abort signals if one already exists
  const existingSignal = options.signal
  if (existingSignal) {
    existingSignal.addEventListener('abort', () => controller.abort())
  }

  // Preserve existing headers - DON'T override Accept header
  // Supabase client sets appropriate Accept headers for different operations:
  // - .single() uses 'application/vnd.pgrst.object+json'
  // - Regular queries use 'application/json'
  // Overriding causes 406 errors on .single() calls
  const existingHeaders = options.headers
  const headers = existingHeaders instanceof Headers
    ? new Headers(existingHeaders)
    : new Headers(existingHeaders || {})

  // Only set Content-Type for requests with body (if not present)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(url, {
    ...options,
    headers: headers,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeoutId)
  })
}

// Supabase config with proper session handling and fetch timeout
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'pumpwork-auth',
  },
  global: {
    fetch: fetchWithTimeout,
  },
})
