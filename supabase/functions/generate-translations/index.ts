import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

interface Experience {
  id: string;
  title: string;
  short_description: string;
  long_description: string;
  original_language?: string;
}

function detectLanguage(text: string): "en" | "fr" | "ar" {
  if (/\b(le|la|les|de|du|qu|est|une|un|et|est)\b/i.test(text)) {
    return "fr";
  }
  if (/[؀-ۿ]/.test(text)) {
    return "ar";
  }
  return "en";
}

async function generateTranslations(experience: Experience) {
  const originalLang = experience.original_language || detectLanguage(experience.long_description);

  const prompt = `Translate the following experience descriptions into English, French, and Arabic.
Keep the experience name unchanged across all languages.
Preserve the meaning and tone. Output as valid JSON only.

Experience Name: ${experience.title}

Short Description: ${experience.short_description}
Long Description: ${experience.long_description}

Original Language: ${originalLang}

Respond with JSON in this exact format:
{
  "short_description_en": "...",
  "short_description_fr": "...",
  "short_description_ar": "...",
  "long_description_en": "...",
  "long_description_fr": "...",
  "long_description_ar": "..."
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
          content: "You are a translation assistant. Always respond with valid JSON only.",
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

  const translations = JSON.parse(jsonStr);

  switch (originalLang) {
    case "en":
      translations.long_description_en = experience.long_description;
      translations.short_description_en = experience.short_description;
      break;
    case "fr":
      translations.long_description_fr = experience.long_description;
      translations.short_description_fr = experience.short_description;
      break;
    case "ar":
      translations.long_description_ar = experience.long_description;
      translations.short_description_ar = experience.short_description;
      break;
  }

  return translations;
}

async function main() {
  console.log("Fetching untranslated experiences...");

  const { data: experiences, error: fetchError } = await supabase
    .from("experiences")
    .select("id, title, short_description, long_description, original_language")
    .eq("is_translated", false)
    .limit(100);

  if (fetchError) {
    throw new Error(`Failed to fetch experiences: ${fetchError.message}`);
  }

  if (!experiences || experiences.length === 0) {
    console.log("No untranslated experiences found.");
    return;
  }

  console.log(`Found ${experiences.length} experiences to translate`);

  for (const experience of experiences) {
    try {
      console.log(`Generating translations for: ${experience.title}`);

      const translations = await generateTranslations(experience);

      const { error: updateError } = await supabase
        .from("experiences")
        .update({
          ...translations,
          is_translated: true,
          original_language: experience.original_language || detectLanguage(experience.long_description),
        })
        .eq("id", experience.id);

      if (updateError) {
        console.error(`Failed to update ${experience.id}: ${updateError.message}`);
      } else {
        console.log(`✓ Translated: ${experience.title}`);
      }
    } catch (error) {
      console.error(`Error processing ${experience.id}:`, error);
    }
  }

  console.log("Translation generation complete!");
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
      JSON.stringify({ success: true, message: "Translations generated successfully" }),
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
