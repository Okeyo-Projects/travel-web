import type { GuideItemChatCardData } from "@/types/guide-items";
import { GuideItemCardPreviewClient } from "./GuideItemCardPreviewClient";

export const metadata = {
  title: "Guide Item Card Preview",
};

const dummyItem: GuideItemChatCardData = {
  id: "preview-guide-item-1",
  slug: "justbeldi-marrakech",
  kind_slug: "restaurant",
  subtype: "cuisine-beldi",
  city_slug: "marrakech",
  title: "JUSTBELDI",
  summary: "Restaurant gastronomique marocain authentique à Marrakech",
  description:
    'JUSTBELDI est spécialisé dans la cuisine gastronomique marocaine authentique. La vraie cuisine "beldi" comme à la maison.',
  address_text: "Jnane Awrad, Imm. 25 — Mag. 40 Rdc, Marrakech 40000",
  lat: 31.6295,
  lng: -7.9811,
  author_name: "Okeyo Travel",
  author_avatar_url: null,
  agence_name: "Beldi Collection",
  contact_email: "hello@justbeldi.ma",
  contact_phones: ["+212 6 12 34 56 78", "+212 5 24 00 11 22"],
  hero_image_url:
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
  gallery_urls: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=400&q=80",
  ],
  video_url:
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  video_gallery_url: [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  ],
  menu_image_urls: [
    "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
  ],
  rating_avg: 4.6,
  reviews_count: 10,
  price_range: "50–150 MAD",
  currency: "MAD",
  payment:
    "Cash accepted on-site. Card and bank transfer available for group bookings.",
  tags: ["Halal", "Options vég.", "Famille", "Parking gratuit"],
  source_platforms: ["instagram", "google_maps"],
  source_url: "https://www.instagram.com/justbeldimarrakech",
  verified: true,
  reviews: [
    {
      name: "Salma B.",
      user_image: null,
      note: 4.9,
      content:
        "One of the rare places in Marrakech where the food still feels homemade. The tanjia and starters were exceptional, and the staff explained every dish with care.",
      created_at: "2026-05-28",
      source: "Google",
      tags: ["Authentic", "Warm service", "Great for dinner"],
    },
    {
      name: "Youssef A.",
      user_image: null,
      note: 4.7,
      content:
        "The menu is focused and local rather than touristy. Portions were fair, flavors were balanced, and the room had a calm, intimate atmosphere.",
      created_at: "2026-05-11",
      source: "Instagram",
      tags: ["Local cuisine", "Quiet atmosphere"],
    },
    {
      name: "Clara M.",
      user_image: null,
      note: 4.5,
      content:
        "A strong recommendation if you want a refined beldi experience without losing the traditional feel. Ask the team what is best that day.",
      created_at: "2026-04-19",
      source: "Google",
      tags: ["Refined", "Recommended"],
    },
  ],
  metadata: {
    opening_hours: "Daily, 12:00 - 23:00",
  },
};

export default function GuideItemCardPreviewPage() {
  // if (process.env.NODE_ENV !== "development") {
  //   notFound();
  // }

  return (
    <main className="min-h-screen p-6 bg-background">
      <div className="max-w-md mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Guide Item Card Preview</h1>
          <p className="text-sm text-muted-foreground">
            Development-only preview of the chat guide-item card.
          </p>
        </div>

        <GuideItemCardPreviewClient item={dummyItem} />
      </div>
    </main>
  );
}
