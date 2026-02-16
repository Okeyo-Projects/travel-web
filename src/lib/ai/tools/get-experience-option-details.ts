import { tool } from "ai";
import { z } from "zod";
import { aiDebug } from "@/lib/ai/debug-log";
import { createClient } from "@/lib/supabase/server";

const getExperienceOptionDetailsSchema = z.object({
  experience_id: z.string().uuid().describe("Experience UUID"),
  option_type: z
    .enum(["room", "departure", "session"])
    .describe("Target option type to inspect in detail"),
  option_id: z
    .string()
    .uuid()
    .optional()
    .describe("Specific option UUID when known"),
  query: z
    .string()
    .optional()
    .describe(
      'Natural language filter, for example: "lits separes" or "session du matin"',
    ),
  date_from: z
    .string()
    .optional()
    .describe(
      "Optional lower bound date in YYYY-MM-DD for sessions/departures",
    ),
  date_to: z
    .string()
    .optional()
    .describe(
      "Optional end date in YYYY-MM-DD, mainly for room availability context",
    ),
  guests: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Optional guest/participant filter"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(6)
    .optional()
    .default(3)
    .describe("Maximum number of options to return"),
});

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

function tokenize(value: string | undefined): string[] {
  if (!value) return [];
  const normalized = normalizeText(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  return Array.from(new Set(normalized));
}

function scoreByTokens(tokens: string[], parts: string[]): number {
  if (tokens.length === 0) return 0;
  const haystack = parts.map((part) => normalizeText(part));
  const haystackCompact = haystack.map((part) => compactText(part));

  let score = 0;
  for (const token of tokens) {
    const compactToken = compactText(token);
    if (
      haystack.some((part) => part.includes(token)) ||
      haystackCompact.some((part) => part.includes(compactToken))
    ) {
      score += 2;
    }
  }

  if (score > 0 && score >= tokens.length * 2) {
    score += 2;
  }

  return score;
}

function extractIsoDate(query: string | undefined): string | null {
  if (!query) return null;
  const match = query.match(/\b\d{4}-\d{2}-\d{2}\b/);
  return match ? match[0] : null;
}

function hasSeparateBedsHint(query: string | undefined): boolean {
  if (!query) return false;
  const normalized = normalizeText(query);
  return [
    "lits separes",
    "lit separe",
    "twin",
    "separate bed",
    "separate beds",
    "2 lits",
    "two beds",
  ].some((hint) => normalized.includes(hint));
}

function formatTodayIsoDate(): string {
  return new Date().toISOString().split("T")[0];
}

export const getExperienceOptionDetails = tool({
  description: `Fetch detailed info for a specific room, departure, or session.
Use this when the user asks "tell me more about this room/session/departure" or asks for a feature like separate beds.
Supports lookup by option id or natural-language query.`,
  inputSchema: getExperienceOptionDetailsSchema,
  execute: async ({
    experience_id,
    option_type,
    option_id,
    query,
    date_from,
    date_to,
    guests,
    limit,
  }) => {
    try {
      const supabase = await createClient();
      const db = supabase as any;
      const requestTraceId = crypto.randomUUID().slice(0, 8);

      aiDebug("tool.getExperienceOptionDetails", "start", {
        requestTraceId,
        experience_id,
        option_type,
        option_id: option_id || null,
        query: query || null,
        date_from: date_from || null,
        date_to: date_to || null,
        guests: typeof guests === "number" ? guests : null,
        limit,
      });

      const { data: experience, error: experienceError } = await db
        .from("experiences")
        .select("id, title, type, city, region, status")
        .eq("id", experience_id)
        .single();

      if (experienceError || !experience) {
        aiDebug("tool.getExperienceOptionDetails", "experience_not_found", {
          requestTraceId,
          experience_id,
          dbError: experienceError?.message || null,
        });
        return {
          success: false,
          error: "Experience not found",
        };
      }

      if (option_type === "room" && experience.type !== "lodging") {
        aiDebug("tool.getExperienceOptionDetails", "invalid_type_for_room", {
          requestTraceId,
          experienceType: experience.type,
        });
        return {
          success: false,
          error: "Room details are available only for lodging experiences",
        };
      }

      if (option_type === "departure" && experience.type !== "trip") {
        aiDebug(
          "tool.getExperienceOptionDetails",
          "invalid_type_for_departure",
          {
            requestTraceId,
            experienceType: experience.type,
          },
        );
        return {
          success: false,
          error: "Departure details are available only for trip experiences",
        };
      }

      if (option_type === "session" && experience.type !== "activity") {
        aiDebug("tool.getExperienceOptionDetails", "invalid_type_for_session", {
          requestTraceId,
          experienceType: experience.type,
        });
        return {
          success: false,
          error: "Session details are available only for activity experiences",
        };
      }

      const tokens = tokenize(query);

      if (option_type === "room") {
        let resolvedExperience = experience;
        let roomQuery = db
          .from("lodging_room_types")
          .select(
            "id, experience_id, room_type, name, description, equipments, capacity_beds, max_persons, price_cents, total_rooms, photos, extra_fees",
          )
          .eq("experience_id", experience_id)
          .is("deleted_at", null)
          .order("price_cents", { ascending: true });

        if (option_id) {
          roomQuery = roomQuery.eq("id", option_id);
        }

        const { data: roomTypes, error: roomError } = await roomQuery.limit(
          option_id ? 1 : 60,
        );

        if (roomError) {
          aiDebug("tool.getExperienceOptionDetails", "room_lookup_failed", {
            requestTraceId,
            experience_id,
            option_id: option_id || null,
            dbError: roomError.message || null,
          });
          return {
            success: false,
            error: roomError.message || "Failed to fetch room details",
          };
        }

        let effectiveRoomTypes = roomTypes || [];

        // Fallback: if this experience has no room rows, try sibling published lodging
        // entries with the same title (and same city/region when available).
        if (effectiveRoomTypes.length === 0) {
          let siblingQuery = db
            .from("experiences")
            .select("id, title, type, city, region, status")
            .eq("type", "lodging")
            .eq("status", "published")
            .eq("title", experience.title)
            .neq("id", experience_id)
            .limit(8);

          if (experience.city)
            siblingQuery = siblingQuery.eq("city", experience.city);
          if (experience.region)
            siblingQuery = siblingQuery.eq("region", experience.region);

          const { data: siblingExperiences } = await siblingQuery;
          const siblingIds = (siblingExperiences || []).map(
            (item: any) => item.id,
          );

          if (siblingIds.length > 0) {
            const { data: siblingRooms } = await db
              .from("lodging_room_types")
              .select(
                "id, room_type, name, description, equipments, capacity_beds, max_persons, price_cents, total_rooms, photos, extra_fees, experience_id",
              )
              .in("experience_id", siblingIds)
              .is("deleted_at", null)
              .order("price_cents", { ascending: true });

            if (siblingRooms && siblingRooms.length > 0) {
              effectiveRoomTypes = siblingRooms;
              const firstRoomExperienceId = siblingRooms[0].experience_id;
              const fallbackExperience = (siblingExperiences || []).find(
                (item: any) => item.id === firstRoomExperienceId,
              );
              if (fallbackExperience) {
                resolvedExperience = fallbackExperience;
              }
            }
          }
        }

        aiDebug("tool.getExperienceOptionDetails", "room_candidates_loaded", {
          requestTraceId,
          requestedExperienceId: experience_id,
          resolvedExperienceId: resolvedExperience.id,
          candidateCount: effectiveRoomTypes.length,
          usedFallbackExperience: resolvedExperience.id !== experience_id,
        });

        const scoredRooms = effectiveRoomTypes.map((room: any) => {
          const parts = [
            room.name || "",
            room.room_type || "",
            room.description || "",
            ...(Array.isArray(room.equipments) ? room.equipments : []),
          ];

          let score = scoreByTokens(tokens, parts);

          if (
            hasSeparateBedsHint(query) &&
            [room.name, room.room_type, room.description]
              .map((part: string | null) => normalizeText(part || ""))
              .some((part: string) =>
                ["twin", "separe", "separate", "2 lits", "deux lits"].some(
                  (hint) => part.includes(hint),
                ),
              )
          ) {
            score += 4;
          }

          if (typeof guests === "number" && room.max_persons >= guests) {
            score += 1;
          }

          return { room, score };
        });

        const hasQuery = typeof query === "string" && query.trim().length > 0;
        const matchedRooms = hasQuery
          ? scoredRooms.filter(
              (candidate: { score: number }) => candidate.score > 0,
            )
          : scoredRooms;

        const pool = matchedRooms.length > 0 ? matchedRooms : scoredRooms;

        const ranked = pool
          .sort(
            (
              a: { room: any; score: number },
              b: { room: any; score: number },
            ) => {
              if (b.score !== a.score) return b.score - a.score;
              const priceA =
                typeof a.room.price_cents === "number"
                  ? a.room.price_cents
                  : Number.MAX_SAFE_INTEGER;
              const priceB =
                typeof b.room.price_cents === "number"
                  ? b.room.price_cents
                  : Number.MAX_SAFE_INTEGER;
              return priceA - priceB;
            },
          )
          .slice(0, limit);

        const selectedRooms = ranked.map((item: { room: any }) => item.room);

        let availabilityByRoomId: Record<string, number> = {};
        if (date_from && date_to && selectedRooms.length > 0) {
          const availabilityPairs = await Promise.all(
            selectedRooms.map(async (room: any) => {
              const roomExperienceId =
                typeof room.experience_id === "string"
                  ? room.experience_id
                  : experience_id;
              const { data: overlappingBookings } = await db
                .from("bookings")
                .select("id")
                .eq("experience_id", roomExperienceId)
                .eq("room_type_id", room.id)
                .in("status", ["pending", "confirmed", "ongoing"])
                .lte("check_in", date_to)
                .gte("check_out", date_from);

              const bookedRooms = overlappingBookings?.length || 0;
              const totalRooms = room.total_rooms || 1;
              return [room.id, Math.max(0, totalRooms - bookedRooms)] as const;
            }),
          );

          availabilityByRoomId = Object.fromEntries(availabilityPairs);
        }

        const options = selectedRooms.map((room: any) => ({
          id: room.id,
          experience_id:
            typeof room.experience_id === "string"
              ? room.experience_id
              : experience_id,
          name: room.name || room.room_type,
          room_type: room.room_type,
          description: room.description,
          price_mad:
            typeof room.price_cents === "number"
              ? room.price_cents / 100
              : null,
          max_persons: room.max_persons,
          capacity_beds: room.capacity_beds,
          total_rooms: room.total_rooms,
          available_rooms:
            availabilityByRoomId[room.id] !== undefined
              ? availabilityByRoomId[room.id]
              : null,
          equipments: Array.isArray(room.equipments) ? room.equipments : [],
          photos: Array.isArray(room.photos) ? room.photos : [],
          extra_fees: room.extra_fees || null,
        }));

        const hasDirectMatches = matchedRooms.length > 0 || !hasQuery;

        aiDebug("tool.getExperienceOptionDetails", "room_success", {
          requestTraceId,
          requestedExperienceId: experience_id,
          resolvedExperienceId: resolvedExperience.id,
          optionsCount: options.length,
          matchedCount: matchedRooms.length,
          hasDirectMatches,
        });

        return {
          success: true,
          type: "option_details",
          option_type,
          experience: {
            id: resolvedExperience.id,
            title: resolvedExperience.title,
            type: resolvedExperience.type,
            city: resolvedExperience.city,
            region: resolvedExperience.region,
          },
          query: query || null,
          options,
          message:
            options.length === 0
              ? "No room details found for this request."
              : hasDirectMatches
                ? "Room details retrieved successfully."
                : "No exact room match found. Showing closest room options.",
        };
      }

      if (option_type === "departure") {
        let departureQuery = db
          .from("trip_departures")
          .select(
            "id, depart_at, return_at, seats_available, seats_total, price_override_cents, status, guide_notes",
          )
          .eq("experience_id", experience_id)
          .order("depart_at", { ascending: true });

        if (option_id) {
          departureQuery = departureQuery.eq("id", option_id).limit(1);
        } else {
          const baselineDate =
            date_from || extractIsoDate(query) || formatTodayIsoDate();
          departureQuery = departureQuery
            .gte("depart_at", baselineDate)
            .limit(60);
        }

        const { data: departures, error: departureError } =
          await departureQuery;

        if (departureError) {
          aiDebug(
            "tool.getExperienceOptionDetails",
            "departure_lookup_failed",
            {
              requestTraceId,
              experience_id,
              dbError: departureError.message || null,
            },
          );
          return {
            success: false,
            error:
              departureError.message || "Failed to fetch departure details",
          };
        }

        const dateToken = extractIsoDate(query);
        const scored = (departures || []).map((departure: any) => {
          const parts = [
            departure.depart_at || "",
            departure.return_at || "",
            departure.status || "",
            departure.guide_notes || "",
          ];
          let score = scoreByTokens(tokens, parts);

          if (dateToken && typeof departure.depart_at === "string") {
            if (departure.depart_at.startsWith(dateToken)) {
              score += 6;
            }
          }

          if (
            typeof guests === "number" &&
            departure.seats_available >= guests
          ) {
            score += 1;
          }

          return { departure, score };
        });

        const hasQuery = typeof query === "string" && query.trim().length > 0;
        const matched = hasQuery
          ? scored.filter((item: { score: number }) => item.score > 0)
          : scored;
        const pool = matched.length > 0 ? matched : scored;

        const options = pool
          .slice(0, limit)
          .map((item: { departure: any }) => ({
            id: item.departure.id,
            depart_at: item.departure.depart_at,
            return_at: item.departure.return_at,
            seats_available: item.departure.seats_available,
            seats_total: item.departure.seats_total,
            price_mad:
              typeof item.departure.price_override_cents === "number"
                ? item.departure.price_override_cents / 100
                : null,
            status: item.departure.status,
            guide_notes: item.departure.guide_notes,
          }));

        aiDebug("tool.getExperienceOptionDetails", "departure_success", {
          requestTraceId,
          experience_id,
          optionsCount: options.length,
          matchedCount: matched.length,
        });

        return {
          success: true,
          type: "option_details",
          option_type,
          experience: {
            id: experience.id,
            title: experience.title,
            type: experience.type,
            city: experience.city,
            region: experience.region,
          },
          query: query || null,
          options,
          message:
            options.length > 0
              ? "Departure details retrieved successfully."
              : "No departure matched this request.",
        };
      }

      let sessionQuery = db
        .from("activity_sessions")
        .select(
          "id, start_at, end_at, capacity_available, capacity_total, price_override_cents, status, notes",
        )
        .eq("experience_id", experience_id)
        .order("start_at", { ascending: true });

      if (option_id) {
        sessionQuery = sessionQuery.eq("id", option_id).limit(1);
      } else {
        const baselineDate =
          date_from || extractIsoDate(query) || formatTodayIsoDate();
        sessionQuery = sessionQuery.gte("start_at", baselineDate).limit(60);
      }

      const { data: sessions, error: sessionError } = await sessionQuery;

      if (sessionError) {
        aiDebug("tool.getExperienceOptionDetails", "session_lookup_failed", {
          requestTraceId,
          experience_id,
          dbError: sessionError.message || null,
        });
        return {
          success: false,
          error: sessionError.message || "Failed to fetch session details",
        };
      }

      const dateToken = extractIsoDate(query);
      const scored = (sessions || []).map((session: any) => {
        const parts = [
          session.start_at || "",
          session.end_at || "",
          session.status || "",
          session.notes || "",
        ];
        let score = scoreByTokens(tokens, parts);

        if (dateToken && typeof session.start_at === "string") {
          if (session.start_at.startsWith(dateToken)) {
            score += 6;
          }
        }

        if (
          typeof guests === "number" &&
          session.capacity_available >= guests
        ) {
          score += 1;
        }

        return { session, score };
      });

      const hasQuery = typeof query === "string" && query.trim().length > 0;
      const matched = hasQuery
        ? scored.filter((item: { score: number }) => item.score > 0)
        : scored;
      const pool = matched.length > 0 ? matched : scored;

      const options = pool.slice(0, limit).map((item: { session: any }) => ({
        id: item.session.id,
        start_at: item.session.start_at,
        end_at: item.session.end_at,
        capacity_available: item.session.capacity_available,
        capacity_total: item.session.capacity_total,
        price_mad:
          typeof item.session.price_override_cents === "number"
            ? item.session.price_override_cents / 100
            : null,
        status: item.session.status,
        notes: item.session.notes,
      }));

      aiDebug("tool.getExperienceOptionDetails", "session_success", {
        requestTraceId,
        experience_id,
        optionsCount: options.length,
        matchedCount: matched.length,
      });

      return {
        success: true,
        type: "option_details",
        option_type,
        experience: {
          id: experience.id,
          title: experience.title,
          type: experience.type,
          city: experience.city,
          region: experience.region,
        },
        query: query || null,
        options,
        message:
          options.length > 0
            ? "Session details retrieved successfully."
            : "No session matched this request.",
      };
    } catch (error) {
      aiDebug("tool.getExperienceOptionDetails", "exception", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      console.error("Get experience option details error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
