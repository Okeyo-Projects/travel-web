import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface CollectionCardProps {
  title: string
  description?: string
  imageUrl?: string | null
  href: string
  className?: string
}

export function CollectionCard({ title, description, imageUrl, href, className }: CollectionCardProps) {
  return (
    <Link href={href} className={cn("block group relative overflow-hidden rounded-xl", className)}>
      <div className="aspect-[3/4] w-full relative">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform transition-transform duration-300 group-hover:-translate-y-2">
          <h3 className="font-bold text-xl mb-1">{title}</h3>
          {description && (
            <p className="text-sm text-white/80 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
              {description}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
