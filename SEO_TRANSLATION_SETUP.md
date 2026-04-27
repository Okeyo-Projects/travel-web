# SEO & Translation Setup Guide

This guide covers setting up SEO content generation and multilingual translation for experiences using OpenAI GPT-4o-mini.

## Installation

### 1. Add OpenAI SDK to Dependencies

```bash
npm install openai
```

### 2. Set Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_OPENAI_API_KEY=your-api-key-here
```

For Supabase edge functions, add to your Supabase project secrets:

```bash
supabase secrets set OPENAI_API_KEY=your-api-key-here
```

### 3. Run Database Migration

```bash
supabase migration up
```

This creates the new columns:
- `short_description_en/fr/ar` - Translated short descriptions
- `long_description_en/fr/ar` - Translated long descriptions
- `seo_title_en/fr/ar` - SEO optimized titles
- `seo_description_en/fr/ar` - SEO meta descriptions
- `seo_keywords_en/fr/ar` - SEO keywords
- `is_translated` - Flag for translated experiences
- `is_seo_generated` - Flag for SEO-generated experiences
- `original_language` - Original language (en/fr/ar)

## Usage Options

### Option 1: Supabase Edge Functions (Scheduled/Async)

Best for batch processing large numbers of experiences.

#### Trigger Translation Generation

```bash
curl -X POST http://localhost:54321/functions/v1/generate-translations \
  -H "Content-Type: application/json"
```

#### Trigger SEO Generation

```bash
curl -X POST http://localhost:54321/functions/v1/generate-seo-content \
  -H "Content-Type: application/json"
```

### Option 2: Client-Side Library (Real-time/On-Demand)

For generating SEO content on-demand in your application.

#### Generate Translations

```typescript
import { generateTranslations } from "@/lib/seo-translation";

const translations = await generateTranslations(
  "Riad El Noujoum",
  "Authentic riad in Marrakech",
  "A beautiful traditional riad located in the heart of Marrakech's Kasbah...",
  "en" // original language
);

// Result includes all translations:
// translations.short_description_en
// translations.short_description_fr
// translations.short_description_ar
// translations.long_description_en
// translations.long_description_fr
// translations.long_description_ar
// translations.original_language
```

Note: Set environment variable `NEXT_PUBLIC_OPENAI_API_KEY` for client-side usage.

#### Generate SEO Content

```typescript
import { generateSeoContent } from "@/lib/seo-translation";

const seoContent = await generateSeoContent({
  title: "Riad El Noujoum",
  city: "Marrakech",
  region: "Kasbah",
  short_description_en: "Authentic riad in Marrakech",
  short_description_fr: "Riad authentique à Marrakech",
  short_description_ar: "دار أصيلة في مراكش",
  long_description_en: "A beautiful traditional riad...",
  long_description_fr: "Un beau riad traditionnel...",
  long_description_ar: "دار تقليدي جميل...",
});

// Result includes:
// seoContent.seo_title_en/fr/ar
// seoContent.seo_description_en/fr/ar
// seoContent.seo_keywords_en/fr/ar
```

### Option 3: Batch Processing (Cost Optimization)

For processing 100+ experiences at once with 50% cost savings.

```typescript
import { batchGenerateSeoContent, getBatchStatus, getBatchResults } from "@/lib/seo-translation";

// Start batch
const { batchId, requestCount } = await batchGenerateSeoContent(experiences);
console.log(`Submitted ${requestCount} requests in batch ${batchId}`);

// Poll status
const status = await getBatchStatus(batchId);
console.log(`Status: ${status.status}`);
console.log(`Succeeded: ${status.succeeded}, Errored: ${status.errored}`);

