import { Link } from 'react-router-dom'
import { Twitter, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t bg-background/50 backdrop-blur-sm relative z-10">
      <div className="container mx-auto px-4 lg:px-8 py-12 md:py-16">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <span className="text-lg font-bold">P</span>
            </div>
            <span className="text-xl font-bold tracking-tight">PumpWork</span>
          </Link>
          
          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
            The premier Web3 freelance marketplace. Connect, collaborate, and get paid in SOL with secure escrow and zero friction.
          </p>
          
          {/* Social Links */}
          <div className="flex gap-3">
            <a
              href="https://x.com/PumpWorkSOL"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 hover:bg-primary hover:text-white transition-all duration-300 hover:scale-110"
              aria-label="Twitter"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="mailto:pumpwork.org@gmail.com"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 hover:bg-primary hover:text-white transition-all duration-300 hover:scale-110"
              aria-label="Email"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}