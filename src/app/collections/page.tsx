"use client"

import { Loader2 } from "lucide-react"
import { CollectionCard } from "@/components/collection-card"
import { useCategories } from "@/hooks/use-categories"
import { resolveStorageUrl } from "@/utils/functions"

export default function CollectionsPage() {
  const { data: categories, isLoading, isError } = useCategories()

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Nos Collections</h1>
        <p className="text-muted-foreground max-w-2xl">
          Explorez nos sélections thématiques pour trouver l'inspiration.
        </p>
      </div>

      {isError ? (
        <div className="text-center py-24 text-red-500">
          Une erreur est survenue lors du chargement des collections.
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories?.map((category) => (
            <CollectionCard
              key={category.id}
              title={category.title.fr || category.title.en}
              description={category.description || undefined}
              imageUrl={resolveStorageUrl(category.asset)}
              href={`/explore?category=${category.id}`} // We need to handle this query param in Explore page
            />
          ))}
        </div>
      )}
    </div>
  )
}
