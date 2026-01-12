import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { InitialsAvatar } from '@/components/ui/InitialsAvatar'
import { formatTimeAgo } from '@/lib/utils'
import { Link } from 'react-router-dom'

export function ReviewCard({ review }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4 sm:p-6">
        <div className="flex gap-3 sm:gap-4">
          <InitialsAvatar nickname={review.reviewer?.nickname} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <Link
                  to={`/profile/${review.reviewer?.id}`}
                  className="font-semibold hover:text-primary transition-colors"
                >
                  {review.reviewer?.nickname}
                </Link>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatTimeAgo(review.created_at)}
                </div>
              </div>
              <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-full shrink-0">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span className="font-bold text-sm">{review.rating}</span>
              </div>
            </div>

            {review.comment && (
              <p className="text-sm text-foreground/80 leading-relaxed mt-2">
                {review.comment}
              </p>
            )}

            {review.contract && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-muted-foreground">
                  Project: <span className="font-medium text-foreground">{review.contract.title}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
