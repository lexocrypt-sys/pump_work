import { useState } from 'react'
import { Star, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RatingStars } from './RatingStars'
import { useReviews } from '@/hooks/useReviews'

export function ReviewDialog({ contract, reviewerId, revieweeId, isOpen, onClose, onSuccess }) {
  const { createReview } = useReviews()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    setIsSubmitting(true)
    setError('')

    const reviewData = {
      contract_id: contract.id,
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      rating,
      comment: comment.trim() || null,
    }

    const { data, error: reviewError } = await createReview(reviewData)

    setIsSubmitting(false)

    if (reviewError) {
      setError(reviewError.message || 'Failed to submit review')
      return
    }

    // Reset form
    setRating(0)
    setComment('')
    onSuccess?.()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Leave a Review</DialogTitle>
          <DialogDescription>
            Rate your experience with {contract.freelancer?.nickname || 'this freelancer'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Info */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">Project</div>
            <div className="font-semibold">{contract.title}</div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Rating *</label>
            <div className="flex items-center gap-3">
              <RatingStars rating={rating} onRatingChange={setRating} size="lg" />
              {rating > 0 && (
                <span className="text-sm font-medium text-muted-foreground">
                  {rating} / 5
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Review (Optional)</label>
            <Textarea
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground">
              {comment.length} / 500 characters
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-500 bg-red-500/10 rounded-lg border border-red-500/20">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="gradient-bg"
          >
            {isSubmitting ? (
              'Submitting...'
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit Review
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
