import type { ExperienceListItem } from "@/types/experience"

export const EXPERIENCES: ExperienceListItem[] = [
  {
    id: "tokyo-nightfood",
    title: "Tokyo Skytree Afterglow & Night Food Crawl",
    short_description: "Glide from the Skytree observatory into hidden izakayas with a local food curator.",
    city: "Tokyo",
    region: "Kanto",
    type: "activity",
    thumbnail_url: "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?auto=format&fit=crop&w=1200&q=80",
    avg_rating: 4.93,
    reviews_count: 322,
    host: {
      id: "h1",
      name: "Aiko Nakamura",
      avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
      verified: true,
    },
    trip: {
      price_cents: 12900,
      currency: "USD",
      duration_days: null,
      duration_hours: 3.5,
    },
    lodging: null,
  },
  {
    id: "santorini-sailing",
    title: "Santorini Sunset Sail & Secret Cove Dinner",
    short_description: "Sail around the caldera with a private chef on board, ending with a bioluminescent swim.",
    city: "Santorini",
    region: "South Aegean",
    type: "trip",
    thumbnail_url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    avg_rating: 4.88,
    reviews_count: 198,
    host: {
      id: "h2",
      name: "Nikos Florakis",
      avatar_url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80",
      verified: true,
    },
    trip: {
      price_cents: 28900,
      currency: "USD",
      duration_days: null,
      duration_hours: 5,
    },
    lodging: null,
  },
  {
    id: "patagonia-helitrek",
    title: "Heli-Trek Over Patagonian Ice Fields",
    short_description: "Land on remote blue ice and trek with glacier guides, including drone footage package.",
    city: "El Chaltén",
    region: "Santa Cruz",
    type: "activity",
    thumbnail_url: "https://images.unsplash.com/photo-1526481280695-3c469c011b4d?auto=format&fit=crop&w=1200&q=80",
    avg_rating: 4.97,
    reviews_count: 87,
    host: {
      id: "h3",
      name: "María Torres",
      avatar_url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&q=80",
      verified: true,
    },
    trip: {
      price_cents: 64900,
      currency: "USD",
      duration_days: null,
      duration_hours: 8,
    },
    lodging: null,
  },
  {
    id: "bali-villa",
    title: "Eco-Bamboo Villa with Private Waterfall",
    short_description: "Immerse yourself in nature in this sustainable bamboo villa overlooking a private waterfall.",
    city: "Ubud",
    region: "Bali",
    type: "lodging",
    thumbnail_url: "https://images.unsplash.com/photo-1572097662444-658d35d978a3?auto=format&fit=crop&w=1200&q=80",
    avg_rating: 4.95,
    reviews_count: 412,
    host: {
      id: "h4",
      name: "Wayan Sudra",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
      verified: true,
    },
    trip: null,
    lodging: {
      min_stay_nights: 2,
      price_cents: 18000,
      currency: "USD",
    },
  },
  {
    id: "kyoto-tea",
    title: "Ancient Tea Ceremony in Hidden Temple",
    short_description: "Private tea ceremony with a 15th-generation tea master in a temple not open to the public.",
    city: "Kyoto",
    region: "Kansai",
    type: "activity",
    thumbnail_url: "https://images.unsplash.com/photo-1545048702-79362596cdc9?auto=format&fit=crop&w=1200&q=80",
    avg_rating: 4.99,
    reviews_count: 56,
    host: {
      id: "h5",
      name: "Kenji Tanaka",
      avatar_url: null,
      verified: true,
    },
    trip: {
      price_cents: 8500,
      currency: "USD",
      duration_days: null,
      duration_hours: 2,
    },
    lodging: null,
  }
]

export const COLLECTIONS = [
  {
    id: "c1",
    title: "Hidden Gems of Europe",
    description: "Discover secret spots away from the crowds.",
    imageUrl: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80",
    href: "/offers/hidden-gems"
  },
  {
    id: "c2",
    title: "Eco-Friendly Stays",
    description: "Sustainable lodging that doesn't compromise on luxury.",
    imageUrl: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80",
    href: "/offers/eco-friendly"
  },
  {
    id: "c3",
    title: "Culinary Journeys",
    description: "Taste the world with our curated food tours.",
    imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
    href: "/offers/culinary"
  },
  {
    id: "c4",
    title: "Adventure Awaits",
    description: "For those who seek the thrill of the unknown.",
    imageUrl: "https://images.unsplash.com/photo-1533692328991-08159ff19fca?auto=format&fit=crop&w=800&q=80",
    href: "/offers/adventure"
  }
]
