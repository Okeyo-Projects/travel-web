// Proxy e2e: feeds the REAL tool output + the REAL new prompt section to the
// production model, to verify the assistant completes the itinerary from its
// own knowledge instead of saying "we don't have data".
import OpenAI from "openai";
import { createPlanTripWithGuideItemsTool } from "@/lib/ai/tools/plan-trip-with-guide-items";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FALLBACK_SECTION = `\n\n## TRIP PLAN CATALOG GAP FALLBACK\nplanTripWithGuideItems reports a coverage field: "full", "partial", or "none".\n- coverage "full": present the structured plan as usual.\n- coverage "partial": the plan UI only shows catalog-backed cards; complete every slot whose item is null in your assistant text from your own travel knowledge so each day reads as a complete itinerary. Call web_search first for current, local, or specific facts.\n- coverage "none": no structured plan is displayed. Write the complete day-by-day itinerary in assistant text from your own travel knowledge, following the requested pace and meals, and call web_search first for current, local, or specific facts.\nIn all gap cases: present completions as local suggestions, never as Okeyo catalog items (no Okeyo prices, ratings, availability, or booking claims for them). NEVER tell the user that the catalog is empty, that data is missing, or that a step has no activity — deliver a confident, complete itinerary in every case.`;

async function getToolOutput(city: string, days: number) {
  const tool = createPlanTripWithGuideItemsTool("fr", null);
  const execute = tool.execute as (i: unknown, o: unknown) => Promise<unknown>;
  return execute(
    {
      city,
      days,
      pace: "balanced",
      budgetScope: "unknown",
      includeRestaurants: true,
      includeBreakfast: true,
      includeLunch: true,
      includeDinner: true,
      includeTransport: true,
    },
    { toolCallId: "call_1", messages: [] },
  );
}

async function askModel(city: string, days: number) {
  const toolOutput = await getToolOutput(city, days);

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini",
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: `You are Okeyo, a Moroccan travel companion. Reply in French.${FALLBACK_SECTION}`,
      },
      { role: "user", content: `Planifie un voyage de ${days} jours à ${city}` },
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "planTripWithGuideItems", arguments: "{}" },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call_1",
        content: JSON.stringify(toolOutput),
      },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? "";
  console.log(`\n=== ${city}: model answer (${text.length} chars) ===`);
  console.log(text.slice(0, 1200));

  const redFlags = [
    /n('| )avons pas/i,
    /aucune (donnée|activité|information)/i,
    /pas (dans|disponible dans) (notre|le) catalogue/i,
    /catalogue (est )?vide/i,
    /données manquantes/i,
    /je n'ai pas/i,
  ];
  const hits = redFlags.filter((re) => re.test(text));
  console.log(
    `\n>>> ${city}: ${hits.length === 0 ? "OK — no 'missing data' language" : `RED FLAGS: ${hits.map((r) => r.source).join(", ")}`}`,
  );
}

await askModel("Chefchaouen", 2);
await askModel("Taghazout", 2);
