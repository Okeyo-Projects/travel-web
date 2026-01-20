"use client"

import * as React from "react"
import { SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ExperienceSort, ExperienceType } from "@/types/experience"

interface FiltersProps {
  activeType: ExperienceType | "all"
  onTypeChange: (type: ExperienceType | "all") => void
  activeSort: ExperienceSort
  onSortChange: (sort: ExperienceSort) => void
  priceRange: [number, number]
  onPriceRangeChange: (range: [number, number]) => void
  showFeaturedOnly: boolean
  onFeaturedChange: (featured: boolean) => void
  onClearFilters: () => void
}

export function Filters({
  activeType,
  onTypeChange,
  activeSort,
  onSortChange,
  priceRange,
  onPriceRangeChange,
  showFeaturedOnly,
  onFeaturedChange,
  onClearFilters,
}: FiltersProps) {
  const [open, setOpen] = React.useState(false)
  
  // Local state for pending changes
  const [localType, setLocalType] = React.useState(activeType)
  const [localSort, setLocalSort] = React.useState(activeSort)
  const [localPrice, setLocalPrice] = React.useState(priceRange)
  const [localFeatured, setLocalFeatured] = React.useState(showFeaturedOnly)

  // Sync local state when sheet opens
  React.useEffect(() => {
    if (open) {
      setLocalType(activeType)
      setLocalSort(activeSort)
      setLocalPrice(priceRange)
      setLocalFeatured(showFeaturedOnly)
    }
  }, [open, activeType, activeSort, priceRange, showFeaturedOnly])

  const handleApply = () => {
    onTypeChange(localType)
    onSortChange(localSort)
    onPriceRangeChange(localPrice)
    onFeaturedChange(localFeatured)
    setOpen(false)
  }

  const activeCount = 
    (activeType !== "all" ? 1 : 0) + 
    (activeSort !== "newest" ? 1 : 0) + 
    (priceRange[0] > 0 || priceRange[1] < 10000 ? 1 : 0) + 
    (showFeaturedOnly ? 1 : 0)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-full">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-5 w-5 rounded-full px-0 flex items-center justify-center bg-primary text-primary-foreground text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Refine your search results
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1 px-6">
          <div className="py-6 space-y-8">
            {/* Experience Type */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Experience Type</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "all", label: "All" },
                  { value: "trip", label: "Trips" },
                  { value: "lodging", label: "Stays" },
                  { value: "activity", label: "Activities" },
                ].map((type) => (
                  <Button
                    key={type.value}
                    variant={localType === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLocalType(type.value as any)}
                    className="rounded-full"
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Sort By</Label>
              <RadioGroup value={localSort} onValueChange={(v) => setLocalSort(v as ExperienceSort)}>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: "newest", label: "Newest" },
                    { value: "popular", label: "Popular" },
                    { value: "rating", label: "Top Rated" },
                    { value: "price_low", label: "Price: Low to High" },
                    { value: "price_high", label: "Price: High to Low" },
                  ].map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`sort-${option.value}`} />
                      <Label htmlFor={`sort-${option.value}`}>{option.label}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Price Range */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Price Range</Label>
                <span className="text-sm text-muted-foreground">
                  ${localPrice[0]} - ${localPrice[1]}
                </span>
              </div>
              <Slider
                min={0}
                max={10000}
                step={50}
                value={localPrice}
                onValueChange={(val) => setLocalPrice(val as [number, number])}
                className="py-4"
              />
            </div>

            {/* Featured Only */}
            <div className="flex items-center justify-between">
              <Label htmlFor="featured-mode" className="text-base font-semibold">
                Featured Only
              </Label>
              <Switch
                id="featured-mode"
                checked={localFeatured}
                onCheckedChange={setLocalFeatured}
              />
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="p-6 border-t mt-auto">
          <Button variant="outline" onClick={() => {
            onClearFilters()
            setOpen(false)
          }} className="flex-1">
            Clear All
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Show Results
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
