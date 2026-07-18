"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AppLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  GUIDE_ITEM_KINDS,
  type GuideItemKind,
  type GuideItemSearchFilters,
} from "@/types/guide-items";

interface CityOption {
  slug: string;
  name: string;
}

interface GuideSearchFiltersProps {
  filters: GuideItemSearchFilters;
  onChange: (filters: GuideItemSearchFilters) => void;
  onSubmit: () => void;
  cities: CityOption[];
  locale: AppLocale;
  isLoading?: boolean;
  className?: string;
}

export function GuideSearchFilters({
  filters,
  onChange,
  onSubmit,
  cities,
  isLoading,
  className,
}: GuideSearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const selectedKinds = new Set(filters.kinds ?? []);

  const toggleKind = (kind: GuideItemKind) => {
    const next = new Set(selectedKinds);
    if (next.has(kind)) {
      next.delete(kind);
    } else {
      next.add(kind);
    }
    onChange({ ...filters, kinds: Array.from(next) });
  };

  const clearFilters = () => {
    onChange({
      query: "",
      citySlug: undefined,
      kinds: undefined,
      limit: filters.limit,
      minSimilarity: filters.minSimilarity,
    });
  };

  const hasActiveFilters =
    filters.query || filters.citySlug || filters.kinds?.length;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un restaurant, un musée, un spa..."
            value={filters.query ?? ""}
            onChange={(event) =>
              onChange({ ...filters, query: event.target.value })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSubmit();
              }
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.citySlug ?? "all"}
          onValueChange={(value) =>
            onChange({
              ...filters,
              citySlug: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Toutes les villes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les villes</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city.slug} value={city.slug}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAdvanced((prev) => !prev)}
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filtres
        </Button>

        <Button type="button" onClick={onSubmit} disabled={isLoading}>
          {isLoading ? "Recherche..." : "Rechercher"}
        </Button>
      </div>

      {showAdvanced ? (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div>
            <Label className="mb-2 block text-sm font-medium">Catégories</Label>
            <div className="flex flex-wrap gap-2">
              {GUIDE_ITEM_KINDS.map((kind) => {
                const active = selectedKinds.has(kind);
                return (
                  <Button
                    key={kind}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => toggleKind(kind)}
                  >
                    {kind}
                  </Button>
                );
              })}
            </div>
          </div>

          {hasActiveFilters ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                <X className="w-4 h-4 mr-2" />
                Réinitialiser
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
