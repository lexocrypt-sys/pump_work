import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Briefcase, Users, DollarSign, Clock,
  ArrowRight, CheckCircle2, MessageSquare, Loader2, X, Star, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InitialsAvatar } from '@/components/ui/InitialsAvatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatSOL, formatTimeAgo, getStatusColor, cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useJobPosts } from '@/hooks/useJobPosts'
import { useApplications } from '@/hooks/useApplications'
import { useContracts } from '@/hooks/useContracts'
import { useServiceRequests } from '@/hooks/useServiceRequests'
import { useCategories } from '@/hooks/useCategories'
import { useReviews } from '@/hooks/useReviews'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
}

export default function ClientDashboard() {
  const navigate = useNavigate()
  const { profile, isAuthenticated, isClient } = useAuth()
  const { fetchClientJobs, updateJob } = useJobPosts()
  const { fetchJobApplications, acceptApplication, rejectApplication } = useApplications()
  const { createContract, fetchClientContracts, approveWork, requestRevisions, cancelContract } = useContracts()
  const { fetchClientServiceRequests, withdrawServiceRequest } = useServiceRequests()
  const { categories } = useCategories()
  const { createReview, checkReviewExists } = useReviews()

  const [activeTab, setActiveTab] = useState('overview')
  const [myJobs, setMyJobs] = useState([])
  const [allApplications, setAllApplications] = useState([])
  const [contracts, setContracts] = useState([])
  const [serviceRequests, setServiceRequests] = useState([])
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState(null)
  const [rating, setRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [revisionNotes, setRevisionNotes] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [isProcessingContract, setIsProcessingContract] = useState(false)
  const [reviewedContracts, setReviewedContracts] = useState(new Map()) // Map<contractId, { created_at, rating }>

  useEffect(() => {
    if (profile?.id && isClient) {
      loadDashboardData()
    }
  }, [profile, isClient])

  const loadDashboardData = async () => {
    setIsLoading(true)

    // Fetch client's jobs
    const { data: jobs } = await fetchClientJobs(profile.id)
    setMyJobs(jobs || [])

    // Fetch applications for all jobs
    if (jobs && jobs.length > 0) {
      const allApps = []
      for (const job of jobs) {
        const { data: apps } = await fetchJobApplications(job.id)
        if (apps) {
          allApps.push(...apps.map(app => ({ ...app, job_title: job.title })))
        }
      }
      setAllApplications(allApps)
    }

    // Fetch contracts
    const { data: contractsData } = await fetchClientContracts(profile.id)
    setContracts(contractsData || [])

    // Fetch service requests (client's sent hire requests)
    const { data: requestsData } = await fetchClientServiceRequests(profile.id)
    setServiceRequests(requestsData || [])

    // Check which completed contracts have been reviewed
    if (contractsData && contractsData.length > 0) {
      const reviewedMap = new Map()
      const completedContracts = contractsData.filter(c => c.status === 'completed')

      for (const contract of completedContracts) {
        const { data: review } = await checkReviewExists(contract.id, profile.id)
        if (review) {
          reviewedMap.set(contract.id, {
            created_at: review.created_at || new Date().toISOString(),
            rating: review.rating
          })
        }
      }
      setReviewedContracts(reviewedMap)
    }

    setIsLoading(false)
  }

  const handleAcceptApplication = async (applicationId, application) => {
    setIsProcessing(true)

    // Accept the application
    const { error: acceptError } = await acceptApplication(applicationId)
    if (acceptError) {
      console.error('Error accepting application:', acceptError)
      setIsProcessing(false)
      return
    }

    // Update job status to 'in_progress' so it disappears from the /jobs page
    const { error: updateJobError } = await updateJob(application.job_post_id, {
      status: 'in_progress',
      hired_freelancer_id: application.freelancer_id
    })
    if (updateJobError) {
      console.error('Error updating job status:', updateJobError)
    }

    // Create contract
    const contractData = {
      job_post_id: application.job_post_id,
      client_id: profile.id,
      freelancer_id: application.freelancer_id,
      title: application.job_post?.title || 'Untitled Project',
      agreed_amount: application.proposed_rate,
      escrow_amount: 0, // Mock - no real escrow
    }

    const { error: contractError } = await createContract(contractData)
    if (contractError) {
      console.error('Error creating contract:', contractError)
    }

    // Reload data
    await loadDashboardData()
    setIsProcessing(false)
  }

  const handleRejectApplication = async (applicationId) => {
    setIsProcessing(true)
    await rejectApplication(applicationId)
    await loadDashboardData()
    setIsProcessing(false)
  }

  const handleOpenReviewDialog = (contract) => {
    setSelectedContract(contract)
    setRating(5)
    setReviewComment('')
    setReviewDialogOpen(true)
  }

  const handleSubmitReview = async () => {
    if (!selectedContract) return

    setIsSubmittingReview(true)

    const reviewData = {
      contract_id: selectedContract.id,
      reviewer_id: profile.id,
      reviewee_id: selectedContract.freelancer_id,
      rating,
      comment: reviewComment.trim(),
    }

    const { error } = await createReview(reviewData)

    if (error) {
      console.error('Error submitting review:', error)
      alert('Failed to submit review. Please try again.')
    } else {
      // Mark contract as reviewed with current timestamp
      setReviewedContracts(prev => {
        const newMap = new Map(prev)
        newMap.set(selectedContract.id, {
          created_at: new Date().toISOString(),
          rating: rating
        })
        return newMap
      })
      setReviewDialogOpen(false)
      await loadDashboardData()
    }

    setIsSubmittingReview(false)
  }

  const handleApproveWork = async (contractId) => {
    if (!confirm('Approve this work? The contract will be marked as completed and you can leave a review.')) return

    setIsProcessingContract(true)
    const { error } = await approveWork(contractId)

    if (error) {
      console.error('Error approving work:', error)
      alert('Failed to approve work. Please try again.')
    } else {
      await loadDashboardData()
    }

    setIsProcessingContract(false)
  }

  const handleOpenRevisionDialog = (contract) => {
    setSelectedContract(contract)
    setRevisionNotes('')
    setRevisionDialogOpen(true)
  }

  const handleRequestRevisions = async () => {
    if (!selectedContract) return
    if (!revisionNotes.trim()) {
      alert('Please provide details about what needs to be revised.')
      return
    }

    setIsProcessingContract(true)
    const { error } = await requestRevisions(selectedContract.id, revisionNotes.trim())

    if (error) {
      console.error('Error requesting revisions:', error)
      alert('Failed to request revisions. Please try again.')
    } else {
      setRevisionDialogOpen(false)
      await loadDashboardData()
    }

    setIsProcessingContract(false)
  }

  const handleCancelContract = async (contractId) => {
    if (!confirm('Are you sure you want to cancel this contract? This action cannot be undone.')) return

    setIsProcessingContract(true)
    const { error } = await cancelContract(contractId)

    if (error) {
      console.error('Error cancelling contract:', error)
      alert('Failed to cancel contract. Please try again.')
    } else {
      await loadDashboardData()
    }

    setIsProcessingContract(false)
  }

  const stats = {
    totalJobs: myJobs.length,
    activeJobs: myJobs.filter(j => j.status === 'open' || j.status === 'in_progress').length,
    totalSpent: profile?.total_spent || 0,
    totalApplicants: myJobs.reduce((acc, job) => acc + (job.applicant_count || 0), 0),
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden pt-12 pb-12 w-full">
      {/* Background Elements */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-purple-500/10 rounded-full blur-[80px] sm:blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-blue-500/10 rounded-full blur-[80px] sm:blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 max-w-full overflow-x-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Client Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your job postings and hire top talent.</p>
          </div>
          <Button className="w-full sm:w-auto rounded-full gradient-bg shadow-lg shadow-primary/20" asChild>
            <Link to="/post-job">
              <Plus className="h-4 w-4 mr-2" /> Post a Job
            </Link>
          </Button>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8"
        >
          {[
            { label: 'Total Jobs', value: stats.totalJobs, icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Active Jobs', value: stats.activeJobs, icon: Clock, color: 'text-green-500', bg: 'bg-green-500/10' },
            { label: 'Total Spent', value: formatSOL(stats.totalSpent), icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            { label: 'Applicants', value: stats.totalApplicants, icon: Users, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          ].map((stat, i) => (
            <motion.div key={i} variants={itemVariants}>
              <Card className="glass-card hover:border-primary/30 transition-colors h-full">
                <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between mb-2">
                    <div className={cn("p-2 rounded-lg shrink-0", stat.bg)}>
                      <stat.icon className={cn("h-4 w-4 sm:h-5 sm:w-5", stat.color)} />
                    </div>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="text-xl sm:text-2xl font-bold truncate">{stat.value}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide font-medium truncate">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs & Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
          {/* Scrollable Tab List for Mobile */}
          <div className="w-full overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
            <TabsList className="bg-muted/50 p-1 border border-white/5 backdrop-blur-sm rounded-xl inline-flex w-auto min-w-full sm:min-w-0">
              {['overview', 'jobs', 'applications', 'requests', 'contracts'].map(tab => (
                <TabsTrigger key={tab} value={tab} className="capitalize rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 sm:flex-none">
                  {tab === 'requests' ? 'Service Requests' : tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid lg:grid-cols-2 gap-6">

              {/* Recent Jobs */}
              <motion.div variants={itemVariants}>
                <Card className="glass-card h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
                    <CardTitle className="text-lg">Recent Jobs</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('jobs')} className="text-primary hover:text-primary/80 px-2 sm:px-4 shrink-0">
                      View all <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="space-y-3">
                      {myJobs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No jobs posted yet</p>
                          <Button asChild variant="link" className="mt-2">
                            <Link to="/post-job">Post your first job</Link>
                          </Button>
                        </div>
                      ) : (
                        myJobs.slice(0, 4).map((job) => (
                          <Link
                            key={job.id}
                            to={`/jobs/${job.id}`}
                            className="flex items-start justify-between p-3 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-all group gap-3 bg-background/40"
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate group-hover:text-primary transition-colors text-sm sm:text-base">
                                {job.title}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <Badge variant="outline" className={cn("h-5 text-[10px] sm:text-xs shrink-0", getStatusColor(job.status))}>
                                  {job.status.replace('_', ' ')}
                                </Badge>
                                <span className="truncate">{job.applicant_count || 0} applicants</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0 flex flex-col items-end">
                              <p className="font-bold text-primary text-sm sm:text-base whitespace-nowrap">{formatSOL(job.budget)}</p>
                              <p className="text-[10px] text-muted-foreground whitespace-nowrap">{formatTimeAgo(job.created_at)}</p>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Applications */}
              <motion.div variants={itemVariants}>
                <Card className="glass-card h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
                    <CardTitle className="text-lg">Recent Applications</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('applications')} className="text-primary hover:text-primary/80 px-2 sm:px-4 shrink-0">
                      View all <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="space-y-3">
                      {allApplications.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No applications yet</p>
                        </div>
                      ) : (
                        allApplications.slice(0, 4).map((app) => (
                          <div key={app.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-all bg-background/40">
                            <InitialsAvatar nickname={app.freelancer?.nickname} size="sm" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{app.freelancer?.nickname}</h4>
                              <p className="text-xs text-muted-foreground truncate">
                                Applied to: {app.job_title}
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-[10px] sm:text-xs h-5 sm:h-6 shrink-0 capitalize">
                              {app.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

            </motion.div>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <Card className="glass-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle>Applications</CardTitle>
                <CardDescription>Review and manage applications from freelancers</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                {allApplications.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No Applications Yet</p>
                    <p className="text-sm">Applications will appear here when freelancers apply to your jobs</p>
                  </div>
                ) : (
                  allApplications.map(app => (
                    <div key={app.id} className="p-4 rounded-xl border bg-background/50">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">

                        {/* User Info Block */}
                        <div className="flex gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                          <InitialsAvatar nickname={app.freelancer?.nickname} size="lg" />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <div className="font-bold text-base sm:text-lg">{app.freelancer?.nickname}</div>
                                {app.freelancer?.rating > 0 && (
                                  <div className="flex items-center gap-1 text-yellow-500 text-xs">
                                    <Star className="h-3 w-3 fill-current" /> {app.freelancer.rating.toFixed(1)} ({app.freelancer.review_count} reviews)
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                              Applied to: <span className="font-medium">{app.job_title}</span>
                            </div>
                            <div className="mt-2 text-xs sm:text-sm text-foreground/80 line-clamp-3 break-words">
                              {app.cover_letter}
                            </div>
                            <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                              <span>Duration: {app.estimated_duration}</span>
                              <span>•</span>
                              <span>{formatTimeAgo(app.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions Block */}
                        <div className="w-full md:w-auto flex flex-row md:flex-col justify-between items-center md:items-end gap-3 md:gap-2 mt-2 md:mt-0 pl-[3.25rem] md:pl-0">
                          <div className="font-bold text-base sm:text-lg text-primary whitespace-nowrap">
                            {formatSOL(app.proposed_rate)}
                          </div>
                          {app.status === 'pending' ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectApplication(app.id)}
                                disabled={isProcessing}
                                className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3 shrink-0"
                              >
                                <X className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Reject</span>
                              </Button>
                              <Button
                                size="sm"
                                className="gradient-bg h-8 px-4 sm:h-9 shrink-0"
                                onClick={() => handleAcceptApplication(app.id, app)}
                                disabled={isProcessing}
                              >
                                <CheckCircle2 className="h-4 w-4 sm:mr-2" />
                                <span>{isProcessing ? 'Processing...' : 'Accept'}</span>
                              </Button>
                            </div>
                          ) : (
                            <Badge variant={app.status === 'accepted' ? 'default' : 'secondary'} className="capitalize">
                              {app.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="glass-card">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle>My Jobs</CardTitle>
                  <CardDescription>Manage your active listings</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="space-y-4">
                    {myJobs.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Briefcase className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No Jobs Posted</p>
                        <p className="text-sm mb-4">Start hiring talented freelancers by posting your first job</p>
                        <Button asChild className="gradient-bg">
                          <Link to="/post-job">
                            <Plus className="h-4 w-4 mr-2" /> Post a Job
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      myJobs.map((job) => (
                        <div key={job.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-border/50 bg-background/50 hover:border-primary/30 transition-all gap-4">
                          <div className="flex-1 min-w-0">
                            <Link to={`/jobs/${job.id}`} className="text-base sm:text-lg font-semibold hover:text-primary transition-colors line-clamp-1 block">
                              {job.title}
                            </Link>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs sm:text-sm text-muted-foreground">
                              <Badge variant="outline" className={cn("text-[10px] sm:text-xs shrink-0 capitalize", getStatusColor(job.status))}>
                                {job.status.replace('_', ' ')}
                              </Badge>
                              <span className="flex items-center gap-1 shrink-0"><Users className="h-3 w-3" /> {job.applicant_count || 0} applicants</span>
                              <span className="flex items-center gap-1 shrink-0"><Clock className="h-3 w-3" /> {formatTimeAgo(job.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between md:justify-end gap-4 mt-2 md:mt-0">
                            <div className="text-left md:text-right">
                              <div className="font-bold text-primary">{formatSOL(job.budget)}</div>
                              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase">{job.budget_type}</div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button variant="outline" size="sm" asChild className="h-8 sm:h-9">
                                <Link to={`/jobs/${job.id}`}>View</Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Service Requests Tab */}
          <TabsContent value="requests">
            <Card className="glass-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle>Service Requests</CardTitle>
                <CardDescription>Your sent hire requests to freelancers</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                {serviceRequests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Briefcase className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No Service Requests</p>
                    <p className="text-sm">Browse <Link to="/freelancers" className="text-primary hover:underline">freelancers</Link> to hire for your project</p>
                  </div>
                ) : (
                  serviceRequests.map(request => (
                    <div key={request.id} className="p-4 rounded-xl border bg-background/50">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="flex gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                          <InitialsAvatar nickname={request.freelancer?.nickname} size="lg" />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <div className="font-bold text-base sm:text-lg">{request.freelancer?.nickname}</div>
                                {request.freelancer?.rating > 0 && (
                                  <div className="flex items-center gap-1 text-yellow-500 text-xs">
                                    <Star className="h-3 w-3 fill-current" /> {request.freelancer.rating.toFixed(1)} ({request.freelancer.review_count} reviews)
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                              For service: <span className="font-medium">{request.service_post?.title}</span>
                            </div>
                            <div className="mt-2 text-xs sm:text-sm text-foreground/80">
                              <strong>Your Project:</strong> {request.project_description}
                            </div>
                            <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                              <span>{formatTimeAgo(request.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="w-full md:w-auto flex flex-row md:flex-col justify-between items-center md:items-end gap-3 md:gap-2 mt-2 md:mt-0 pl-[3.25rem] md:pl-0">
                          <div className="font-bold text-base sm:text-lg text-primary whitespace-nowrap">
                            {formatSOL(request.proposed_budget)}
                          </div>
                          <Badge variant="outline" className={cn("text-xs capitalize", getStatusColor(request.status))}>
                            {request.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="glass-card">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle>Active Contracts</CardTitle>
                  <CardDescription>Manage ongoing work with freelancers</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {contracts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCircle2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">No Active Contracts</p>
                      <p className="text-sm">Contracts will appear here when you hire freelancers</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Active Contracts - In Progress */}
                      {contracts.filter(c => c.status === 'active').length > 0 && (
                        <>
                          <div>
                            <h3 className="text-lg font-semibold mb-4">In Progress</h3>
                            <div className="space-y-4">
                              {contracts.filter(c => c.status === 'active').map((contract) => (
                                <div key={contract.id} className="p-4 rounded-xl border border-border/50 bg-background/50 hover:border-primary/30 transition-all">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex gap-3 flex-1 min-w-0">
                                      <InitialsAvatar nickname={contract.freelancer?.nickname} size="md" />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-bold text-base">{contract.title}</div>
                                        <div className="text-sm text-muted-foreground">
                                          with {contract.freelancer?.nickname}
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                          <Badge variant="default" className="capitalize">
                                            In Progress
                                          </Badge>
                                          <span>{formatTimeAgo(contract.started_at)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right flex flex-col gap-2">
                                      <div className="font-bold text-primary">{formatSOL(contract.agreed_amount)}</div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleCancelContract(contract.id)}
                                          disabled={isProcessingContract}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => navigate(`/messages?user=${contract.freelancer_id}`)}
                                        >
                                          <MessageSquare className="h-3 w-3 mr-1" /> Message
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Submitted Contracts - Awaiting Review */}
                      {contracts.filter(c => c.status === 'submitted').length > 0 && (
                        <>
                          <div className={contracts.filter(c => c.status === 'active').length > 0 ? 'pt-6 border-t' : ''}>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <AlertCircle className="h-5 w-5 text-blue-500" />
                              Submitted Work - Awaiting Your Review
                            </h3>
                            <div className="space-y-4">
                              {contracts.filter(c => c.status === 'submitted').map((contract) => (
                                <div key={contract.id} className="p-4 rounded-xl border-2 border-blue-500/30 bg-blue-500/5">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex gap-3 flex-1 min-w-0">
                                      <InitialsAvatar nickname={contract.freelancer?.nickname} size="md" />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-bold text-base">{contract.title}</div>
                                        <div className="text-sm text-muted-foreground">
                                          by {contract.freelancer?.nickname}
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 text-xs">
                                          <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">
                                            Submitted {formatTimeAgo(contract.submitted_at)}
                                          </Badge>
                                          {contract.revision_count > 0 && (
                                            <span className="text-muted-foreground">
                                              {contract.revision_count} revision{contract.revision_count > 1 ? 's' : ''} requested
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right flex flex-col gap-2">
                                      <div className="font-bold text-primary">{formatSOL(contract.agreed_amount)}</div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleOpenRevisionDialog(contract)}
                                          disabled={isProcessingContract}
                                        >
                                          Request Revisions
                                        </Button>
                                        <Button
                                          size="sm"
                                          className="gradient-bg"
                                          onClick={() => handleApproveWork(contract.id)}
                                          disabled={isProcessingContract}
                                        >
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Approve & Pay
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Completed Contracts */}
                      {contracts.filter(c => c.status === 'completed').length > 0 && (
                        <>
                          <div className={(contracts.filter(c => c.status === 'active').length > 0 || contracts.filter(c => c.status === 'submitted').length > 0) ? 'pt-6 border-t' : ''}>
                            <h3 className="text-lg font-semibold mb-4">Completed</h3>
                            <div className="space-y-4">
                              {contracts.filter(c => c.status === 'completed').map((contract) => (
                                <div key={contract.id} className="p-4 rounded-xl border border-border/50 bg-background/50 hover:border-primary/30 transition-all">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex gap-3 flex-1 min-w-0">
                                      <InitialsAvatar nickname={contract.freelancer?.nickname} size="md" />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-bold text-base">{contract.title}</div>
                                        <div className="text-sm text-muted-foreground">
                                          with {contract.freelancer?.nickname}
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                          <Badge variant="secondary" className="capitalize">
                                            Completed
                                          </Badge>
                                          <span>{formatTimeAgo(contract.completed_at)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right flex flex-col gap-2">
                                      <div className="font-bold text-primary">{formatSOL(contract.agreed_amount)}</div>
                                      {reviewedContracts.has(contract.id) ? (
                                        <div className="flex flex-col items-end gap-1">
                                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20">
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            <span className="text-sm font-medium text-green-600 dark:text-green-400">Reviewed</span>
                                          </div>
                                          <span className="text-xs text-muted-foreground">
                                            {formatTimeAgo(reviewedContracts.get(contract.id)?.created_at)}
                                          </span>
                                        </div>
                                      ) : (
                                        <Button
                                          size="sm"
                                          className="gradient-bg"
                                          onClick={() => handleOpenReviewDialog(contract)}
                                        >
                                          <Star className="h-3 w-3 mr-1" /> Review
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Freelancer</DialogTitle>
            <DialogDescription>
              Share your experience working with {selectedContract?.freelancer?.nickname}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "h-8 w-8",
                        star <= rating
                          ? "fill-yellow-500 text-yellow-500"
                          : "text-muted-foreground"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Comment (Optional)</label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share details about your experience..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setReviewDialogOpen(false)}
              disabled={isSubmittingReview}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmittingReview}
              className="gradient-bg"
            >
              {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision Request Dialog */}
      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Revisions</DialogTitle>
            <DialogDescription>
              Describe what needs to be changed or improved for {selectedContract?.freelancer?.nickname}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Revision Details</label>
              <Textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Please be specific about what needs to be revised..."
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                The freelancer will be able to see these notes and resubmit the work.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRevisionDialogOpen(false)}
              disabled={isProcessingContract}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestRevisions}
              disabled={isProcessingContract || !revisionNotes.trim()}
              className="gradient-bg"
            >
              {isProcessingContract ? 'Sending...' : 'Request Revisions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}