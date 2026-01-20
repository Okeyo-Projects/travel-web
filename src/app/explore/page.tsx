"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ExperienceCard } from "@/components/experience-card"
import { Filters } from "@/components/filters"
import { EXPERIENCES } from "@/lib/mock-data"
import type { ExperienceType, ExperienceSort } from "@/types/experience"

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeType, setActiveType] = useState<ExperienceType | "all">("all")
  const [activeSort, setActiveSort] = useState<ExperienceSort>("newest")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false)

  const filteredExperiences = useMemo(() => {
    let result = [...EXPERIENCES]

    // Filter by Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (exp) =>
          exp.title.toLowerCase().includes(query) ||
          exp.city.toLowerCase().includes(query) ||
          exp.short_description.toLowerCase().includes(query)
      )
    }

    // Filter by Type
    if (activeType !== "all") {
      result = result.filter((exp) => exp.type === activeType)
    }

    // Filter by Price
    result = result.filter((exp) => {
      const price = (exp.trip?.price_cents ?? exp.lodging?.price_cents ?? 0) / 100
      return price >= priceRange[0] && price <= priceRange[1]
    })

    // Filter by Featured (Mock logic: rating > 4.9)
    if (showFeaturedOnly) {
      result = result.filter((exp) => (exp.avg_rating ?? 0) > 4.9)
    }

    // Sort
    switch (activeSort) {
      case "price_low":
        result.sort((a, b) => {
          const priceA = (a.trip?.price_cents ?? a.lodging?.price_cents ?? 0)
          const priceB = (b.trip?.price_cents ?? b.lodging?.price_cents ?? 0)
          return priceA - priceB
        })
        break
      case "price_high":
        result.sort((a, b) => {
          const priceA = (a.trip?.price_cents ?? a.lodging?.price_cents ?? 0)
          const priceB = (b.trip?.price_cents ?? b.lodging?.price_cents ?? 0)
          return priceB - priceA
        })
        break
      case "rating":
        result.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))
        break
      case "popular":
        result.sort((a, b) => (b.reviews_count ?? 0) - (a.reviews_count ?? 0))
        break
      default: // newest (mock: keep original order or shuffle)
        break
    }

    return result
  }, [searchQuery, activeType, activeSort, priceRange, showFeaturedOnly])

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Explorer nos trésors</h1>
        <p className="text-muted-foreground max-w-2xl">
          Découvrez des expériences uniques et des lieux d'exception pour votre prochain voyage.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center sticky top-20 z-30 bg-background/95 backdrop-blur py-4 -mx-4 px-4 border-b md:border-none md:bg-transparent md:backdrop-blur-none md:static md:p-0">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une destination, une activité..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full bg-background"
          />
        </div>
        <Filters
          activeType={activeType}
          onTypeChange={setActiveType}
          activeSort={activeSort}
          onSortChange={setActiveSort}
          priceRange={priceRange}
          onPriceRangeChange={setPriceRange}
          showFeaturedOnly={showFeaturedOnly}
          onFeaturedChange={setShowFeaturedOnly}
          onClearFilters={() => {
            setActiveType("all")
            setActiveSort("newest")
            setPriceRange([0, 10000])
            setShowFeaturedOnly(false)
            setSearchQuery("")
          }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredExperiences.map((experience) => (
          <ExperienceCard key={experience.id} experience={experience} />
        ))}
      </div>

      {filteredExperiences.length === 0 && (
        <div className="text-center py-24">
          <p className="text-muted-foreground text-lg">Aucun résultat trouvé pour votre recherche.</p>
          <button 
            onClick={() => {
              setSearchQuery("")
              setActiveType("all")
              setPriceRange([0, 10000])
            }}
            className="text-primary hover:underline mt-2"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </div>
  )
}