// Once complete, retrieve results
if (status.status === "ended") {
  const results = await getBatchResults(batchId);
  // Process results...
}
```

## Architecture

### How It Works

1. **Language Detection**: Automatically detects the original language of descriptions (en/fr/ar)
2. **Translation Generation**: Uses OpenAI GPT-4o-mini to translate descriptions to all three languages
3. **Original Language Preservation**: Keeps the original language description unchanged
4. **SEO Generation**: Generates SEO-optimized titles, descriptions, and keywords for each language
5. **Flag Tracking**: Uses `is_translated` and `is_seo_generated` flags to track processing status

### Language Detection

Simple heuristics are used:
- French: Detects French articles, prepositions (le, la, les, de, du, qu, etc.)
- Arabic: Detects Arabic script characters
- English: Default fallback

### Cost Optimization

- **Regular API**: ~$0.00015 per experience (GPT-4o-mini: 150 tokens × $0.00015/1K input tokens)
- **Batch API**: ~$0.00012 per experience (20% discount)
- Batches typically complete within 1 hour
- Ideal for processing 100+ experiences at once
- GPT-4o-mini is 20x cheaper than Claude Opus 4.7 for similar quality

## SEO Title Format

The generated SEO titles follow this pattern:

```
[Experience Name] — [Descriptive phrase in target language] | Okeyo Travel
```

Example:
```
EN: Riad El Noujoum — Authentic traditional riad in Marrakech Kasbah | Okeyo Travel
FR: Riad El Noujoum — Riad authentique à Marrakech Kasbah | Okeyo Travel
AR: Riad El Noujoum — دار أصيلة في قصبة مراكش | Okeyo Travel
```

## Model Information

**Current Model**: OpenAI GPT-4o-mini

- **Pricing**: $0.00015/1K input tokens, $0.0006/1K output tokens
- **Speed**: Fast response times, ideal for batch processing
- **Quality**: Production-ready quality for translations and SEO content
- **Why GPT-4o-mini?**: 20x cost reduction compared to Claude Opus 4.7 with comparable output quality

## Best Practices

1. **Batch Process**: Use batch API for 100+ experiences to save costs
2. **Check Flags**: Always check `is_translated` and `is_seo_generated` before regenerating
3. **Validate Output**: Review generated content for accuracy, especially SEO keywords
4. **Test With One**: Generate for a single experience first to validate quality
5. **Schedule Regularly**: Run translation/SEO generation on a schedule for new experiences
6. **Monitor API Usage**: Track token usage in OpenAI dashboard to manage costs

## Migration from Claude to OpenAI

This project was migrated from Claude Opus 4.7 to OpenAI GPT-4o-mini for cost optimization. Key changes:

- **SDK**: Changed from `@anthropic-ai/sdk` to `openai`
- **Environment Variables**: `ANTHROPIC_API_KEY` → `OPENAI_API_KEY`
- **API Calls**: Updated to use OpenAI's REST API format
- **Cost**: Reduced by ~95% with comparable quality
- **Batch API**: Format updated to OpenAI's batch request format

All edge functions and client libraries have been updated to use the new OpenAI integration.

## Troubleshooting

### API Key Issues

Ensure `OPENAI_API_KEY` is set in both:
- `.env.local` (for client-side functions, as `NEXT_PUBLIC_OPENAI_API_KEY`)
- Supabase secrets (for edge functions, as `OPENAI_API_KEY`)

### JSON Parsing Errors

Claude responses may include markdown code blocks. The library handles this automatically by extracting JSON with regex.

### Language Detection Issues

If automatic detection fails, explicitly pass `original_language`:

```typescript
const translations = await generateTranslations(
  title,
  shortDescription,
  longDescription,
  "ar" // explicitly specify Arabic
);
```

### Batch Processing Timeouts

Batches typically complete within 1 hour. Check status periodically:

```typescript
while (true) {
  const status = await getBatchStatus(batchId);
  if (status.status === "ended") break;
  await new Promise((r) => setTimeout(r, 60000)); // Wait 1 minute
}
```

## Database Schema

### New Columns Added

```sql
-- Translated descriptions
short_description_en TEXT
short_description_fr TEXT
short_description_ar TEXT
long_description_en TEXT
long_description_fr TEXT
long_description_ar TEXT

-- SEO content
seo_title_en TEXT
seo_title_fr TEXT
seo_title_ar TEXT
seo_description_en TEXT
seo_description_fr TEXT
seo_description_ar TEXT
seo_keywords_en TEXT
seo_keywords_fr TEXT
seo_keywords_ar TEXT

