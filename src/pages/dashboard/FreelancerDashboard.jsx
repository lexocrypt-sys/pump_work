import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Search,
  Briefcase,
  DollarSign,
  Clock,
  Star,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Wallet,
  FileText,
  Award,
  Loader2,
  Plus,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InitialsAvatar } from '@/components/ui/InitialsAvatar'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { formatSOL, formatTimeAgo, formatDate, getStatusColor, cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useApplications } from '@/hooks/useApplications'
import { useContracts } from '@/hooks/useContracts'
import { useServicePosts } from '@/hooks/useServicePosts'
import { useServiceRequests } from '@/hooks/useServiceRequests'
import { useJobPosts } from '@/hooks/useJobPosts'

export default function FreelancerDashboard() {
  const navigate = useNavigate()
  const { profile, isAuthenticated, isFreelancer, tokenBalance } = useAuth()
  const { fetchFreelancerApplications, withdrawApplication } = useApplications()
  const { fetchFreelancerContracts, submitWork, cancelContract, createContract } = useContracts()
  const { fetchFreelancerServices } = useServicePosts()
  const { fetchFreelancerServiceRequests, acceptServiceRequest, rejectServiceRequest } = useServiceRequests()
  const { fetchJobs } = useJobPosts()

  const [activeTab, setActiveTab] = useState('overview')
  const [myApplications, setMyApplications] = useState([])
  const [activeContracts, setActiveContracts] = useState([])
  const [completedContracts, setCompletedContracts] = useState([])
  const [myServices, setMyServices] = useState([])
  const [serviceRequests, setServiceRequests] = useState([])
  const [recommendedJobs, setRecommendedJobs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [submittingWork, setSubmittingWork] = useState(null)
  const [withdrawingApp, setWithdrawingApp] = useState(null)
  const [processingRequest, setProcessingRequest] = useState(null)

  useEffect(() => {
    if (profile?.id && isFreelancer) {
      loadDashboardData()
    }
  }, [profile, isFreelancer])

  const loadDashboardData = async () => {
    setIsLoading(true)

    // Fetch freelancer's applications
    const { data: apps } = await fetchFreelancerApplications(profile.id)
    setMyApplications(apps || [])

    // Fetch freelancer's active and submitted contracts
    const { data: activeContractsData } = await fetchFreelancerContracts(profile.id, 'active')
    const { data: submittedContractsData } = await fetchFreelancerContracts(profile.id, 'submitted')
    setActiveContracts([...(activeContractsData || []), ...(submittedContractsData || [])])

    // Fetch freelancer's completed contracts
    const { data: completedContractsData } = await fetchFreelancerContracts(profile.id, 'completed')
    setCompletedContracts(completedContractsData || [])

    // Fetch freelancer's services
    const { data: services } = await fetchFreelancerServices(profile.id)
    setMyServices(services || [])

    // Fetch service requests (clients wanting to hire)
    const { data: requests } = await fetchFreelancerServiceRequests(profile.id)
    setServiceRequests(requests || [])

    // Fetch recommended jobs (open jobs)
    const { data: jobs } = await fetchJobs({ status: 'open' })
    setRecommendedJobs(jobs?.slice(0, 4) || [])

    setIsLoading(false)
  }

  const handleSubmitWork = async (contractId) => {
    setSubmittingWork(contractId)
    const { error } = await submitWork(contractId)

    if (error) {
      console.error('Error submitting work:', error)
      alert('Failed to submit work. Please try again.')
    } else {
      alert('Work submitted successfully! Waiting for client approval.')
      await loadDashboardData()
    }

    setSubmittingWork(null)
  }

  const handleWithdrawApplication = async (applicationId) => {
    if (!confirm('Are you sure you want to withdraw this application?')) return

    setWithdrawingApp(applicationId)
    const { error } = await withdrawApplication(applicationId)

    if (error) {
      console.error('Error withdrawing application:', error)
      alert('Failed to withdraw application. Please try again.')
    } else {
      await loadDashboardData()
    }

    setWithdrawingApp(null)
  }

  const handleCancelContract = async (contractId) => {
    if (!confirm('Are you sure you want to cancel this contract? This action cannot be undone.')) return

    setSubmittingWork(contractId)
    const { error } = await cancelContract(contractId)

    if (error) {
      console.error('Error cancelling contract:', error)
      alert('Failed to cancel contract. Please try again.')
    } else {
      await loadDashboardData()
    }

    setSubmittingWork(null)
  }

  const handleAcceptServiceRequest = async (request) => {
    if (!confirm(`Accept hire request from ${request.client?.nickname}?`)) return

    setProcessingRequest(request.id)

    try {
      // Accept the request
      const { error: acceptError } = await acceptServiceRequest(request.id)
      if (acceptError) {
        console.error('Error accepting request:', acceptError)
        alert('Failed to accept request. Please try again.')
        setProcessingRequest(null)
        return
      }

      // Create contract
      const contractData = {
        service_post_id: request.service_post_id,
        client_id: request.client_id,
        freelancer_id: profile.id,
        title: request.service_post?.title || 'Untitled Project',
        description: request.project_description,
        agreed_amount: request.proposed_budget,
        escrow_amount: 0, // Mock - no real escrow
      }

      const { error: contractError } = await createContract(contractData)
      if (contractError) {
        console.error('Error creating contract:', contractError)
        alert('Request accepted but failed to create contract. Please contact support.')
      } else {
        alert('Request accepted! Contract created successfully.')
      }

      // Reload data
      await loadDashboardData()
    } catch (err) {
      console.error('Error handling service request:', err)
      alert('An error occurred. Please try again.')
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleRejectServiceRequest = async (requestId) => {
    if (!confirm('Are you sure you want to reject this hire request?')) return

    setProcessingRequest(requestId)
    const { error } = await rejectServiceRequest(requestId)

    if (error) {
      console.error('Error rejecting request:', error)
      alert('Failed to reject request. Please try again.')
    } else {
      await loadDashboardData()
    }

    setProcessingRequest(null)
  }

  const stats = {
    totalEarnings: profile?.total_earned || 0,
    activeContracts: activeContracts.filter(c => c.status === 'active').length,
    completedJobs: profile?.jobs_completed || 0,
    rating: profile?.rating || 0,
    pendingApplications: myApplications.filter(a => a.status === 'pending').length,
    pendingPayments: activeContracts
      .filter(c => c.status === 'active')
      .reduce((sum, c) => sum + (c.amount || 0), 0),
  }

  // Profile completion calculation
  const profileItems = [
    { name: 'Bio', completed: !!profile?.bio },
    { name: 'Skills', completed: profile?.skills?.length > 0 },
    { name: 'Service Posted', completed: myServices.length > 0 },
    { name: 'Wallet', completed: !!profile?.wallet_address },
  ]
  const profileCompletion = Math.round((profileItems.filter(i => i.completed).length / profileItems.length) * 100)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 pt-12 pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <InitialsAvatar nickname={profile?.nickname} size="xl" className="ring-4 ring-primary/20" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Welcome back, {profile?.nickname}!</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {stats.rating > 0 ? (
                  <>
                    <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-500 text-yellow-500" />
                    <span>{stats.rating.toFixed(2)}</span>
                    <span className="hidden xs:inline">rating</span>
                    <span>•</span>
                    <span>{profile?.review_count || 0} reviews</span>
                  </>
                ) : (
                  <span>No reviews yet</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/post-service">
                <Plus className="h-4 w-4 mr-2" />
                Post Service
              </Link>
            </Button>
            <Button className="gradient-bg" asChild>
              <Link to="/jobs">
                <Search className="h-4 w-4 mr-2" />
                Find Jobs
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: 'Total Earnings', value: `${stats.totalEarnings} SOL`, icon: DollarSign, color: 'text-green-500' },
            { label: 'Active Contracts', value: stats.activeContracts, icon: Briefcase, color: 'text-blue-500' },
            { label: 'Jobs Completed', value: stats.completedJobs, icon: CheckCircle2, color: 'text-purple-500' },
            { label: 'Pending Payments', value: `${stats.pendingPayments} SOL`, icon: Clock, color: 'text-orange-500' },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={cn("h-8 w-8", stat.color)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applications">My Applications</TabsTrigger>
            <TabsTrigger value="requests">Service Requests</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Profile Completion */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Profile Completion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold text-primary mb-2">{profileCompletion}%</div>
                      <Progress value={profileCompletion} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      {profileItems.map((item) => (
                        <div key={item.name} className="flex items-center gap-2 text-sm">
                          {item.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className={item.completed ? '' : 'text-muted-foreground'}>
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full mt-4" asChild>
                      <Link to={`/profile/${profile?.id}`}>Complete Profile</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recommended Jobs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-2"
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Recommended Jobs</CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/jobs">
                        View all
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recommendedJobs.map((job) => (
                        <Link
                          key={job.id}
                          to={`/jobs/${job.id}`}
                          className="flex flex-col sm:flex-row sm:items-start justify-between p-3 rounded-lg hover:bg-muted transition-colors gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium line-clamp-2 sm:line-clamp-1 hover:text-primary text-sm sm:text-base">
                              {job.title}
                            </h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {job.skills.slice(0, 3).map((skill) => (
                                <Badge key={skill} variant="secondary" className="text-[10px] sm:text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="text-left sm:text-right sm:ml-4 flex-shrink-0">
                            <p className="font-semibold text-primary text-sm sm:text-base">{formatSOL(job.budget)}</p>
                            <p className="text-xs text-muted-foreground">{formatTimeAgo(job.created_at)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* My Applications */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2"
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Recent Applications</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('applications')}>
                      View all
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {myApplications.map((app) => {
                        const job = app.job_post
                        return (
                          <div
                            key={app.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm sm:text-base line-clamp-2 sm:line-clamp-1">{job?.title}</h4>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                Applied {formatTimeAgo(app.created_at)}
                              </p>
                            </div>
                            <Badge variant="outline" className={cn("text-xs self-start sm:self-auto", getStatusColor(app.status))}>
                              {app.status}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>My Applications</CardTitle>
                <CardDescription>Track your job applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myApplications.map((app) => {
                    const job = app.job_post
                    return (
                      <div key={app.id} className="p-3 sm:p-4 rounded-lg border">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-2">
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/jobs/${job?.id}`}
                              className="font-semibold hover:text-primary text-sm sm:text-base line-clamp-2 sm:line-clamp-1 block"
                            >
                              {job?.title}
                            </Link>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Applied {formatTimeAgo(app.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("text-xs self-start sm:self-auto", getStatusColor(app.status))}>
                              {app.status}
                            </Badge>
                            {app.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleWithdrawApplication(app.id)}
                                disabled={withdrawingApp === app.id}
                                className="text-xs"
                              >
                                {withdrawingApp === app.id ? 'Withdrawing...' : 'Withdraw'}
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">
                          {app.cover_letter}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
                          <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 xs:gap-4">
                            <span>
                              <strong>{formatSOL(app.proposed_rate)}</strong> proposed
                            </span>
                            <span>
                              <strong>{app.estimated_duration}</strong> delivery
                            </span>
                          </div>
                          <Button variant="outline" size="sm" className="text-xs sm:text-sm w-full xs:w-auto" asChild>
                            <Link to={`/jobs/${job?.id}`}>View Job</Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service Requests Tab */}
          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Service Requests</CardTitle>
                <CardDescription>Clients requesting to hire your services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {serviceRequests.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Briefcase className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">No Service Requests</p>
                      <p className="text-sm">Requests from clients will appear here</p>
                    </div>
                  ) : (
                    serviceRequests.map((request) => (
                      <div key={request.id} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between mb-3 gap-4">
                          <div className="flex gap-3 flex-1 min-w-0">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>{request.client?.nickname?.[0] || 'C'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{request.client?.nickname}</h4>
                                <Badge variant="outline" className={cn("text-xs capitalize", getStatusColor(request.status))}>
                                  {request.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                For: {request.service_post?.title}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-primary">{formatSOL(request.proposed_budget)}</div>
                            <div className="text-xs text-muted-foreground">{formatTimeAgo(request.created_at)}</div>
                          </div>
                        </div>

                        <div className="mb-3 p-3 bg-muted/30 rounded-lg">
                          <h5 className="text-sm font-semibold mb-1">Project Description:</h5>
                          <p className="text-sm text-muted-foreground">{request.project_description}</p>
                          {request.requirements && (
                            <>
                              <h5 className="text-sm font-semibold mt-2 mb-1">Additional Requirements:</h5>
                              <p className="text-sm text-muted-foreground">{request.requirements}</p>
                            </>
                          )}
                          {request.deadline && (
                            <p className="text-sm text-muted-foreground mt-2">
                              <strong>Deadline:</strong> {formatDate(request.deadline)}
                            </p>
                          )}
                        </div>

                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/messages?user=${request.client_id}`)}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" /> Message
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectServiceRequest(request.id)}
                              disabled={processingRequest === request.id}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="gradient-bg"
                              onClick={() => handleAcceptServiceRequest(request)}
                              disabled={processingRequest === request.id}
                            >
                              {processingRequest === request.id ? 'Processing...' : 'Accept & Create Contract'}
                            </Button>
                          </div>
                        )}

                        {request.status === 'accepted' && (
                          <div className="text-sm text-green-500 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Contract created - Check Contracts tab
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts">
            <div className="space-y-6">
              {/* Active Contracts */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Contracts</CardTitle>
                  <CardDescription>Your ongoing projects</CardDescription>
                </CardHeader>
                <CardContent>
                  {activeContracts.length > 0 ? (
                    <div className="space-y-4">
                      {activeContracts.filter(c => c.status === 'active').map((contract) => (
                        <div key={contract.id} className="p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">{contract.job_post?.title || contract.service_post?.title}</h4>
                            <Badge variant="warning">In Progress</Badge>
                          </div>
                          <div className="flex items-center gap-3 mb-4">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={contract.client?.avatar} />
                              <AvatarFallback>{contract.client?.nickname?.[0] || 'C'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{contract.client?.nickname}</span>
                          </div>

                          {/* Show revision notes if they exist */}
                          {contract.revision_notes && (
                            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm font-semibold text-yellow-500">Revision Requested</span>
                              </div>
                              <p className="text-sm text-foreground/80">{contract.revision_notes}</p>
                            </div>
                          )}

                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span>60%</span>
                            </div>
                            <Progress value={60} className="h-2" />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm">
                              <span className="text-muted-foreground">Escrow: </span>
                              <span className="font-semibold text-primary">{formatSOL(contract.agreed_amount || 0)}</span>
                            </span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/messages?user=${contract.client_id}`)}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" /> Message
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelContract(contract.id)}
                                disabled={submittingWork === contract.id}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSubmitWork(contract.id)}
                                disabled={submittingWork === contract.id}
                              >
                                {submittingWork === contract.id ? 'Submitting...' : 'Submit Work'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Submitted Contracts Section */}
                      {activeContracts.filter(c => c.status === 'submitted').length > 0 && (
                        <>
                          <div className="pt-4 mt-4 border-t">
                            <h3 className="text-lg font-semibold mb-4">Submitted (Awaiting Review)</h3>
                          </div>
                          {activeContracts.filter(c => c.status === 'submitted').map((contract) => (
                            <div key={contract.id} className="p-4 rounded-lg border-2 border-blue-500/20 bg-blue-500/5">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold">{contract.job_post?.title || contract.service_post?.title}</h4>
                                <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                  Submitted - Pending Approval
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mb-4">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={contract.client?.avatar} />
                                  <AvatarFallback>{contract.client?.nickname?.[0] || 'C'}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{contract.client?.nickname}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="text-sm">
                                  <p className="text-muted-foreground">Submitted {formatTimeAgo(contract.submitted_at)}</p>
                                  <p className="text-muted-foreground mt-1">Amount: <span className="font-semibold text-primary">{formatSOL(contract.agreed_amount || 0)}</span></p>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-blue-500">
                                  <Clock className="h-4 w-4" />
                                  <span>Waiting for client</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No active contracts
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Completed Jobs */}
              <Card>
                <CardHeader>
                  <CardTitle>Completed Jobs</CardTitle>
                  <CardDescription>Your past projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {completedContracts.map((contract) => (
                      <div key={contract.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <h4 className="font-medium">{contract.job_post?.title || contract.service_post?.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Completed {formatTimeAgo(contract.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-500">+{formatSOL(contract.amount || 0)}</p>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            <span className="text-sm">5.0</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {completedContracts.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No completed jobs yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Earnings Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Earnings</p>
                        <p className="text-3xl font-bold text-green-500">{formatSOL(stats.totalEarnings)}</p>
                      </div>
                      <DollarSign className="h-10 w-10 text-green-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">This Month</p>
                        <p className="text-xl font-bold">125 SOL</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="text-xl font-bold text-orange-500">{formatSOL(stats.pendingPayments)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Wallet</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Connected Wallet</p>
                      <p className="font-mono text-sm">{profile?.wallet_address || 'Not connected'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="gradient" className="flex-1">
                        <Wallet className="h-4 w-4 mr-2" />
                        Withdraw
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <FileText className="h-4 w-4 mr-2" />
                        History
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
