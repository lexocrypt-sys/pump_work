import { motion } from 'framer-motion'
import { Copy, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useState } from 'react'

export default function Token() {
  const [copied, setCopied] = useState(false)
  const contractAddress = '0x0000000000000000000000000000000000000000' // Placeholder - replace with actual CA

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Contract Address Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <Card className="glass-card border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground mb-2">CA:</h2>
                  <p className="text-lg font-mono font-semibold break-all">{contractAddress}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Token Information */}
        <div className="space-y-8">
          {/* Section 1: Locked Tokens */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="glass-card border-primary/20">
              <CardContent className="p-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  500 million tokens are locked for 1 month
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  To ensure stability and long-term commitment, 500 million tokens are locked in a smart contract for a period of 1 month. This demonstrates our dedication to the project's success and protects token holders.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Section 2: Fee Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="glass-card border-primary/20">
              <CardContent className="p-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-6">
                  Fees generated From token
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <span className="text-lg font-medium">Building a second liquidity pool</span>
                    <span className="text-xl font-bold text-primary">30%</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <span className="text-lg font-medium">Marketing fund</span>
                    <span className="text-xl font-bold text-primary">25%</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <span className="text-lg font-medium">Goes back to the token</span>
                    <span className="text-xl font-bold text-primary">20%</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <span className="text-lg font-medium">Goes back to the team</span>
                    <span className="text-xl font-bold text-primary">25%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Section 3: Token Holding Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="glass-card border-primary/20">
              <CardContent className="p-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-6">
                  Token Holding Benefits
                </h2>
                <div className="space-y-6">
                  <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xl font-bold text-primary">1K</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Access Freelancers</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Holding 1K tokens will make you able to access freelancers on the platform.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xl font-bold text-primary">10K</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Become a Freelancer</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Holding 10K tokens will make you be able to become a freelancer on the platform.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xl font-bold text-primary">50K</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Boosted Freelancer</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Holding 50K tokens will make you a boosted freelancer with enhanced visibility and priority placement.
                        </p>
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
