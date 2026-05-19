import { createClient } from "@/lib/supabase/server";

type DestinationInventory = {
  city: string;
  region: string | null;
  total: number;
  lodging: number;
  trip: number;
  activity: number;
};

function incrementInventoryType(
  inventory: DestinationInventory,
  type: string | null | undefined,
) {
  if (type === "lodging") {
    inventory.lodging += 1;
  } else if (type === "trip") {
    inventory.trip += 1;
  } else if (type === "activity") {
    inventory.activity += 1;
  }
}

function formatInventoryLine(inventory: DestinationInventory): string {
  const location = inventory.region
    ? `${inventory.city}, ${inventory.region}`
    : inventory.city;
  const parts = [
    inventory.lodging ? `${inventory.lodging} lodging` : null,
    inventory.trip ? `${inventory.trip} trip` : null,
    inventory.activity ? `${inventory.activity} activity` : null,
  ].filter(Boolean);

  return `- ${location}: ${inventory.total} published experience(s) (${parts.join(", ") || "no typed inventory"})`;
}

/**
 * Load the FULL catalog of all published experiences with complete details.
 * Since the catalog is small (~20 experiences), we load everything so the AI
 * can act as an expert concierge who knows every property, room, and activity.
 */
export async function loadCatalogContext(
  locale: string = "fr",
): Promise<string> {
  try {
    const supabase = await createClient();
    const db = supabase as any;

    // Fetch all published experiences
    const { data: experiences, error: expError } = await db
      .from("experiences")
      .select(`
        id,
        title,
        short_description,
        description,
        type,
        city,
        region,
        avg_rating,
        reviews_count,
        cancellation_policy,
        languages,
        host_id,
        thumbnail_url
      `)
      .eq("status", "published")
      .not("title", "ilike", "%test%")
      .order("type")
      .order("city");

    if (expError || !experiences || experiences.length === 0) {
      return "\n\n## Catalog: No experiences currently available.";
    }

    const expIds = experiences.map((e: any) => e.id);

    // Fetch all related data in parallel
    const [
      { data: rooms },
      { data: tripDetails },
      { data: departures },
      { data: activitySessions },
      { data: hosts },
      { data: amenities },
    ] = await Promise.all([
      db
        .from("lodging_room_types")
        .select(
          "id, experience_id, room_type, name, description, capacity_beds, max_persons, price_cents, equipments",
        )
        .in("experience_id", expIds)
        .is("deleted_at", null)
        .order("price_cents", { ascending: true }),
      db
        .from("experiences_trip")
        .select(
          "experience_id, price_cents, duration_days, duration_hours, itinerary",
        )
        .in("experience_id", expIds),
      db
        .from("trip_departures")
        .select(
          "experience_id, depart_at, seats_total, seats_available, status",
        )
        .in("experience_id", expIds)
        .eq("status", "scheduled")
        .gte("depart_at", new Date().toISOString())
        .order("depart_at", { ascending: true }),
      db
        .from("activity_sessions")
        .select(
          "experience_id, start_at, capacity_total, capacity_available, status",
        )
        .in("experience_id", expIds)
        .eq("status", "scheduled")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true }),
      db
        .from("hosts")
        .select("id, name, bio, avg_rating")
        .in("id", experiences.map((e: any) => e.host_id).filter(Boolean)),
      db
        .from("experience_amenities")
        .select("experience_id, amenities(key, label_fr, category)")
        .in("experience_id", expIds),
    ]);

    // Build lookup maps
    const roomsByExp: Record<string, any[]> = {};
    for (const r of rooms || []) {
      if (!roomsByExp[r.experience_id]) roomsByExp[r.experience_id] = [];
      roomsByExp[r.experience_id].push(r);
    }

    const tripByExp: Record<string, any> = {};
    for (const t of tripDetails || []) {
      tripByExp[t.experience_id] = t;
    }

    const departuresByExp: Record<string, any[]> = {};
    for (const d of departures || []) {
      if (!departuresByExp[d.experience_id])
        departuresByExp[d.experience_id] = [];
      departuresByExp[d.experience_id].push(d);
    }

    const sessionsByExp: Record<string, any[]> = {};
    for (const s of activitySessions || []) {
      if (!sessionsByExp[s.experience_id]) sessionsByExp[s.experience_id] = [];
      sessionsByExp[s.experience_id].push(s);
    }

    const hostsMap: Record<string, any> = {};
    for (const h of hosts || []) {
      hostsMap[h.id] = h;
    }

    const amenitiesByExp: Record<string, string[]> = {};
    for (const a of amenities || []) {
      if (!amenitiesByExp[a.experience_id])
        amenitiesByExp[a.experience_id] = [];
      const labelKey =
        locale === "en"
          ? "label_en"
          : locale === "ar"
            ? "label_ar"
            : "label_fr";
      const label =
        a.amenities?.[labelKey] || a.amenities?.label_fr || a.amenities?.key;
      if (label) amenitiesByExp[a.experience_id].push(label);
    }

    const inventoryByLocation = new Map<string, DestinationInventory>();
    const lodgingCities = new Map<string, number>();
    const lodgingRegions = new Map<string, number>();

    for (const exp of experiences) {
      const city = (exp.city || "").trim() || "Unknown city";
      const region = (exp.region || "").trim() || null;
      const key = `${city.toLowerCase()}|${(region || "").toLowerCase()}`;
      const inventory = inventoryByLocation.get(key) || {
        city,
        region,
        total: 0,
        lodging: 0,
        trip: 0,
        activity: 0,
      };

      inventory.total += 1;
      incrementInventoryType(inventory, exp.type);
      inventoryByLocation.set(key, inventory);

      if (exp.type === "lodging") {
        lodgingCities.set(city, (lodgingCities.get(city) || 0) + 1);
        if (region) {
          lodgingRegions.set(region, (lodgingRegions.get(region) || 0) + 1);
        }
      }
    }

    const inventoryList = Array.from(inventoryByLocation.values()).sort(
      (a, b) => {
        if (a.city !== b.city) return a.city.localeCompare(b.city);
        return (a.region || "").localeCompare(b.region || "");
      },
    );

    const lodgingCityList = Array.from(lodgingCities.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([city, count]) => `${city} (${count})`);

    const lodgingRegionList = Array.from(lodgingRegions.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([region, count]) => `${region} (${count})`);

    // Build the full catalog text
    const lines: string[] = [];
    lines.push(`\n\n## FULL CATALOG — You know EVERY experience by heart`);
    lines.push(
      `Total: **${experiences.length} published experiences**. You have complete knowledge of each one.\n`,
    );
    lines.push(
      `## OKEYO DESTINATION INVENTORY — only these locations have published inventory`,
    );
    lines.push(...inventoryList.map(formatInventoryLine));
    lines.push(
      `Available lodging cities only: ${lodgingCityList.join(", ") || "none"}.`,
    );
    lines.push(
      `Available lodging regions only: ${lodgingRegionList.join(", ") || "none"}.`,
    );
    lines.push(
      `If a city/region/locality is not listed here or in the individual experience titles/descriptions below, Okeyo has no published inventory there. Do not suggest unlisted nearby cities as Okeyo alternatives.`,
    );
    lines.push(
      `Never suggest Rabat, Salé, Casablanca, Fès, Agadir, or any other city unless it appears in this inventory with published inventory.`,
    );
    lines.push("");

    for (const exp of experiences) {
      const host = hostsMap[exp.host_id];
      const city = (exp.city || "").trim();
      const region = (exp.region || "").trim();
      const location = region ? `${city}, ${region}` : city;

      lines.push(`### ${exp.title.trim()}`);
      lines.push(`- **ID:** ${exp.id}`);
      lines.push(`- **Type:** ${exp.type}`);
      lines.push(`- **Location:** ${location}`);
      if (host) lines.push(`- **Host:** ${host.name}`);
      if (exp.avg_rating)
        lines.push(
          `- **Rating:** ${exp.avg_rating}/5 (${exp.reviews_count || 0} avis)`,
        );
      if (exp.short_description)
        lines.push(`- **Description:** ${exp.short_description.trim()}`);

      // Amenities
      const expAmenities = amenitiesByExp[exp.id];
      if (expAmenities && expAmenities.length > 0) {
        lines.push(`- **Équipements:** ${expAmenities.join(", ")}`);
      }

      // Room types for lodging
      if (exp.type === "lodging") {
        const expRooms = roomsByExp[exp.id];
        if (expRooms && expRooms.length > 0) {
          lines.push(`- **Chambres (${expRooms.length} types):**`);
          for (const room of expRooms) {
            const priceMad = room.price_cents ? room.price_cents / 100 : "?";
            const equipList =
              Array.isArray(room.equipments) && room.equipments.length > 0
                ? ` | Équipements: ${room.equipments.join(", ")}`
                : "";
            lines.push(
              `  - **${room.name || room.room_type}**: ${priceMad} MAD/nuit, ${room.capacity_beds || "?"} lits, max ${room.max_persons || "?"} pers.${equipList}`,
            );
            if (room.description) {
              lines.push(`    ${room.description.trim().substring(0, 150)}`);
            }
          }
        } else {
          lines.push(`- **Chambres:** Aucune chambre configurée`);
        }
      }

      // Trip details
      if (exp.type === "trip") {
        const trip = tripByExp[exp.id];
        if (trip) {
          const priceMad = trip.price_cents ? trip.price_cents / 100 : "?";
          lines.push(`- **Prix:** ${priceMad} MAD/personne`);
          if (trip.duration_days)
            lines.push(`- **Durée:** ${trip.duration_days} jour(s)`);
        }
        const expDepartures = departuresByExp[exp.id];
        if (expDepartures && expDepartures.length > 0) {
          lines.push(
            `- **Prochains départs:** ${expDepartures
              .slice(0, 3)
              .map(
                (d: {
                  depart_at: string;
                  seats_available: number;
                  seats_total: number;
                }) =>
                  `${new Date(d.depart_at).toLocaleDateString(locale === "en" ? "en-US" : locale === "ar" ? "ar-MA" : "fr-FR")} (${d.seats_available}/${d.seats_total})`,
              )
              .join(", ")}`,
          );
        }
      }

      // Activity details
      if (exp.type === "activity") {
        const trip = tripByExp[exp.id]; // activities also use experiences_trip for pricing
        if (trip) {
          const priceMad = trip.price_cents ? trip.price_cents / 100 : "?";
          lines.push(`- **Prix:** ${priceMad} MAD/personne`);
          if (trip.duration_hours)
            lines.push(`- **Durée:** ${trip.duration_hours} heure(s)`);
        }
        const expSessions = sessionsByExp[exp.id];
        if (expSessions && expSessions.length > 0) {
          lines.push(
            `- **Prochaines sessions:** ${expSessions
              .slice(0, 3)
              .map(
                (s: {
                  start_at: string;
                  capacity_available: number;
                  capacity_total: number;
                }) =>
                  `${new Date(s.start_at).toLocaleDateString(locale === "en" ? "en-US" : locale === "ar" ? "ar-MA" : "fr-FR")} (${s.capacity_available}/${s.capacity_total})`,
              )
              .join(", ")}`,
          );
        }
      }

      lines.push("");
    }

    lines.push(`## How to Use This Catalog`);
    lines.push(
      `- You KNOW every experience. Use this knowledge to make smart recommendations.`,
    );
    lines.push(
      `- When searching, use the experience IDs and exact city/region names from above.`,
    );
    lines.push(
      `- Use the region filter only for stored administrative regions. For local destinations like "Imlil", "Ouirgane", or "Lala Takerkousst", use the exact catalog city/locality when it exists; otherwise keep the locality in the query text.`,
    );
    lines.push(
      `- Keep the type filter empty for broad "experiences", "options", or "what to do" searches; only set type when the user explicitly asks for lodging, trips, or activities.`,
    );
    lines.push(
      `- For named experience requests, search by the exact or partial name first so the chat can show the matching card before asking for dates, destination, or room choices.`,
    );
    lines.push(
      `- You can discuss specific room types, prices, capacities, and equipments from memory.`,
    );
    lines.push(
      `- If a location is NOT in the catalog, be honest and suggest what you DO have.`,
    );
    lines.push(
      `- For unsupported locations, suggest only destinations from the OKEYO DESTINATION INVENTORY above. Do not use general geography to propose nearby cities that have no Okeyo inventory.`,
    );

    return lines.join("\n");
  } catch (error) {
    console.error("Failed to load catalog context:", error);
    return "";
  }
}
