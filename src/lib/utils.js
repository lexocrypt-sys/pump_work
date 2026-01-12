import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatSOL(amount) {
  return `${amount.toLocaleString()} SOL`
}

export function truncateAddress(address, chars = 4) {
  if (!address) return ''
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

export function formatDate(date) {
  if (!date) return 'N/A'
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'N/A'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(d)
}

export function formatTimeAgo(date) {
  if (!date) return 'N/A'
  const now = new Date()
  const past = new Date(date)
  if (isNaN(past.getTime())) return 'N/A'
  const diffInSeconds = Math.floor((now - past) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return formatDate(date)
}

export function getStatusColor(status) {
  const colors = {
    // Job statuses
    open: 'bg-green-500/10 text-green-500 border-green-500/20',
    'in-progress': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    'in_progress': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',

    // Application statuses
    pending: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    accepted: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
    withdrawn: 'bg-gray-500/10 text-gray-500 border-gray-500/20',

    // Contract statuses
    active: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    submitted: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    disputed: 'bg-red-500/10 text-red-500 border-red-500/20',
  }
  return colors[status] || colors.pending
}

export function getRoleBadgeColor(role) {
  const colors = {
    user: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    freelancer: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    client: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    dev: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none',
  }
  return colors[role] || colors.user
}
