import { tool } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { aiDebug } from "@/lib/ai/debug-log";

const getCityInformationSchema = z.object({
  citySlug: z
    .string()
    .min(1)
    .describe(
      "The slug of the city the user is asking about (e.g., 'marrakech', 'fes', 'chefchaouen', 'essaouira', 'casablanca', 'agadir'). Convert city names to lowercase and replace spaces with hyphens.",
    ),
});

export const getCityInformation = tool({
  description: `Retrieve general travel information, cultural tips, logistics, safety advice, food recommendations, and practical knowledge about a specific Moroccan city.

Use this tool when the user asks about:
- A destination in general ("Tell me about Marrakech", "What is Fès like?")
- Culture, customs, or traditions ("What should I wear in Morocco?", "Ramadan etiquette")
- Food and dining ("What is Moroccan cuisine like?", "Best tagine in Chefchaouen")
- Transport and logistics ("How do I get around Fes?", "Airport transfer Marrakech")
- Safety tips ("Is it safe to travel alone?", "Scams to avoid")
- Etiquette and social norms ("Should I tip?", "Bargaining in souks")
- Any question that is NOT directly about searching, booking, or pricing a specific experience

If the user mentions a city by its common name, convert it to a slug before calling this tool:
- Marrakech → marrakech
- Fès / Fez → fes
- Casablanca → casablanca
- Chefchaouen → chefchaouen
- Essaouira → essaouira
- Merzouga → merzouga
- Rabat → rabat
- Tanger / Tangier → tanger
- Agadir → agadir
- Ouarzazate → ouarzazate
- Imlil → imlil`,
  inputSchema: getCityInformationSchema,
  execute: async ({ citySlug }) => {
    try {
      const supabase = await createClient();
      const requestTraceId = crypto.randomUUID().slice(0, 8);

      aiDebug("tool.getCityInformation", "start", {
        requestTraceId,
        citySlug,
      });

      const { data, error } = await supabase.rpc("get_city_information", {
        p_city_slug: citySlug,
      });

      if (error) {
        aiDebug("tool.getCityInformation", "rpc_error", {
          requestTraceId,
          error: error.message,
        });
        return {
          success: false,
          error: error.message,
          entries: [],
        };
      }

      if (!data || data.length === 0) {
        aiDebug("tool.getCityInformation", "no_entries", {
          requestTraceId,
          citySlug,
        });
        return {
          success: true,
          entries: [],
          message: `No information entries found for city "${citySlug}".`,
        };
      }

      const entries = data.map((entry: any) => ({
        title: entry.title,
        summary: entry.summary,
        content: entry.content,
        priority: entry.priority,
      }));

      aiDebug("tool.getCityInformation", "success", {
        requestTraceId,
        citySlug,
        entryCount: entries.length,
      });

      return {
        success: true,
        entries,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      aiDebug("tool.getCityInformation", "exception", { error: message });
      return {
        success: false,
        error: message,
        entries: [],
      };
    }
  },
});