-- Processing flags
is_translated BOOLEAN DEFAULT FALSE
is_seo_generated BOOLEAN DEFAULT FALSE
original_language TEXT CHECK (original_language IN ('en', 'fr', 'ar'))
```

### Indexes Created

- `idx_experiences_is_translated`
- `idx_experiences_is_seo_generated`
- `idx_experiences_original_language`

These allow efficient filtering for batch processing.

## Example: Complete Workflow

```typescript
import { 
  generateTranslations, 
  generateSeoContent 
} from "@/lib/seo-translation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(url, key);

// Get an experience
const { data: exp } = await supabase
  .from("experiences")
  .select("*")
  .eq("id", "experience-id")
  .single();

// Step 1: Generate translations
const translations = await generateTranslations(
  exp.title,
  exp.short_description,
  exp.long_description
);

// Step 2: Update experience with translations
await supabase
  .from("experiences")
  .update({
    ...translations,
    is_translated: true,
  })
  .eq("id", exp.id);

// Step 3: Generate SEO content
const seoContent = await generateSeoContent({
  title: exp.title,
  city: exp.city,
  region: exp.region,
  short_description_en: translations.short_description_en,
  short_description_fr: translations.short_description_fr,
  short_description_ar: translations.short_description_ar,
  long_description_en: translations.long_description_en,
  long_description_fr: translations.long_description_fr,
  long_description_ar: translations.long_description_ar,
});

// Step 4: Update with SEO content
await supabase
  .from("experiences")
  .update({
    ...seoContent,
    is_seo_generated: true,
  })
  .eq("id", exp.id);

console.log("✓ Experience fully processed!");
```

## Experience Details Page Integration

### Overview

The experience details page (`src/app/experience/[id]/ExperienceDetailView.tsx`) will be updated to leverage the new SEO and translation data for:

- Dynamic SEO metadata rendering (title, description, keywords)
- Multilingual content display based on user's selected language
- Improved search engine optimization
- Better user experience with localized content

### Implementation

#### 1. SEO Meta Tags

The page should inject SEO meta tags based on the user's language preference:

```typescript
// src/app/experience/[id]/layout.tsx or in the component
import { generateMetadata } from "next";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const experience = await fetchExperience(params.id);
  const userLanguage = getUserLanguage(); // from cookie/context
  
  const seoTitleKey = `seo_title_${userLanguage}`;
  const seoDescriptionKey = `seo_description_${userLanguage}`;
  const seoKeywordsKey = `seo_keywords_${userLanguage}`;

  return {
    title: experience[seoTitleKey] || experience.title,
    description: experience[seoDescriptionKey] || experience.short_description,
    keywords: experience[seoKeywordsKey],
    openGraph: {
      title: experience[seoTitleKey] || experience.title,
      description: experience[seoDescriptionKey],
      url: `/experience/${experience.id}`,
      type: "website",
    },
  };
}
```

#### 2. Localized Content Display

Use the translated descriptions in the experience detail view:

```typescript
// In ExperienceDetailView.tsx
interface ExperienceViewProps {
  experience: Experience;
  language: "en" | "fr" | "ar";
}

