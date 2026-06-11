import { tool } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { aiDebug } from "@/lib/ai/debug-log";

const getTopicInformationSchema = z.object({
  topicSlug: z
    .string()
    .min(1)
    .describe(
      "The slug of the topic the user is asking about (e.g., 'culture', 'food', 'transport', 'safety', 'visa', 'weather', 'etiquette', 'shopping', 'health').",
    ),
});

export const getTopicInformation = tool({
  description: `Retrieve general travel knowledge about a specific topic: culture, food, transport, safety, visa requirements, weather, etiquette, shopping, or health information about Morocco.

Use this tool when the user asks about:
- General topics not tied to a specific city ("What is Moroccan culture like?", "Tell me about food in Morocco")
- Safety advice ("Is Morocco safe?", "What should I watch out for?")
- Transport and logistics ("How do I get around Morocco?", "Train vs bus")
- Visa and entry requirements ("Do I need a visa?", "What documents?")
- Weather and seasons ("Best time to visit?", "What to pack?")
- Etiquette and customs ("What should I wear?", "Tipping customs")
- Food and dining ("What is Moroccan cuisine?", "Dietary restrictions")
- Health advice ("Vaccinations?", "Travel insurance?")

If the user mentions a topic by name, convert it to a slug before calling this tool:
- Culture / Traditions / Customs → culture
- Food / Dining / Cuisine / Restaurants → food
- Transport / Getting around / Trains / Buses → transport
- Safety / Security / Scams → safety
- Visa / Entry / Passport / Documents → visa
- Weather / Climate / Seasons / Temperature → weather
- Etiquette / Manners / Dress code / Ramadan → etiquette
- Shopping / Souks / Markets / Crafts → shopping
- Health / Vaccines / Insurance / Medical → health`,
  inputSchema: getTopicInformationSchema,
  execute: async ({ topicSlug }) => {
    try {
      const supabase = await createClient();
      const requestTraceId = crypto.randomUUID().slice(0, 8);

      aiDebug("tool.getTopicInformation", "start", {
        requestTraceId,
        topicSlug,
      });

      const { data, error } = await supabase.rpc("get_topic_information", {
        p_topic_slug: topicSlug,
      });

      if (error) {
        aiDebug("tool.getTopicInformation", "rpc_error", {
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
        aiDebug("tool.getTopicInformation", "no_entries", {
          requestTraceId,
          topicSlug,
        });
        return {
          success: true,
          entries: [],
          message: `No information entries found for topic "${topicSlug}".`,
        };
      }

      const entries = data.map((entry: any) => ({
        title: entry.title,
        content: entry.content,
        priority: entry.priority,
      }));

      aiDebug("tool.getTopicInformation", "success", {
        requestTraceId,
        topicSlug,
        entryCount: entries.length,
      });

      return {
        success: true,
        entries,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      aiDebug("tool.getTopicInformation", "exception", { error: message });
      return {
        success: false,
        error: message,
        entries: [],
      };
    }
  },
});
