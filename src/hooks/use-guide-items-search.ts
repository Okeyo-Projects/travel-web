"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSiteI18n } from "@/components/site/site-i18n";
import { mapGuideItemSearchRowToChatCardData } from "@/lib/guide-items";
import type {
  GuideItemChatCardData,
  GuideItemSearchFilters,
  GuideItemSearchResponse,
  GuideItemSearchResult,
} from "@/types/guide-items";

interface GuideItemSearchState {
  results: GuideItemSearchResult[];
  items: GuideItemChatCardData[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

async function searchGuideItems(
  filters: GuideItemSearchFilters,
): Promise<GuideItemSearchResult[]> {
  const response = await fetch("/api/guide-items/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(filters),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      body.error ?? `Search request failed with status ${response.status}`,
    );
  }

  const json = (await response.json()) as GuideItemSearchResponse;
  return json.results ?? [];
}

/**
 * React Query hook for guide-item semantic search.
 *
 * - Sends the query to `/api/guide-items/search`, where the server generates an
 *   embedding via OpenAI and calls the `search_guide_items` Supabase RPC.
 * - Results are ordered by `relevance_score` on the database side.
 * - The query is only enabled when at least one meaningful filter is provided.
 */
export function useGuideItemsSearch(
  filters: GuideItemSearchFilters = {},
): GuideItemSearchState {
  const { locale } = useSiteI18n();
  const hasQuery = Boolean(filters.query?.trim());
  const hasCity = Boolean(filters.citySlug?.trim());
  const hasKinds = Boolean(filters.kinds && filters.kinds.length > 0);
  const enabled = hasQuery || hasCity || hasKinds;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["guide-items-search", filters],
    queryFn: () => searchGuideItems(filters),
    staleTime: 1000 * 60 * 2,
    enabled,
  });

  const items = useMemo(
    () =>
      (data ?? []).map((row) => mapGuideItemSearchRowToChatCardData(row, locale)),
    [data, locale],
  );

  return {
    results: data ?? [],
    items,
    isLoading,
    isError,
    error: error ?? null,
  };
}
