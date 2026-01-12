import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Star,
  Calendar,
  Wallet,
  MessageSquare,
  Share2,
  Clock,
  Loader2,
  AlertCircle,
  Award,
  CheckCircle2,
  Briefcase,
  Heart,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { InitialsAvatar } from '@/components/ui/InitialsAvatar'
import { ReviewCard } from '@/components/reviews/ReviewCard'
import { formatSOL, formatTimeAgo, formatDate, truncateAddress, cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useServicePosts } from '@/hooks/useServicePosts'
import { useReviews } from '@/hooks/useReviews'
import { useServiceRequests } from '@/hooks/useServiceRequests'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export default function FreelancerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile: currentUserProfile, isAuthenticated, isClient } = useAuth()
  const { fetchServiceById } = useServicePosts()
  const { fetchUserReviews } = useReviews()
  const { createServiceRequest, checkServiceRequestExists } = useServiceRequests()

  const [service, setService] = useState(null)
  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('about')
  const [hireDialogOpen, setHireDialogOpen] = useState(false)
  const [existingRequest, setExistingRequest] = useState(null)
  const [hireForm, setHireForm] = useState({
    project_description: '',
    requirements: '',
    proposed_budget: 0,
    deadline: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isOwnProfile = currentUserProfile?.id === service?.freelancer?.id

  useEffect(() => {
    loadServiceData()
  }, [id])

  const loadServiceData = async () => {
    setIsLoading(true)

    // Fetch service post (includes freelancer data)
    const { data: serviceData, error: serviceError } = await fetchServiceById(id)

    if (serviceError) {
      console.error('Error loading service:', serviceError)
      setIsLoading(false)
      return
    }

    setService(serviceData)

    // Fetch reviews for the freelancer
    if (serviceData?.freelancer_id) {
      const { data: reviewData } = await fetchUserReviews(serviceData.freelancer_id)
      setReviews(reviewData || [])
    }

    // Check if user has already sent a request for this service
    if (isAuthenticated && currentUserProfile?.id && isClient) {
      const { data: requestData } = await checkServiceRequestExists(id, currentUserProfile.id)
      setExistingRequest(requestData)
    }

    setIsLoading(false)
  }

  const handleMessage = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    navigate(`/messages?user=${service?.freelancer_id}`)
  }

  const handleHire = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (!isClient) {
      alert('Only clients can hire freelancers. Please switch to a client account.')
      return
    }

    // Initialize form with service price
    setHireForm({
      project_description: '',
      requirements: '',
      proposed_budget: service?.price || 0,
      deadline: '',
    })

    setHireDialogOpen(true)
  }

  const handleSubmitHireRequest = async () => {
    if (!hireForm.project_description.trim()) {
      alert('Please provide a project description')
      return
    }

    setIsSubmitting(true)

    try {
      const requestData = {
        service_post_id: id,
        client_id: currentUserProfile.id,
        freelancer_id: service.freelancer_id,
        project_description: hireForm.project_description.trim(),
        requirements: hireForm.requirements.trim() || null,
        proposed_budget: parseFloat(hireForm.proposed_budget),
        deadline: hireForm.deadline || null,
      }

      const { error } = await createServiceRequest(requestData)

      if (error) {
        console.error('Error creating service request:', error)
        alert(error.message || 'Failed to send hire request. Please try again.')
      } else {
        setHireDialogOpen(false)
        alert('Hire request sent successfully! The freelancer will review your request.')
        // Reload to update existing request status
        await loadServiceData()
      }
    } catch (err) {
      console.error('Error submitting hire request:', err)
      alert('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full glass-card border-red-500/20">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Service Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This service may have been removed or does not exist.
            </p>
            <Button onClick={() => navigate('/freelancers')}>Browse Freelancers</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const freelancer = service.freelancer

  return (
    <div className="min-h-screen pt-12 pb-12 relative">
      {/* Background */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-screen bg-primary/5 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 pl-0 hover:pl-2 transition-all"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Freelancers
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Service Details Card */}
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="flex justify-between items-start gap-4 mb-6">
                  <div className="flex-1">
                    <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
                      {service.title}
                    </h1>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        Posted {formatTimeAgo(service.created_at)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4" />
                        {service.delivery_time}
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {service.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-9 w-9 sm:h-10 sm:w-10"
                    >
                      <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-9 w-9 sm:h-10 sm:w-10"
                    >
                      <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </div>
                </div>

                <Separator className="bg-border/50 mb-6" />

                {/* Service Description */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">About This Service</h3>
                    <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {service.description}
                    </div>
                  </div>

                  {/* Skills */}
                  {service.skills && service.skills.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {service.skills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="px-3 py-1 text-sm">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Freelancer Profile Tabs */}
            <Card className="glass-card">
              <CardContent className="p-4 sm:p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="about" className="flex-1">About Freelancer</TabsTrigger>
                    <TabsTrigger value="reviews" className="flex-1">
                      Reviews ({reviews.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* About Tab */}
                  <TabsContent value="about" className="mt-6">
                    <div className="space-y-6">
                      {/* Bio */}
                      {freelancer?.bio && (
                        <div>
                          <h4 className="font-semibold mb-2">Bio</h4>
                          <p className="text-muted-foreground leading-relaxed">
                            {freelancer.bio}
                          </p>
                        </div>
                      )}

                      {/* Skills */}
                      {freelancer?.skills && freelancer.skills.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3">All Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {freelancer.skills.map((skill) => (
                              <Badge key={skill} variant="secondary">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Verification */}
                      <div>
                        <h4 className="font-semibold mb-3">Verification</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>Email Verified</span>
                          </div>
                          {freelancer?.wallet_address && (
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span>Wallet Connected</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Reviews Tab */}
                  <TabsContent value="reviews" className="mt-6">
                    {reviews.length > 0 ? (
                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <ReviewCard key={review.id} review={review} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Star className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No reviews yet</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Freelancer Profile Card */}
            <Card className="glass-card sticky top-24 border-primary/20">
              <CardContent className="p-6">
                {/* Profile Header */}
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    <InitialsAvatar
                      nickname={freelancer?.nickname}
                      size="xl"
                      className="ring-4 ring-primary/20 shadow-lg"
                    />
                  </div>
                  <Link
                    to={`/profile/${freelancer?.id}`}
                    className="text-xl font-bold hover:text-primary transition-colors inline-block mb-2"
                  >
                    {freelancer?.nickname}
                  </Link>
                  <Badge className="bg-primary/10 text-primary border-primary/20 mb-3">
                    Freelancer
                  </Badge>

                  {/* Rating */}
                  {freelancer?.rating > 0 && (
                    <div className="flex items-center justify-center gap-1 mb-3">
                      <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                      <span className="font-bold text-lg">{freelancer.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground text-sm">
                        ({freelancer.review_count || 0} reviews)
                      </span>
                    </div>
                  )}

                  {/* Wallet */}
                  {freelancer?.wallet_address && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Wallet className="h-4 w-4" />
                      <span className="font-mono">{truncateAddress(freelancer.wallet_address, 6)}</span>
                    </div>
                  )}
                </div>

                <Separator className="my-6" />

                {/* Pricing */}
                <div className="mb-6">
                  <div className="text-sm text-muted-foreground mb-1">
                    {service.price_type === 'fixed' ? 'Starting at' : 'Hourly Rate'}
                  </div>
                  <div className="text-4xl font-bold gradient-text">{formatSOL(service.price)}</div>
                  {service.price_type === 'fixed' && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Delivery: {service.delivery_time}
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">{freelancer?.jobs_completed || 0}</div>
                    <div className="text-xs text-muted-foreground">Jobs Done</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">{formatSOL(freelancer?.total_earned || 0)}</div>
                    <div className="text-xs text-muted-foreground">Earned</div>
                  </div>
                </div>

                {/* Member Since */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                  <Calendar className="h-4 w-4" />
                  <span>Member since {formatDate(freelancer?.created_at || service.created_at)}</span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {!isOwnProfile && (
                    <>
                      {existingRequest ? (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                          <CheckCircle2 className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                          <div className="font-semibold text-blue-500 capitalize">
                            Request {existingRequest.status}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {existingRequest.status === 'pending' && 'Waiting for freelancer response'}
                            {existingRequest.status === 'accepted' && 'Freelancer accepted your request!'}
                            {existingRequest.status === 'rejected' && 'Request was declined'}
                          </p>
                        </div>
                      ) : (
                        <Button
                          size="lg"
                          className="w-full gradient-bg font-bold shadow-lg shadow-primary/20"
                          onClick={handleHire}
                        >
                          <Briefcase className="h-4 w-4 mr-2" />
                          Hire Now
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleMessage}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {isAuthenticated ? 'Send Message' : 'Login to Message'}
                      </Button>
                    </>
                  )}
                  {isOwnProfile && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                      <Award className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <div className="font-semibold text-blue-500">Your Service</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Manage in your dashboard
                      </p>
                    </div>
                  )}
                  <Button variant="ghost" className="w-full">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Hire Request Dialog */}
        <Dialog open={hireDialogOpen} onOpenChange={setHireDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Request Service</DialogTitle>
              <DialogDescription>
                Send a hire request to {freelancer?.nickname} for "{service?.title}"
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Project Description */}
              <div className="space-y-2">
                <Label htmlFor="project_description">
                  Project Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="project_description"
                  value={hireForm.project_description}
                  onChange={(e) => setHireForm({ ...hireForm, project_description: e.target.value })}
                  placeholder="Describe your project requirements..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Additional Requirements */}
              <div className="space-y-2">
                <Label htmlFor="requirements">Additional Requirements (Optional)</Label>
                <Textarea
                  id="requirements"
                  value={hireForm.requirements}
                  onChange={(e) => setHireForm({ ...hireForm, requirements: e.target.value })}
                  placeholder="Any specific requirements or preferences..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <Label htmlFor="proposed_budget">
                  Budget (SOL) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="proposed_budget"
                  type="number"
                  step="0.01"
                  min="0"
                  value={hireForm.proposed_budget}
                  onChange={(e) => setHireForm({ ...hireForm, proposed_budget: e.target.value })}
                  placeholder="Enter your budget"
                />
                <p className="text-xs text-muted-foreground">
                  Service price: {formatSOL(service?.price || 0)}
                </p>
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline (Optional)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={hireForm.deadline}
                  onChange={(e) => setHireForm({ ...hireForm, deadline: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-muted-foreground">
                  Expected delivery: {service?.delivery_time}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setHireDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitHireRequest}
                disabled={isSubmitting || !hireForm.project_description.trim()}
                className="gradient-bg"
              >
                {isSubmitting ? 'Sending...' : 'Send Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
