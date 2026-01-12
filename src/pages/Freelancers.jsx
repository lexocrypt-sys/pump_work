import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Search, Grid3X3, List, Clock, Star,
  SlidersHorizontal, Loader2, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InitialsAvatar } from '@/components/ui/InitialsAvatar'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useServicePosts } from '@/hooks/useServicePosts'
import { useCategories } from '@/hooks/useCategories'
import { formatSOL, formatTimeAgo, cn, truncateAddress } from '@/lib/utils'
import { allSkills } from '@/data/mockData'

export default function Freelancers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState('grid')
  const [showFilters, setShowFilters] = useState(false)

  // Hooks
  const { services, isLoading, error, fetchServices } = useServicePosts()
  const { categories, isLoading: categoriesLoading } = useCategories()

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '')
  const [selectedSkills, setSelectedSkills] = useState([])
  const [sortBy, setSortBy] = useState('newest')
  const [priceRange, setPriceRange] = useState('')

  // Fetch services on mount and when filters change
  useEffect(() => {
    const filters = {
      status: 'active',
      search: searchQuery || undefined,
      category: selectedCategory || undefined,
      skills: selectedSkills.length > 0 ? selectedSkills : undefined,
      sortBy: sortBy === 'newest' ? 'created_at' : sortBy === 'price-low' ? 'price' : 'created_at',
      sortOrder: sortBy === 'price-low' ? 'asc' : 'desc',
    }

    // Add price range filter
    if (priceRange) {
      const [min, max] = priceRange.split('-').map(Number)
      filters.priceMin = min
      if (max) filters.priceMax = max
      else filters.priceMax = 1000000
    }

    fetchServices(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory, selectedSkills, sortBy, priceRange])

  const toggleSkill = (skill) => {
    setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setSelectedSkills([])
    setPriceRange('')
    setSortBy('newest')
    setSearchParams({})
  }

  const hasActiveFilters = searchQuery || selectedCategory || selectedSkills.length > 0 || priceRange

  return (
    <div className="min-h-screen pt-12 pb-12 relative">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="absolute top-20 left-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8">
        {/* Header & Search */}
        <div className="mb-10">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto mb-8">
            <h1 className="text-4xl font-bold mb-3">Hire <span className="gradient-text">Top Talent</span></h1>
            <p className="text-muted-foreground">Browse freelancers showcasing their skills and services.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col md:flex-row gap-4 max-w-4xl mx-auto bg-background/50 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-lg"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                className="pl-12 border-0 bg-transparent h-12 text-lg focus-visible:ring-0"
                placeholder="Search by skill, service, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className={cn("h-12 px-6 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 lg:hidden", showFilters && "border-primary/50 bg-primary/5")}
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" /> Filters
                {hasActiveFilters && <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary">{[selectedCategory, ...selectedSkills, priceRange].filter(Boolean).length}</Badge>}
              </Button>
              <Button className="h-12 px-8 rounded-xl gradient-bg shadow-lg shadow-primary/20">Search</Button>
            </div>
          </motion.div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 p-4 text-sm text-red-500 bg-red-500/10 rounded-lg border border-red-500/20">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Filters Sidebar */}
          <aside className={cn("w-full lg:w-[280px] flex-shrink-0", !showFilters && "hidden lg:block")}>
            <Card className="glass-card lg:sticky lg:top-24">
              <CardContent className="p-5 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Filters</h3>
                  {hasActiveFilters && <Button variant="link" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-primary px-0">Clear all</Button>}
                </div>
                <Separator className="bg-border/50" />

                <div className="space-y-3">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={selectedCategory || undefined} onValueChange={setSelectedCategory} disabled={categoriesLoading}>
                    <SelectTrigger className="bg-background/50 border-white/10">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Price Range (SOL)</label>
                  <Select value={priceRange || undefined} onValueChange={setPriceRange}>
                    <SelectTrigger className="bg-background/50 border-white/10"><SelectValue placeholder="Any Price" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-0.5">0 - 0.5</SelectItem>
                      <SelectItem value="0.5-3">0.5 - 3</SelectItem>
                      <SelectItem value="3-10">3 - 10</SelectItem>
                      <SelectItem value="10-1000000">10+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {allSkills.slice(0, 10).map(skill => (
                      <Badge
                        key={skill}
                        variant={selectedSkills.includes(skill) ? 'default' : 'outline'}
                        className="cursor-pointer transition-all hover:border-primary/50"
                        onClick={() => toggleSkill(skill)}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Services Feed */}
          <div className="flex-1 w-full min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <p className="text-muted-foreground">
                {isLoading ? (
                  <span>Loading services...</span>
                ) : (
                  <span><span className="text-foreground font-bold">{services.length}</span> freelancer{services.length !== 1 ? 's' : ''} available</span>
                )}
              </p>
              <div className="flex items-center gap-3">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[160px] bg-background/50 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="price-low">Lowest Price</SelectItem>
                    <SelectItem value="rating">Top Rated</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex bg-background/50 border border-white/10 rounded-lg p-1">
                  <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8 rounded-md" onClick={() => setView('grid')}><Grid3X3 className="h-4 w-4" /></Button>
                  <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8 rounded-md" onClick={() => setView('list')}><List className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : services.length > 0 ? (
              <motion.div layout className={cn(view === 'grid' ? 'grid md:grid-cols-2 gap-5' : 'space-y-4')}>
                {services.map((service, i) => (
                  <motion.div key={service.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link to={`/freelancers/${service.id}`} className="block h-full group">
                      <Card className="glass-card h-full hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-6 flex flex-col h-full">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-3 flex-1">
                              <InitialsAvatar nickname={service.freelancer?.nickname || 'User'} size="lg" />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">{service.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">{service.freelancer?.nickname || 'Unknown'}</span>
                                  {service.freelancer?.wallet_address && (
                                    <span className="text-xs text-primary/70">({truncateAddress(service.freelancer.wallet_address)})</span>
                                  )}
                                  {service.freelancer?.rating > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                      <span className="text-xs">{service.freelancer.rating.toFixed(1)}</span>
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{service.description}</p>

                          <div className="flex flex-wrap gap-2 mb-4">
                            {service.skills?.slice(0, 3).map(skill => (
                              <Badge key={skill} variant="secondary" className="font-normal text-xs bg-muted/50">{skill}</Badge>
                            ))}
                            {service.skills?.length > 3 && (
                              <Badge variant="secondary" className="font-normal text-xs bg-muted/50">+{service.skills.length - 3}</Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                            <div className="text-sm text-muted-foreground">
                              <Clock className="inline h-3 w-3 mr-1" />
                              {service.delivery_time}
                            </div>
                            <div className="text-right">
                              <span className="block text-xs text-muted-foreground capitalize">{service.price_type}</span>
                              <span className="block font-bold text-lg text-primary">{formatSOL(service.price)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="text-center py-20">
                <div className="bg-muted/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold">No freelancers found</h3>
                <p className="text-muted-foreground mt-2">Try adjusting your filters or search terms.</p>
                <Button variant="outline" className="mt-6" onClick={clearFilters}>Clear Filters</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
