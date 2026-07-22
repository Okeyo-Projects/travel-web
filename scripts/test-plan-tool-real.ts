// Direct execution of the REAL planTripWithGuideItems tool code (via bun,
// which resolves "@/" tsconfig aliases) against the production database.
import { createPlanTripWithGuideItemsTool } from "@/lib/ai/tools/plan-trip-with-guide-items";

type PlanOutput = {
  success: boolean;
  coverage?: string;
  catalog_gap_instructions?: string | null;
  days_requested?: number;
  plan: Array<{
    day: number;
    items: Array<{ item: { slug: string } | null; slot?: string; why: string }>;
  }>;
  source_items: unknown[];
  error?: string;
};

async function run(city: string, days: number) {
  const tool = createPlanTripWithGuideItemsTool("fr", null);
  const execute = tool.execute as (
    input: unknown,
    options: unknown,
  ) => Promise<PlanOutput>;

  const output = await execute(
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
    { toolCallId: "test", messages: [] },
  );

  console.log(`\n=== ${city} (${days} days) ===`);
  console.log(`success=${output.success} coverage=${output.coverage} planDays=${output.plan.length} sourceItems=${output.source_items.length}`);
  if (output.error) console.log(`error: ${output.error}`);
  for (const day of output.plan) {
    console.log(
      `  day ${day.day}: ` +
        day.items
          .map((i) => (i.item ? `${i.slot}=${i.item.slug}` : `${i.slot}=GAP`))
          .join(" | "),
    );
  }
  if (output.catalog_gap_instructions) {
    console.log(
      `  gap_instructions: ${output.catalog_gap_instructions.slice(0, 220)}…`,
    );
  }
}

await run("Chefchaouen", 2); // zero catalog items -> coverage none
await run("Taghazout", 2); // 1 catalog item -> coverage partial
await run("Essaouira", 4); // 46 items -> coverage full, no GAP slots
