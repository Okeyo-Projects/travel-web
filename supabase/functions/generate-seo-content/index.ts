import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

interface Experience {
  id: string;
  title: string;
  short_description_en: string;
  short_description_fr: string;
  short_description_ar: string;
  long_description_en: string;
  long_description_fr: string;
  long_description_ar: string;
  city: string;
  region?: string;
}

async function generateSeoContent(experience: Experience) {
  const prompt = `Generate SEO metadata for this experience across three languages (English, French, Arabic).

Experience Details:
- Name: ${experience.title}
- Location: ${experience.city}${experience.region ? `, ${experience.region}` : ""}
- English Short: ${experience.short_description_en}
- English Long: ${experience.long_description_en}
- French Short: ${experience.short_description_fr}
- French Long: ${experience.long_description_fr}
- Arabic Short: ${experience.short_description_ar}
- Arabic Long: ${experience.long_description_ar}

Generate SEO metadata following this exact format:
- seoTitle: Create a compelling title like "Riad El Noujoum — Riad authentique à Marrakech Kasbah | Okeyo Travel" (experience name + descriptive phrase + location + brand). Keep the experience name unchanged, translate the descriptive part.
- seoDescription: A compelling meta description (150-160 chars) that summarizes the experience
- seoKeywords: 5-7 relevant keywords, comma-separated

Return valid JSON ONLY with no markdown formatting:
{
  "seo_title_en": "...",
  "seo_title_fr": "...",
  "seo_title_ar": "...",
  "seo_description_en": "...",
  "seo_description_fr": "...",
  "seo_description_ar": "...",
  "seo_keywords_en": "...",
  "seo_keywords_fr": "...",
  "seo_keywords_ar": "..."
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an SEO content assistant. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  if (!content) {
    throw new Error("No response from OpenAI");
  }

  let jsonStr = content;
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not extract JSON from OpenAI response");
  }
  jsonStr = jsonMatch[0];

  const seoContent = JSON.parse(jsonStr);

  const requiredFields = [
    "seo_title_en",
    "seo_title_fr",
    "seo_title_ar",
    "seo_description_en",
    "seo_description_fr",
    "seo_description_ar",
    "seo_keywords_en",
    "seo_keywords_fr",
    "seo_keywords_ar",
  ];

  for (const field of requiredFields) {
    if (!seoContent[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return seoContent;
}

async function main() {
  console.log("Fetching experiences needing SEO content...");

  const { data: experiences, error: fetchError } = await supabase
    .from("experiences")
    .select(
      `id, title, short_description_en, short_description_fr, short_description_ar,
       long_description_en, long_description_fr, long_description_ar, city, region`
    )
    .eq("is_seo_generated", false)
    .eq("is_translated", true)
    .limit(100);

  if (fetchError) {
    throw new Error(`Failed to fetch experiences: ${fetchError.message}`);
  }

  if (!experiences || experiences.length === 0) {
    console.log("No experiences needing SEO generation found.");
    return;
  }

  console.log(`Found ${experiences.length} experiences needing SEO content`);

  for (const experience of experiences) {
    try {
      console.log(`Generating SEO content for: ${experience.title}`);

      const seoContent = await generateSeoContent(experience);

      const { error: updateError } = await supabase
        .from("experiences")
        .update({
          ...seoContent,
          is_seo_generated: true,
        })
        .eq("id", experience.id);

      if (updateError) {
        console.error(`Failed to update ${experience.id}: ${updateError.message}`);
      } else {
        console.log(`✓ SEO generated: ${experience.title}`);
      }
    } catch (error) {
      console.error(`Error processing ${experience.id}:`, error);
    }
  }

  console.log("SEO content generation complete!");
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Only POST requests are allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    await main();

    return new Response(
      JSON.stringify({ success: true, message: "SEO content generated successfully" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
