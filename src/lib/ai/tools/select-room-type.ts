import { tool } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const selectRoomTypeSchema = z.object({
  experience_id: z.string().uuid().describe("Lodging experience UUID"),
  guests: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Number of guests to filter suitable room types"),
  max_options: z
    .number()
    .int()
    .min(1)
    .max(8)
    .optional()
    .default(6)
    .describe("Maximum number of room types to return"),
  language: z
    .enum(["fr", "en", "ar"])
    .optional()
    .default("fr")
    .describe("Language for prompt text"),
});

type SupportedLanguage = "fr" | "en" | "ar";

function buildQuestion(language: SupportedLanguage, title: string): string {
  if (language === "en") {
    return `Which room do you prefer for ${title}?`;
  }
  if (language === "ar") {
    return `ما نوع الغرفة المفضل لديك في ${title}؟`;
  }
  return `Quelle chambre préférez-vous pour ${title} ?`;
}

function buildReplyText(
  language: SupportedLanguage,
  roomName: string,
  roomTypeId: string,
): string {
  if (language === "en") {
    return `I choose the room "${roomName}" (room_type_id: ${roomTypeId}) for 1 room.`;
  }
  if (language === "ar") {
    return `أختار الغرفة "${roomName}" (room_type_id: ${roomTypeId}) لغرفة واحدة.`;
  }
  return `Je choisis la chambre "${roomName}" (room_type_id: ${roomTypeId}) pour 1 chambre.`;
}

export const selectRoomType = tool({
  description: `Fetch room types for a lodging experience and present clickable room choices.
Use this before createBookingIntent when the user must choose a specific room type.`,
  inputSchema: selectRoomTypeSchema,
  execute: async ({ experience_id, guests, max_options, language }) => {
    try {
      const supabase = await createClient();
      const db = supabase as any;

      const { data: experience, error: experienceError } = await db
        .from("experiences")
        .select("id, title, type, city, region, status")
        .eq("id", experience_id)
        .single();

      if (experienceError || !experience) {
        return {
          success: false,
          error: "Experience not found",
        };
      }

      if (experience.type !== "lodging") {
        return {
          success: false,
          error: "Room selection is available only for lodging experiences",
        };
      }

      const { data: roomTypes, error: roomsError } = await db
        .from("lodging_room_types")
        .select(
          "id, room_type, name, description, price_cents, max_persons, capacity_beds, equipments",
        )
        .eq("experience_id", experience_id)
        .is("deleted_at", null)
        .order("price_cents", { ascending: true });

      if (roomsError || !roomTypes || roomTypes.length === 0) {
        return {
          success: false,
          error: "No room types available for this experience",
        };
      }

      const filteredByGuests =
        typeof guests === "number"
          ? roomTypes.filter((room: any) => room.max_persons >= guests)
          : roomTypes;

      const effectiveRooms =
        filteredByGuests.length > 0 ? filteredByGuests : roomTypes;

      const rooms = effectiveRooms.slice(0, max_options).map((room: any) => {
        const roomName = room.name || room.room_type;
        return {
          room_type_id: room.id,
          name: roomName,
          room_type: room.room_type,
          description: room.description,
          price_mad: room.price_cents ? room.price_cents / 100 : null,
          max_persons: room.max_persons,
          capacity_beds: room.capacity_beds,
          equipments: Array.isArray(room.equipments)
            ? room.equipments.slice(0, 5)
            : [],
          reply_text: buildReplyText(language, roomName, room.id),
        };
      });

      return {
        success: true,
        type: "room_type_selector",
        question: buildQuestion(language, experience.title),
        experience: {
          id: experience.id,
          title: experience.title,
          city: experience.city,
          region: experience.region,
        },
        guest_filter_applied: typeof guests === "number",
        rooms,
        allow_free_text: true,
      };
    } catch (error) {
      console.error("Select room type error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