export function ExperienceDetailView({ experience, language }: ExperienceViewProps) {
  // Use language-specific descriptions
  const shortDesc = experience[`short_description_${language}`] || experience.short_description;
  const longDesc = experience[`long_description_${language}`] || experience.long_description;
  const seoTitle = experience[`seo_title_${language}`];
  const seoDescription = experience[`seo_description_${language}`];

  return (
    <div>
      <h1>{experience.title}</h1>
      <p className="subtitle">{shortDesc}</p>
      
      <section className="description">
        <p>{longDesc}</p>
      </section>

      {/* Display SEO keywords as tags (optional) */}
      {experience[`seo_keywords_${language}`] && (
        <div className="keywords">
          {experience[`seo_keywords_${language}`]
            .split(",")
            .map((keyword) => (
              <span key={keyword} className="tag">
                {keyword.trim()}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
```

#### 3. Language Switching

When user switches language, update the displayed content:

```typescript
// Handle language preference changes
function handleLanguageChange(newLanguage: "en" | "fr" | "ar") {
  // Update context/state
  setLanguage(newLanguage);
  
  // Update URL or query params
  const url = new URL(window.location);
  url.searchParams.set("lang", newLanguage);
  window.history.replaceState({}, "", url);
  
  // Trigger page re-render with new language
  reloadContent();
}
```

### Database Flow

```
Experience Created/Updated
    ↓
Detect Language (fr/en/ar)
    ↓
Generate Translations (3 languages)
    ↓ [is_translated = true]
Generate SEO Content (titles, descriptions, keywords)
    ↓ [is_seo_generated = true]
Experience Ready for Display
    ↓
ExperienceDetailView renders with language-specific content
    ↓
Next.js generates optimized meta tags for SEO
```

### Content Rendering Priority

When displaying content, follow this priority:

1. **Translated content** (e.g., `short_description_en`)
2. **Fallback to default description** (legacy field)
3. **Show "Translation pending" message** if not available

```typescript
function getDescription(
  experience: Experience,
  language: "en" | "fr" | "ar"
): string {
  const translatedKey = `short_description_${language}`;
  
  if (experience[translatedKey]) {
    return experience[translatedKey];
  }
  
  // Fallback to default if translation missing
  return experience.short_description || "Translation pending...";
}
```

### SEO Best Practices for the Page

1. **Meta Title Length**: Keep SEO titles under 60 characters for optimal display
2. **Meta Description**: 150-160 characters for full display in search results
3. **Keyword Density**: SEO keywords are for metadata, not page content stuffing
4. **Open Graph Tags**: Include OG tags for social media sharing
5. **Structured Data**: Consider adding JSON-LD schema for rich snippets

Example OG implementation:

```typescript
<meta property="og:title" content={seoTitle} />
<meta property="og:description" content={seoDescription} />
<meta property="og:image" content={experience.thumbnail_url} />
<meta property="og:type" content="website" />
<meta name="keywords" content={seoKeywords} />
```

### Performance Considerations

1. **Lazy Load SEO Data**: Only fetch SEO fields when needed
2. **Cache Meta Tags**: Use Next.js static generation for frequently visited experiences
3. **Monitor Processing**: Track `is_translated` and `is_seo_generated` flags to monitor completion
4. **Batch Update**: Use scheduled edge functions to generate SEO for new experiences

### Quality Assurance

Before deploying to production:

1. ✅ Test with single experience to validate translations
2. ✅ Check SEO titles render correctly in search results
3. ✅ Verify OG tags work on social media share
4. ✅ Confirm language switching updates content properly
5. ✅ Validate all 3 languages (en/fr/ar) display correctly
6. ✅ Test fallback behavior when translations missing

### Migration Strategy

For existing experiences without SEO/translation data:

1. **Phase 1**: Deploy new schema and UI (supports both old and new data)
2. **Phase 2**: Batch generate translations for all existing experiences
3. **Phase 3**: Batch generate SEO content
4. **Phase 4**: Monitor and refine SEO keywords if needed

Estimated timeline:

- Phase 1: Immediate (code deployment)
- Phase 2-3: Run via scheduled job or batch API (1-2 hours)
- Phase 4: Ongoing optimization

## Questions

1. **Do I need to translate experience names?** No, only the descriptive parts. Names stay the same across all languages.

2. **Can I regenerate if not happy with output?** Yes, just set `is_seo_generated = false` and run again.

3. **What if my experience is already multilingual?** The library detects the original language and keeps it unchanged while translating the others.

4. **How long does batch processing take?** Typically 1 hour, sometimes up to 24 hours depending on queue.

5. **Can I use this for individual experiences?** Yes, the client library works for both one-off and batch operations.

6. **How will the experience detail page display multilingual content?** The page will detect user language preference and display the appropriate translated descriptions using `short_description_${language}` and `long_description_${language}` fields.

7. **What happens if translations aren't ready yet?** The page falls back to the default `short_description` and `long_description` fields, with an optional message indicating translations are pending.

8. **How are SEO meta tags generated?** Next.js `generateMetadata` function uses the language-specific `seo_title_${language}` and `seo_description_${language}` fields to create optimized meta tags for search engines.
