import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Clock, Calendar, Users, Star, CheckCircle2,
  Share2, Heart, Wallet, AlertCircle, Loader2, Lock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InitialsAvatar } from '@/components/ui/InitialsAvatar'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { formatSOL, formatTimeAgo, formatDate, cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useJobPosts } from '@/hooks/useJobPosts'
import { useApplications } from '@/hooks/useApplications'
import { useCategories } from '@/hooks/useCategories'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, isAuthenticated, isFreelancer, isClient, isWalletConnected, connectWallet } = useAuth()
  const { fetchJobById } = useJobPosts()
  const { createApplication, checkApplicationExists } = useApplications()
  const { categories } = useCategories()

  const [job, setJob] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [proposedRate, setProposedRate] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)
  const [applicationStatus, setApplicationStatus] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadJob()
  }, [id])

  useEffect(() => {
    if (job && profile && isFreelancer) {
      checkIfApplied()
    }
  }, [job, profile])

  const loadJob = async () => {
    setIsLoading(true)
    const { data, error: fetchError } = await fetchJobById(id)

    if (fetchError) {
      console.error('Error loading job:', fetchError)
      setIsLoading(false)
      return
    }

    setJob(data)
    setProposedRate(data?.budget?.toString() || '')
    setIsLoading(false)
  }

  const checkIfApplied = async () => {
    if (!profile?.id || !job?.id) return

    const { data } = await checkApplicationExists(job.id, profile.id)
    if (data) {
      setHasApplied(true)
      setApplicationStatus(data.status)
    }
  }

  const handleApply = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (!isFreelancer) {
      setError('Only freelancers can apply to jobs')
      return
    }

    if (!coverLetter.trim() || !proposedRate || !estimatedDuration.trim()) {
      setError('Please fill in all fields')
      return
    }

    setIsApplying(true)
    setError('')

    const { data, error: applyError } = await createApplication({
      job_post_id: job.id,
      freelancer_id: profile.id,
      cover_letter: coverLetter.trim(),
      proposed_rate: parseFloat(proposedRate),
      estimated_duration: estimatedDuration.trim(),
    })

    setIsApplying(false)

    if (applyError) {
      setError(applyError.message || 'Failed to submit application')
      return
    }

    setHasApplied(true)
    setApplicationStatus('pending')
    setApplyModalOpen(false)
    setCoverLetter('')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full glass-card border-red-500/20">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Job Not Found</h2>
            <p className="text-muted-foreground mb-6">This job posting may have been removed or does not exist.</p>
            <Button onClick={() => navigate('/jobs')}>Browse Jobs</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const categoryName = categories.find(c => c.id === job.category)?.name || job.category

  // Clients shouldn't see apply button on their own jobs
  const canApply = isAuthenticated && isFreelancer && job.status === 'open'
  const isOwnJob = isClient && profile?.id === job.client_id

  return (
    <div className="min-h-screen pt-12 pb-12 relative">
      {/* Background */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
         <div className="absolute top-0 right-0 w-1/2 h-screen bg-primary/5 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 pl-0 hover:pl-2 transition-all">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Jobs
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 space-y-6">
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="flex justify-between items-start gap-4 mb-6">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">{job.title}</h1>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Clock className="h-4 w-4"/> Posted {formatTimeAgo(job.created_at)}</div>
                      {job.deadline && <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4"/> Deadline: {formatDate(job.deadline)}</div>}
                      <div className="flex items-center gap-1.5"><Users className="h-4 w-4"/> {job.applicant_count || 0} applicants</div>
                      <Badge variant="outline" className="capitalize">{categoryName}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="icon" className="rounded-full h-9 w-9 sm:h-10 sm:w-10"><Heart className="h-4 w-4 sm:h-5 sm:w-5"/></Button>
                    <Button variant="outline" size="icon" className="rounded-full h-9 w-9 sm:h-10 sm:w-10"><Share2 className="h-4 w-4 sm:h-5 sm:w-5"/></Button>
                  </div>
                </div>

                <Separator className="bg-border/50 mb-6" />

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Description</h3>
                    <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {job.description}
                    </div>
                  </div>

                  {job.skills && job.skills.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Required Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {job.skills.map(skill => (
                          <Badge key={skill} variant="secondary" className="px-3 py-1 text-sm">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Client Info Card Mobile */}
            <Card className="glass-card lg:hidden">
               <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <InitialsAvatar nickname={job.client?.nickname} size="lg" />
                    <div>
                      <Link to={`/profile/${job.client?.id}`} className="font-bold text-lg hover:text-primary transition-colors">
                        {job.client?.nickname}
                      </Link>
                      {job.client?.rating > 0 && (
                        <div className="flex items-center gap-1 text-yellow-500 text-sm">
                          <Star className="h-4 w-4 fill-current"/> {job.client.rating.toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>
               </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
            {/* Action Card */}
            <Card className="glass-card sticky top-24 border-primary/20">
              <CardContent className="p-6">
                <div className="mb-6">
                  <div className="text-sm text-muted-foreground mb-1">{job.budget_type === 'fixed' ? 'Fixed Price' : 'Hourly Rate'}</div>
                  <div className="text-4xl font-bold gradient-text">{formatSOL(job.budget)}</div>
                </div>

                {error && (
                  <div className="mb-4 flex items-center gap-2 p-3 text-sm text-red-500 bg-red-500/10 rounded-lg border border-red-500/20">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {isOwnJob ? (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                    <Lock className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <div className="font-semibold text-blue-500">Your Job Post</div>
                    <p className="text-xs text-muted-foreground mt-1">View applications in your dashboard</p>
                  </div>
                ) : hasApplied ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <div className="font-semibold text-green-500">Application {applicationStatus === 'accepted' ? 'Accepted' : applicationStatus === 'rejected' ? 'Rejected' : 'Pending'}</div>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{applicationStatus}</p>
                  </div>
                ) : canApply ? (
                  <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" className="w-full gradient-bg font-bold shadow-lg shadow-primary/20">Apply Now</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="text-xl">Apply for {job.title}</DialogTitle>
                        <DialogDescription className="text-base">Showcase why you are the best fit.</DialogDescription>
                      </DialogHeader>
                      {!isWalletConnected && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex items-center justify-between">
                           <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-500"><AlertCircle className="h-4 w-4"/> Connect wallet to get paid</div>
                           <Button size="sm" variant="outline" onClick={connectWallet}>Connect</Button>
                        </div>
                      )}
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Cover Letter *</label>
                          <Textarea
                            placeholder="I'm the perfect fit because..."
                            value={coverLetter} onChange={e => setCoverLetter(e.target.value)}
                            className="min-h-[120px]" rows={5}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <label className="text-sm font-medium text-foreground">Proposed Rate (SOL) *</label>
                             <Input
                               type="number"
                               step="0.01"
                               min="0"
                               value={proposedRate}
                               onChange={e => setProposedRate(e.target.value)}
                             />
                           </div>
                           <div className="space-y-2">
                             <label className="text-sm font-medium text-foreground">Duration *</label>
                             <Input
                               placeholder="e.g. 2 weeks"
                               value={estimatedDuration}
                               onChange={e => setEstimatedDuration(e.target.value)}
                             />
                           </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setApplyModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleApply} disabled={isApplying} className="gradient-bg">{isApplying ? 'Sending...' : 'Submit Proposal'}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="bg-muted/30 border border-border rounded-xl p-4 text-center">
                    <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <div className="font-semibold text-muted-foreground">
                      {!isAuthenticated ? 'Login Required' : 'Clients Cannot Apply'}
                    </div>
                    {!isAuthenticated && (
                      <Button onClick={() => navigate('/login')} className="mt-3 w-full">
                        Login to Apply
                      </Button>
                    )}
                  </div>
                )}

                <div className="mt-6 space-y-4">
                   <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="font-semibold text-sm mb-3">About the Client</h4>
                      <div className="flex items-center gap-3 mb-3">
                         <InitialsAvatar nickname={job.client?.nickname} size="md" />
                         <div>
                            <Link to={`/profile/${job.client?.id}`} className="font-medium hover:text-primary transition-colors">
                              {job.client?.nickname}
                            </Link>
                            <div className="text-xs text-muted-foreground">
                              {job.client?.rating > 0 && (
                                <div className="flex items-center gap-1 text-yellow-500">
                                  <Star className="h-3 w-3 fill-current"/> {job.client.rating.toFixed(1)}
                                </div>
                              )}
                            </div>
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                         <div className="bg-background/50 p-2 rounded">
                            <div className="text-muted-foreground">Spent</div>
                            <div className="font-mono">{formatSOL(job.client?.total_spent || 0)}</div>
                         </div>
                         <div className="bg-background/50 p-2 rounded">
                            <div className="text-muted-foreground">Posted</div>
                            <div className="font-mono">{job.client?.jobs_posted || 0} Jobs</div>
                         </div>
                      </div>
                   </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}