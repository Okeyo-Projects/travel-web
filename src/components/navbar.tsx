"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Navbar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-start gap-1">
          <div className="flex flex-col items-center">
             <span className="font-bold text-3xl tracking-tight leading-none">okeyo</span>
             <span className="text-[0.6rem] font-bold tracking-[0.2em] text-primary uppercase leading-none self-end">TRAVEL</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-4 ml-0.5"></div>
        </Link>

        {/* Desktop Nav - Only the two requested buttons */}
        <nav className="flex items-center gap-4">
          <Link href="/collections">
            <Button variant="ghost" className="font-medium">
              Nos collections
            </Button>
          </Link>
          <Link href="/agent">
            <Button variant="ghost" className="font-medium">
              Assistant IA
            </Button>
          </Link>
          <Link href="/explore">
            <Button 
              className={cn(
                "rounded-lg px-6 font-medium transition-colors",
                "bg-black text-white hover:bg-black/80 border-0"
              )}
            >
              Explorer nos trésors
            </Button>
          </Link>
          <Link href="/offers">
            <Button 
              variant="outline"
              className={cn(
                "rounded-lg px-6 font-medium transition-colors",
                "bg-white text-black border border-input hover:bg-accent"
              )}
            >
              Nos offres du moment
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
