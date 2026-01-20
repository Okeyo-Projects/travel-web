"use client"

import { CollectionCard } from "@/components/collection-card"
import { ExperienceCard } from "@/components/experience-card"
import { COLLECTIONS, EXPERIENCES } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"

export default function OffersPage() {
  const specialDeals = EXPERIENCES.filter((_, i) => i % 2 === 0) // Mock logic

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Nos offres du moment</h1>
        <p className="text-muted-foreground max-w-2xl">
          Profitez de nos sélections exclusives et de nos meilleures offres pour voyager malin.
        </p>
      </div>

      {/* Featured Collections Carousel */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Collections à la Une</h2>
        <Carousel className="w-full">
          <CarouselContent className="-ml-4">
            {COLLECTIONS.map((collection) => (
              <CarouselItem key={collection.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                <CollectionCard
                  title={collection.title}
                  description={collection.description}
                  imageUrl={collection.imageUrl}
                  href={collection.href}
                  className="h-[400px]"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      </section>

      {/* Special Deals Grid */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Offres Spéciales</h2>
          <Badge variant="destructive" className="animate-pulse">
            <Clock className="w-3 h-3 mr-1" />
            Temps limité
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {specialDeals.map((experience) => (
            <div key={experience.id} className="relative">
              <div className="absolute top-2 right-2 z-10">
                <Badge className="bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg">
                  -20%
                </Badge>
              </div>
              <ExperienceCard experience={experience} />
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter / Alert Section */}
      <section className="bg-primary/5 rounded-3xl p-8 md:p-12 text-center space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold">Ne manquez aucune offre</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Inscrivez-vous à notre newsletter pour recevoir nos meilleures offres et inspirations de voyage directement dans votre boîte mail.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input 
            type="email" 
            placeholder="Votre email" 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            S'inscrire
          </button>
        </div>
      </section>
    </div>
  )
}
