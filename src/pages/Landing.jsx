import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Briefcase, Shield, Users, Wallet,
  CheckCircle2, Code, Palette, PenTool, TrendingUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { formatSOL, formatTimeAgo } from '@/lib/utils'

// Optimized Animation Variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" }
}

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.1 }
  }
}

export default function Landing() {
  // Real platform stats state
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalFreelancers: 0,
    totalVolume: 0,
    avgResponseTime: '< 24h'
  })
  const [featuredJobs, setFeaturedJobs] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch real platform stats from Supabase
  useEffect(() => {
    async function fetchPlatformStats() {
      try {
        // Fetch active jobs count
        const { count: jobCount } = await supabase
          .from('job_posts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open')

        // Fetch freelancers count
        const { count: freelancerCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('user_type', 'freelancer')

        // Fetch total volume from completed contracts
        const { data: volumeData } = await supabase
          .from('contracts')
          .select('agreed_amount')
          .eq('status', 'completed')

        const totalVolume = volumeData?.reduce((sum, contract) =>
          sum + (parseFloat(contract.agreed_amount) || 0), 0
        ) || 0

        // Fetch featured/recent jobs with client info
        const { data: jobsData } = await supabase
          .from('job_posts')
          .select(`
            *,
            client:profiles!job_posts_client_id_fkey(nickname, wallet_address)
          `)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(3)

        // Fetch categories with job counts
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('*, job_count:job_posts(count)')
          .limit(10)

        setStats({
          activeJobs: jobCount || 0,
          totalFreelancers: freelancerCount || 0,
          totalVolume: totalVolume,
          avgResponseTime: '< 24h'
        })

        setFeaturedJobs(jobsData || [])

        // Format categories with counts
        const formattedCategories = (categoriesData || []).map(cat => ({
          id: cat.id,
          name: cat.name,
          icon: cat.icon || 'Code',
          count: cat.job_count?.[0]?.count || 0
        }))
        setCategories(formattedCategories)

      } catch (error) {
        console.error('Error fetching platform stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPlatformStats()
  }, [])

  // Format volume display
  const formatVolume = (volume) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`
    }
    return volume.toFixed(1)
  }

  return (
    <div className="overflow-hidden w-full relative">
      {/* Background Mesh Gradient - Fixed for Performance */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-purple-500/10 via-transparent to-transparent opacity-50 dark:opacity-30" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute top-40 -left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-[80px]" />
        <div className="absolute inset-0 bg-grid-small-black/[0.05] dark:bg-grid-small-white/[0.05]" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 lg:pt-16 lg:pb-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <Badge variant="outline" className="mb-6 px-4 py-1.5 border-primary/30 bg-primary/5 text-primary rounded-full">
              ✨ The Future of Work is On-Chain
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
              Find work. Get paid. <br />
              <span className="gradient-text">Instantly in SOL.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Join the decentralized freelance marketplace. Zero intermediaries,
              secure escrow payments, and verifiable reputation on Solana.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="h-12 px-8 rounded-full gradient-bg text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all" asChild>
                <Link to="/jobs">
                  Find Work <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 rounded-full text-lg border-2 hover:bg-muted/50" asChild>
                <Link to="/post-job">Post a Job</Link>
              </Button>
            </div>

            {/* Platform Stats - Real Data */}
            <div className="mt-16 pt-8 border-t border-border/50 grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: 'Active Jobs', value: stats.activeJobs.toLocaleString() },
                { label: 'Freelancers', value: stats.totalFreelancers.toLocaleString() },
                { label: 'Volume (SOL)', value: `${formatVolume(stats.totalVolume)}+` },
                { label: 'Avg Time', value: stats.avgResponseTime },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</span>
                  <span className="text-sm text-muted-foreground font-medium">{stat.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Jobs - Real Data */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">Featured Opportunities</h2>
              <p className="text-muted-foreground">Top-tier projects looking for talent right now.</p>
            </div>
            <Button variant="ghost" className="hidden md:flex group" asChild>
              <Link to="/jobs">View all jobs <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" /></Link>
            </Button>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
            className="grid md:grid-cols-3 gap-6"
          >
            {featuredJobs.length > 0 ? (
              featuredJobs.map((job) => (
                <motion.div key={job.id} variants={fadeInUp}>
                  <Link to={`/jobs/${job.id}`} className="block h-full">
                    <Card className="h-full glass-card hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-sm font-medium leading-none">{job.client?.nickname || 'Anonymous'}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(job.created_at)}</p>
                          </div>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">New</Badge>
                        </div>

                        <h3 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">{job.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{job.description}</p>

                        <div className="flex flex-wrap gap-2 mb-6">
                          {(job.skills || []).slice(0, 3).map(skill => (
                            <Badge key={skill} variant="secondary" className="font-normal text-xs">{skill}</Badge>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                          <div className="text-sm text-muted-foreground capitalize">{job.job_type || 'Fixed'}</div>
                          <div className="text-right">
                            <span className="block font-bold text-lg text-primary">{formatSOL(job.budget)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))
            ) : (
              // Skeleton loading or empty state
              !isLoading && (
                <div className="col-span-3 text-center py-12 text-muted-foreground">
                  No jobs posted yet. <Link to="/post-job" className="text-primary hover:underline">Post the first one!</Link>
                </div>
              )
            )}
          </motion.div>

          <div className="mt-8 text-center md:hidden">
            <Button variant="outline" className="w-full" asChild>
              <Link to="/jobs">View All Jobs</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Categories Grid - Real Data */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Browse by Category</h2>
            <p className="text-muted-foreground">Find work that matches your expertise</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categories.length > 0 ? (
              categories.map((cat) => {
                const icons = { Code, Palette, PenTool, Users, TrendingUp, 'FileCode': Code, 'Megaphone': TrendingUp, 'Video': Palette, 'BarChart3': TrendingUp }
                const Icon = icons[cat.icon] || Briefcase
                return (
                  <Link key={cat.id} to={`/jobs?category=${cat.id}`} className="group">
                    <Card className="h-full hover:bg-muted/50 transition-colors border-dashed hover:border-solid hover:border-primary/50">
                      <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                          <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="font-medium text-sm">{cat.name}</h3>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })
            ) : (
              // Default categories if none in database
              [
                { name: 'Development', icon: Code },
                { name: 'Design', icon: Palette },
                { name: 'Writing', icon: PenTool },
                { name: 'Marketing', icon: TrendingUp },
                { name: 'Consulting', icon: Users },
              ].map((cat, i) => (
                <Link key={i} to={`/jobs?category=${cat.name.toLowerCase()}`} className="group">
                  <Card className="h-full hover:bg-muted/50 transition-colors border-dashed hover:border-solid hover:border-primary/50">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <cat.icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-medium text-sm">{cat.name}</h3>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">How PumpWork <span className="gradient-text">Works</span></h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Connect, collaborate, and get paid instantly on the Solana blockchain
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="relative"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 relative">
                  <span className="text-3xl font-bold">1</span>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Users className="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3">Create Your Profile</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Sign up as a client or freelancer. Connect your Solana wallet to get started with secure, on-chain transactions.
                </p>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 relative">
                  <span className="text-3xl font-bold">2</span>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Briefcase className="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3">Post or Find Jobs</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Clients post projects with budgets in SOL. Freelancers browse opportunities and apply with proposals.
                </p>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 relative">
                  <span className="text-3xl font-bold">3</span>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Wallet className="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3">Work & Get Paid</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Smart contract escrow protects both parties. Once work is approved, funds release instantly to your wallet.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Additional Benefits */}
          <div className="mt-16 grid md:grid-cols-2 gap-6">
            <Card className="glass-card border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Secure Escrow</h4>
                    <p className="text-sm text-muted-foreground">
                      Funds are held in a smart contract until work is completed and approved. No disputes, no chargebacks.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Zero Fees</h4>
                    <p className="text-sm text-muted-foreground">
                      Powered by Solana's fast and cheap transactions. Pay pennies in fees, not percentages.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-20 bg-background relative overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Built for the <span className="gradient-text">Web3 Era</span>
              </h2>
              <div className="space-y-8">
                {[
                  { icon: Wallet, title: 'Instant Crypto Payments', desc: 'No bank delays. Get paid in SOL/USDC immediately upon job approval.' },
                  { icon: Shield, title: 'Smart Contract Escrow', desc: 'Funds are locked on-chain. Zero risk of non-payment for completed work.' },
                  { icon: CheckCircle2, title: 'Verifiable Reputation', desc: 'Your work history and ratings are stored on-chain. Own your reputation.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Decorative Elements */}
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 blur-3xl rounded-full" />

              <Card className="relative z-10 border-2 border-muted/50 shadow-2xl bg-card/80 backdrop-blur-xl">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-8 border-b pb-4">
                    <div>
                      <p className="font-bold">Payment Released</p>
                      <p className="text-xs text-muted-foreground">Smart Contract Interaction</p>
                    </div>
                    <Badge variant="success" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Confirmed</Badge>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="font-bold text-lg">15.5 SOL</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Gas Fee</span>
                      <span className="font-mono text-xs">&lt; 0.00001 SOL</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Time</span>
                      <span className="text-sm">~ 400ms</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button className="w-full gradient-bg" disabled>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Transaction Complete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden bg-primary text-primary-foreground text-center py-16 px-4 md:px-16">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to start building?</h2>
              <p className="text-primary-foreground/80 text-lg mb-8">
                Join thousands of developers and founders building the future of the internet on PumpWork.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="xl" variant="secondary" className="bg-white text-primary hover:bg-white/90 font-bold shadow-xl" asChild>
                  <Link to="/register">Create Account</Link>
                </Button>
                <Button size="xl" variant="outline" className="border-white/30 hover:bg-white/10 text-white hover:text-white bg-transparent" asChild>
                  <Link to="/jobs">Browse Jobs</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}