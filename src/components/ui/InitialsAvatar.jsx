import { cn } from '@/lib/utils'

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-20 h-20 text-2xl',
}

const colorClasses = [
  'bg-purple-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-teal-500',
]

export function InitialsAvatar({ nickname, size = 'md', className }) {
  const initials = nickname?.slice(0, 2).toUpperCase() || '??'
  const colorIndex = nickname ? nickname.charCodeAt(0) % colorClasses.length : 0

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-semibold select-none',
        sizeClasses[size],
        colorClasses[colorIndex],
        className
      )}
    >
      {initials}
    </div>
  )
}

export default InitialsAvatar
