import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export interface TranslationResult {
  short_description_en: string;
  short_description_fr: string;
  short_description_ar: string;
  long_description_en: string;
  long_description_fr: string;
  long_description_ar: string;
  original_language: "en" | "fr" | "ar";
}

export interface SeoContent {
  seo_title_en: string;
  seo_title_fr: string;
  seo_title_ar: string;
  seo_description_en: string;
  seo_description_fr: string;
  seo_description_ar: string;
  seo_keywords_en: string;
  seo_keywords_fr: string;
  seo_keywords_ar: string;
}

export function detectLanguage(text: string): "en" | "fr" | "ar" {
  if (/\b(le|la|les|de|du|qu|est|une|un|et)\b/i.test(text)) {
    return "fr";
  }
  if (/[؀-ۿ]/.test(text)) {
    return "ar";
  }
  return "en";
}

export async function generateTranslations(
  experienceTitle: string,
  shortDescription: string,
  longDescription: string,
  originalLanguage?: "en" | "fr" | "ar"
): Promise<TranslationResult> {
  const detectedLang = originalLanguage || detectLanguage(longDescription);

  const prompt = `Translate the following experience descriptions into English, French, and Arabic.
Keep the experience name unchanged across all languages.
Preserve the meaning and tone. Output as valid JSON only.

Experience Name: ${experienceTitle}

Short Description: ${shortDescription}
Long Description: ${longDescription}

Original Language: ${detectedLang}

Respond with JSON in this exact format:
{
  "short_description_en": "...",
  "short_description_fr": "...",
  "short_description_ar": "...",
  "long_description_en": "...",
  "long_description_fr": "...",
  "long_description_ar": "..."
}`;

  const message = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = message.choices[0].message.content;
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

  switch (detectedLang) {
    case "en":
      translations.long_description_en = longDescription;
      translations.short_description_en = shortDescription;
      break;
    case "fr":
      translations.long_description_fr = longDescription;
      translations.short_description_fr = shortDescription;
      break;
    case "ar":
      translations.long_description_ar = longDescription;
      translations.short_description_ar = shortDescription;
      break;
  }

  return {
    ...translations,
    original_language: detectedLang,
  };
}

export interface ExperienceData {
  title: string;
  city: string;
  region?: string;
  short_description_en: string;
  short_description_fr: string;
  short_description_ar: string;
  long_description_en: string;
  long_description_fr: string;
  long_description_ar: string;
}

export async function generateSeoContent(experience: ExperienceData): Promise<SeoContent> {
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

  const message = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = message.choices[0].message.content;
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

export async function batchGenerateSeoContent(
  experiences: ExperienceData[]
): Promise<{ batchId: string; requestCount: number }> {
  const lines = experiences.map((exp, index) => {
    const customId = `seo-${exp.title.toLowerCase().replace(/\s+/g, "-")}-${index}`;
    return JSON.stringify({
      custom_id: customId,
      method: "POST",
      url: "/v1/chat/completions",
      body: {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Generate SEO metadata for this experience across three languages (English, French, Arabic).

Experience Details:
- Name: ${exp.title}
- Location: ${exp.city}${exp.region ? `, ${exp.region}` : ""}
- English Short: ${exp.short_description_en}
- English Long: ${exp.long_description_en}
- French Short: ${exp.short_description_fr}
- French Long: ${exp.long_description_fr}
- Arabic Short: ${exp.short_description_ar}
- Arabic Long: ${exp.long_description_ar}

Return valid JSON ONLY:
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
}`,
          },
        ],
      },
    });
  });

  const jsonlContent = lines.join("\n");
  const file = new File([jsonlContent], "batch_requests.jsonl", { type: "application/jsonl" });

  const uploadedFile = await openai.files.create({
    file,
    purpose: "batch",
  });

  const batch = await openai.batches.create({
    input_file_id: uploadedFile.id,
    endpoint: "/v1/chat/completions",
    completion_window: "24h",
  });

  console.log(`Created batch ${batch.id} with ${experiences.length} requests`);

  return {
    batchId: batch.id,
    requestCount: experiences.length,
  };
}

export async function getBatchStatus(
  batchId: string
): Promise<{
  status: string;
  succeeded: number;
  errored: number;
  total: number;
}> {
  const batch = await openai.batches.retrieve(batchId);
  const counts = batch.request_counts;

  return {
    status: batch.status,
    succeeded: counts?.completed ?? 0,
    errored: counts?.failed ?? 0,
    total: (counts?.completed ?? 0) + (counts?.failed ?? 0),
  };
}

export async function getBatchResults(
  batchId: string
): Promise<Map<string, SeoContent>> {
  const results = new Map<string, SeoContent>();

  const batch = await openai.batches.retrieve(batchId);
  if (!batch.output_file_id) {
    throw new Error("Batch output file not ready");
  }

  const fileContent = await openai.files.content(batch.output_file_id);
  const text = await fileContent.text();

  for (const line of text.split("\n").filter(Boolean)) {
    const result = JSON.parse(line);
    if (result.response?.status_code === 200) {
      const content = result.response.body?.choices?.[0]?.message?.content;
      if (content) {
        const jsonMatch = (content as string).match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const seoContent = JSON.parse(jsonMatch[0]);
          results.set(result.custom_id as string, seoContent);
        }
      }
    } else {
      console.error(`Error for ${result.custom_id}:`, result.response);
    }
  }

  return results;
}
