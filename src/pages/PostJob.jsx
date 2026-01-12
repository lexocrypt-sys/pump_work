import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Lock, Briefcase, FileText, DollarSign, Eye, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/AuthContext'
import { useJobPosts } from '@/hooks/useJobPosts'
import { useCategories } from '@/hooks/useCategories'
import { cn, formatSOL } from '@/lib/utils'

const steps = [
  { id: 1, title: 'Basics', icon: FileText },
  { id: 2, title: 'Details', icon: Briefcase },
  { id: 3, title: 'Budget', icon: DollarSign },
  { id: 4, title: 'Preview', icon: Eye }
]

export default function PostJob() {
  const navigate = useNavigate()
  const { profile, isAuthenticated, isClient } = useAuth()
  const { createJob } = useJobPosts()
  const { categories, isLoading: categoriesLoading } = useCategories()

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    skills: [],
    budgetType: 'fixed',
    budget: '',
    deadline: ''
  })
  const [skillInput, setSkillInput] = useState('')

  // Only clients can post jobs
  const canPost = isAuthenticated && isClient

  const update = (k, v) => setFormData(p => ({ ...p, [k]: v }))

  const addSkill = (s) => {
    if (s && !formData.skills.includes(s)) {
      update('skills', [...formData.skills, s])
      setSkillInput('')
    }
  }

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Please enter a job title')
      return false
    }
    if (!formData.category) {
      setError('Please select a category')
      return false
    }
    if (!formData.description.trim()) {
      setError('Please enter a job description')
      return false
    }
    if (!formData.budget || parseFloat(formData.budget) <= 0) {
      setError('Please enter a valid budget')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    setError('')

    if (!validateForm()) {
      setCurrentStep(1) // Go back to first step with error
      return
    }

    setIsSubmitting(true)

    try {
      const jobData = {
        client_id: profile.id,
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        skills: formData.skills,
        budget: parseFloat(formData.budget),
        budget_type: formData.budgetType,
        deadline: formData.deadline || null,
      }

      // Add timeout to prevent hanging
      const createJobPromise = createJob(jobData)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Job creation timed out. Please try again.')), 10000)
      )

      const { data, error: createError } = await Promise.race([createJobPromise, timeoutPromise])

      if (createError) throw createError

      // Success! Navigate to dashboard
      navigate('/dashboard/client')
      // Note: setIsSubmitting(false) not needed here as component will unmount on navigation
    } catch (err) {
      console.error('Error creating job:', err)
      setError(err.message || 'Failed to create job. Please try again.')
      setIsSubmitting(false)
    }
  }

  // Note: Auth is handled by ProtectedRoute and RoleGuard in App.jsx

  return (
    <div className="min-h-screen pt-12 pb-12 bg-background">
      <div className="container mx-auto px-4 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Cancel
        </Button>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -z-10" />
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-primary -z-10 transition-all duration-500"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />
            {steps.map((s) => (
              <div key={s.id} className={cn("flex flex-col items-center gap-2 bg-background px-2")}>
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                    currentStep >= s.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted text-muted-foreground bg-background"
                  )}
                >
                  {currentStep > s.id ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                </div>
                <span className={cn("text-xs font-medium", currentStep >= s.id ? "text-foreground" : "text-muted-foreground")}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 p-4 text-sm text-red-500 bg-red-500/10 rounded-lg border border-red-500/20">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <Card>
            <CardContent className="p-8 space-y-6">
              {currentStep === 1 && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Job Title *</label>
                    <Input
                      placeholder="e.g. Senior Solana Smart Contract Engineer"
                      value={formData.title}
                      onChange={e => update('title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Category *</label>
                    <Select value={formData.category} onValueChange={v => update('category', v)} disabled={categoriesLoading}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Description *</label>
                    <Textarea
                      placeholder="Detailed job description..."
                      rows={6}
                      value={formData.description}
                      onChange={e => update('description', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Skills</label>
                    <div className="flex gap-2">
                      <Input
                        value={skillInput}
                        onChange={e => setSkillInput(e.target.value)}
                        placeholder="Add skill (e.g. React, Solana)"
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill(skillInput))}
                      />
                      <Button onClick={() => addSkill(skillInput)} variant="outline">Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.skills.map(s => (
                        <Badge
                          key={s}
                          variant="secondary"
                          onClick={() => update('skills', formData.skills.filter(i => i !== s))}
                          className="cursor-pointer hover:bg-destructive/20"
                        >
                          {s} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Deadline (Optional)</label>
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={e => update('deadline', e.target.value)}
                    />
                  </div>
                </>
              )}

              {currentStep === 3 && (
                <div className="grid gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => update('budgetType', 'fixed')}
                      className={cn(
                        "p-4 border-2 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors",
                        formData.budgetType === 'fixed' ? "border-primary bg-primary/10" : "border-muted"
                      )}
                    >
                      <div className="font-bold">Fixed Price</div>
                      <div className="text-xs text-muted-foreground">Pay for deliverables</div>
                    </div>
                    <div
                      onClick={() => update('budgetType', 'hourly')}
                      className={cn(
                        "p-4 border-2 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors",
                        formData.budgetType === 'hourly' ? "border-primary bg-primary/10" : "border-muted"
                      )}
                    >
                      <div className="font-bold">Hourly Rate</div>
                      <div className="text-xs text-muted-foreground">Pay for time</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Budget (SOL) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">◎</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-8"
                        placeholder="100.00"
                        value={formData.budget}
                        onChange={e => update('budget', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="bg-muted/30 p-6 rounded-xl space-y-4">
                  <h2 className="text-2xl font-bold">{formData.title || 'Untitled Job'}</h2>
                  <div className="flex gap-2">
                    <Badge>{formData.category || 'No category'}</Badge>
                    <Badge variant="outline">{formData.budget ? formatSOL(parseFloat(formData.budget)) : '0 SOL'}</Badge>
                    <Badge variant="outline" className="capitalize">{formData.budgetType}</Badge>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap">{formData.description || 'No description provided.'}</p>
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
                    </div>
                  )}
                  {formData.deadline && (
                    <p className="text-sm text-muted-foreground">Deadline: {formData.deadline}</p>
                  )}
                </div>
              )}

              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(p => Math.max(1, p - 1))}
                  disabled={currentStep === 1 || isSubmitting}
                >
                  Back
                </Button>
                {currentStep < 4 ? (
                  <Button onClick={() => setCurrentStep(p => p + 1)} className="gradient-bg">
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={isSubmitting} className="gradient-bg">
                    {isSubmitting ? 'Posting...' : 'Post Job'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
