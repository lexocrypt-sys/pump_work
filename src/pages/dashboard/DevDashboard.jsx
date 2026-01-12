import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users,
  Briefcase,
  DollarSign,
  TrendingUp,
  Activity,
  Shield,
  Settings,
  Database,
  Server,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  Lock,
  Loader2,
  MessageSquare,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InitialsAvatar } from '@/components/ui/InitialsAvatar'
import { formatSOL, formatTimeAgo, cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useAdminStats } from '@/hooks/useAdminStats'

export default function DevDashboard() {
  const navigate = useNavigate()
  const { profile, isAuthenticated, isAdmin } = useAuth()
  const { stats, isLoading, fetchPlatformStats, fetchRecentActivity, fetchAllUsers } = useAdminStats()
  const [activeTab, setActiveTab] = useState('overview')
  const [recentActivity, setRecentActivity] = useState(null)
  const [allUsers, setAllUsers] = useState([])

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadDashboardData()
    }
  }, [isAuthenticated, isAdmin])

  const loadDashboardData = async () => {
    await fetchPlatformStats()
    const { data: activity } = await fetchRecentActivity(10)
    setRecentActivity(activity)

    if (activeTab === 'users') {
      const { data: users } = await fetchAllUsers()
      setAllUsers(users || [])
    }
  }

  useEffect(() => {
    if (activeTab === 'users' && allUsers.length === 0) {
      fetchAllUsers().then(({ data }) => setAllUsers(data || []))
    }
  }, [activeTab])

  // Admin-only access
  if (!isAuthenticated) {
    navigate('/login')
    return null
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full glass-card border-red-500/20">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Admin Dashboard</h2>
            <p className="text-muted-foreground mb-6">
              This dashboard is restricted to administrators only.
            </p>
            <Button variant="outline" onClick={() => navigate('/dashboard/client')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-12 pb-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Platform statistics and management</p>
          </div>
          <Badge variant="outline" className="h-8">
            <Activity className="h-3 w-3 mr-1" />
            Live Data
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-8 w-8 text-blue-500" />
                <Badge variant="secondary">{stats.users.total}</Badge>
              </div>
              <div className="text-2xl font-bold">{stats.users.total}</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
              <div className="mt-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clients:</span>
                  <span>{stats.users.clients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Freelancers:</span>
                  <span>{stats.users.freelancers}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Briefcase className="h-8 w-8 text-green-500" />
                <Badge variant="secondary">{stats.jobs.total}</Badge>
              </div>
              <div className="text-2xl font-bold">{stats.jobs.total}</div>
              <div className="text-sm text-muted-foreground">Job Posts</div>
              <div className="mt-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Open:</span>
                  <span>{stats.jobs.open}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed:</span>
                  <span>{stats.jobs.completed}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="h-8 w-8 text-purple-500" />
                <Badge variant="secondary">{stats.contracts.total}</Badge>
              </div>
              <div className="text-2xl font-bold">{stats.contracts.total}</div>
              <div className="text-sm text-muted-foreground">Contracts</div>
              <div className="mt-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active:</span>
                  <span>{stats.contracts.active}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed:</span>
                  <span>{stats.contracts.completed}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="h-8 w-8 text-orange-500" />
                <Badge variant="secondary">{stats.messages.total}</Badge>
              </div>
              <div className="text-2xl font-bold">{stats.messages.total}</div>
              <div className="text-sm text-muted-foreground">Messages</div>
              <div className="mt-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reviews:</span>
                  <span>{stats.reviews.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Rating:</span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    {stats.reviews.averageRating}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Applications & Services */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Platform Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Applications</span>
                    <Badge>{stats.applications.total}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pending Applications</span>
                    <Badge variant="secondary">{stats.applications.pending}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Service Posts</span>
                    <Badge>{stats.services.total}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active Services</span>
                    <Badge variant="secondary">{stats.services.active}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Operational</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Realtime</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Authentication</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Active</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Manage platform users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      Loading users...
                    </div>
                  ) : (
                    allUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <InitialsAvatar nickname={user.nickname} size="sm" />
                          <div>
                            <div className="font-medium">{user.nickname}</div>
                            <div className="text-xs text-muted-foreground capitalize">{user.user_type}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {user.rating > 0 && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                              {user.rating.toFixed(1)}
                            </div>
                          )}
                          <Badge variant="outline" className="capitalize">
                            {user.user_type}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Users */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Recent Signups</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity?.recentUsers.map((user) => (
                      <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <InitialsAvatar nickname={user.nickname} size="xs" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{user.nickname}</div>
                          <div className="text-xs text-muted-foreground capitalize">{user.user_type}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimeAgo(user.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Jobs */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Recent Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity?.recentJobs.map((job) => (
                      <div key={job.id} className="p-3 rounded-lg border bg-background/50 hover:border-primary/30 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-medium text-sm line-clamp-1">{job.title}</div>
                          <Badge variant="outline" className="capitalize text-xs">
                            {job.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          by {job.client?.nickname} • {formatTimeAgo(job.created_at)}
                        </div>
                      </div>
                    ))}
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
