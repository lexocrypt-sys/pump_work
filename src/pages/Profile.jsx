import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Star,
  Calendar,
  Wallet,
  ExternalLink,
  CheckCircle2,
  Award,
  Briefcase,
  MessageSquare,
  Share2,
  Clock,
  Loader2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { InitialsAvatar } from '@/components/ui/InitialsAvatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatSOL, formatDate, truncateAddress, getRoleBadgeColor, cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useProfiles } from '@/hooks/useProfiles'
import { useJobPosts } from '@/hooks/useJobPosts'
import { useReviews } from '@/hooks/useReviews'

export default function Profile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile: currentUserProfile, isAuthenticated, updateProfile: updateAuthProfile } = useAuth()
  const { fetchProfile, fetchProfileStats, updateProfile } = useProfiles()
  const { fetchClientJobs, fetchJobs } = useJobPosts()
  const { fetchUserReviews } = useReviews()

  const [activeTab, setActiveTab] = useState('about')
  const [profileData, setProfileData] = useState(null)
  const [profileStats, setProfileStats] = useState(null)
  const [userJobs, setUserJobs] = useState([])
  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    nickname: '',
    bio: '',
    skills: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const isOwnProfile = currentUserProfile?.id === id

  // Handle message button click
  const handleMessage = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    // Navigate to messages page - conversation will be created/found there
    navigate(`/messages?user=${id}`)
  }

  useEffect(() => {
    if (id) {
      loadProfileData()
    }
  }, [id])

  const loadProfileData = async () => {
    setIsLoading(true)

    // Fetch profile
    const { data: profile } = await fetchProfile(id)
    setProfileData(profile)

    if (profile) {
      // Fetch profile stats
      const { data: stats } = await fetchProfileStats(id)
      setProfileStats(stats)

      // Fetch user's jobs
      if (profile.user_type === 'client') {
        const { data: jobs } = await fetchClientJobs(id)
        setUserJobs(jobs || [])
      } else {
        // For freelancers, fetch completed contracts/jobs
        const { data: jobs } = await fetchJobs({ status: 'completed' })
        // Filter jobs where freelancer was involved (simplified for now)
        setUserJobs(jobs?.slice(0, 5) || [])
      }

      // Fetch reviews
      const { data: reviewData } = await fetchUserReviews(id)
      setReviews(reviewData || [])
    }

    setIsLoading(false)
  }

  const handleEditProfile = () => {
    setEditForm({
      nickname: profileData?.nickname || '',
      bio: profileData?.bio || '',
      skills: profileData?.skills?.join(', ') || '',
    })
    setEditDialogOpen(true)
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)

    const updates = {
      nickname: editForm.nickname,
      bio: editForm.bio,
      skills: editForm.skills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0),
    }

    const { data, error } = await updateProfile(id, updates)

    if (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile. Please try again.')
    } else {
      // Update local state
      setProfileData(data)
      // Update auth context if it's the current user's profile
      if (updateAuthProfile && currentUserProfile?.id === id) {
        updateAuthProfile(updates)
      }
      setEditDialogOpen(false)
    }

    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground">The profile you're looking for doesn't exist.</p>
          <Button asChild className="mt-4">
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 pt-12 pb-12">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    <InitialsAvatar
                      nickname={profileData.nickname}
                      size="xl"
                      className="ring-4 ring-background shadow-lg"
                    />
                  </div>
                  <h1 className="text-2xl font-bold mb-1">{profileData.nickname}</h1>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Badge className={getRoleBadgeColor(profileData.user_type)}>
                      {profileData.user_type?.charAt(0).toUpperCase() + profileData.user_type?.slice(1)}
                    </Badge>
                    {profileData.rating > 0 && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span className="font-medium">{profileData.rating?.toFixed(2)}</span>
                        <span className="text-muted-foreground">({profileData.review_count || 0})</span>
                      </div>
                    )}
                  </div>
                  {profileData.wallet_address && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Wallet className="h-4 w-4" />
                      <span className="font-mono">{truncateAddress(profileData.wallet_address, 6)}</span>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {profileData.user_type === 'freelancer' ? (
                    <>
                      <div className="text-center">
                        <div className="text-xl font-bold">{profileData.jobs_completed || 0}</div>
                        <div className="text-xs text-muted-foreground">Jobs Done</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">{profileData.total_earned || 0}</div>
                        <div className="text-xs text-muted-foreground">SOL Earned</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">{profileData.review_count || 0}</div>
                        <div className="text-xs text-muted-foreground">Reviews</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center">
                        <div className="text-xl font-bold">{profileData.jobs_posted || 0}</div>
                        <div className="text-xs text-muted-foreground">Jobs Posted</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">{profileData.total_spent || 0}</div>
                        <div className="text-xs text-muted-foreground">SOL Spent</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">{profileData.review_count || 0}</div>
                        <div className="text-xs text-muted-foreground">Reviews</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Member Since */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Calendar className="h-4 w-4" />
                  <span>Member since {formatDate(profileData.created_at)}</span>
                </div>

                {/* Token Balance (if own profile or admin) */}
                {(isOwnProfile || profileData.user_type === 'admin') && profileData.token_balance > 0 && (
                  <div className="p-4 bg-primary/5 rounded-lg mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium">PUMP Tokens</span>
                      </div>
                      <span className="font-bold">{Number(profileData.token_balance).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  {!isOwnProfile && (
                    <>
                      <Button variant="gradient" className="w-full" onClick={handleMessage}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                      {profileData.user_type === 'freelancer' && (
                        <Button variant="outline" className="w-full">
                          <Briefcase className="h-4 w-4 mr-2" />
                          Invite to Job
                        </Button>
                      )}
                    </>
                  )}
                  {isOwnProfile && (
                    <Button variant="outline" className="w-full" onClick={handleEditProfile}>
                      Edit Profile
                    </Button>
                  )}
                  <Button variant="ghost" className="w-full">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="about">About</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  <TabsTrigger value="jobs">
                    {profileData.user_type === 'client' ? 'Posted Jobs' : 'Completed Jobs'}
                  </TabsTrigger>
                </TabsList>

                {/* About Tab */}
                <TabsContent value="about" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>About</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-6">
                        {profileData.bio || 'No bio provided yet.'}
                      </p>

                      {profileData.skills && profileData.skills.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-medium mb-3">Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {profileData.skills.map((skill) => (
                              <Badge key={skill} variant="secondary">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Verification Badges */}
                      <div>
                        <h4 className="font-medium mb-3">Verification</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>Email Verified</span>
                          </div>
                          {profileData.wallet_address && (
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span>Wallet Connected</span>
                            </div>
                          )}
                          {profileData.token_balance >= 100000 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Award className="h-4 w-4 text-primary" />
                              <span>Dev Access Holder</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Reviews Tab */}
                <TabsContent value="reviews" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Reviews</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {reviews.length > 0 ? (
                        <div className="space-y-6">
                          {reviews.map((review) => (
                            <div key={review.id} className="pb-6 border-b last:border-0 last:pb-0">
                              <div className="flex items-start gap-4">
                                <InitialsAvatar nickname={review.reviewer?.nickname} size="sm" />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium">{review.reviewer?.nickname}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {formatDate(review.created_at)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 mb-2">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star
                                        key={i}
                                        className={cn(
                                          "h-4 w-4",
                                          i < review.rating
                                            ? "fill-yellow-500 text-yellow-500"
                                            : "text-muted-foreground"
                                        )}
                                      />
                                    ))}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {review.comment}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          No reviews yet
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Jobs Tab */}
                <TabsContent value="jobs" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {profileData.user_type === 'client' ? 'Posted Jobs' : 'Completed Jobs'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {userJobs.length > 0 ? (
                        <div className="space-y-4">
                          {userJobs.map((job) => (
                            <Link
                              key={job.id}
                              to={`/jobs/${job.id}`}
                              className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted transition-colors"
                            >
                              <div>
                                <h4 className="font-medium">{job.title}</h4>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {job.status}
                                  </Badge>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(job.created_at)}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-primary">{formatSOL(job.budget)}</p>
                                <p className="text-xs text-muted-foreground">{job.budget_type}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          No jobs to display
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information and skills
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nickname</label>
              <Input
                value={editForm.nickname}
                onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                placeholder="Enter your nickname"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bio</label>
              <Textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Skills</label>
              <Input
                value={editForm.skills}
                onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                placeholder="React, Node.js, Solidity (comma-separated)"
              />
              <p className="text-xs text-muted-foreground">
                Separate skills with commas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="gradient-bg"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
