import { Routes, Route } from 'react-router-dom'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Landing from '@/pages/Landing'
import Jobs from '@/pages/Jobs'
import JobDetail from '@/pages/JobDetail'
import PostJob from '@/pages/PostJob'
import Freelancers from '@/pages/Freelancers'
import FreelancerDetail from '@/pages/FreelancerDetail'
import PostService from '@/pages/PostService'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Profile from '@/pages/Profile'
import Messages from '@/pages/Messages'
import Token from '@/pages/Token'
import ClientDashboard from '@/pages/dashboard/ClientDashboard'
import FreelancerDashboard from '@/pages/dashboard/FreelancerDashboard'
import DevDashboard from '@/pages/dashboard/DevDashboard'
import { useScrollToHash } from '@/hooks/useScrollToHash'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function App() {
  useScrollToHash()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/freelancers" element={<Freelancers />} />
          <Route path="/freelancers/:id" element={<FreelancerDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/token" element={<Token />} />

          {/* Protected routes - require authentication */}
          <Route path="/post-job" element={
            <ProtectedRoute>
              <PostJob />
            </ProtectedRoute>
          } />
          <Route path="/post-service" element={
            <ProtectedRoute>
              <PostService />
            </ProtectedRoute>
          } />
          <Route path="/messages" element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          } />
          <Route path="/messages/:conversationId" element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          } />

          {/* Dashboard routes - protected with role guards */}
          <Route path="/dashboard/client" element={
            <ProtectedRoute>
              <ClientDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/freelancer" element={
            <ProtectedRoute>
              <FreelancerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/dev" element={
            <ProtectedRoute>
              <DevDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/admin" element={
            <ProtectedRoute>
              <DevDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
