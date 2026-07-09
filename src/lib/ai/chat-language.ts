export type SupportedLanguage = "fr" | "en" | "ar";

const DEFAULT_LANGUAGE: SupportedLanguage = "fr";

const GREETING_OPTIONS_BY_LANGUAGE: Record<SupportedLanguage, string[]> = {
  fr: [
    "Riad romantique",
    "Calme & nature",
    "Piscine / Spa",
    "Petit budget",
    "Je ne sais pas",
  ],
  en: [
    "Romantic riad",
    "Calm & nature",
    "Pool / Spa",
    "Budget-friendly",
    "I'm not sure",
  ],
  ar: [
    "رياض رومانسي",
    "هدوء وطبيعة",
    "مسبح / سبا",
    "ميزانية صغيرة",
    "لست متأكدًا",
  ],
};

const QUICK_REPLY_FALLBACK_QUESTION_BY_LANGUAGE: Record<
  SupportedLanguage,
  string
> = {
  fr: "Quel type d'hébergement vous intéresse ?",
  en: "What kind of stay are you looking for?",
  ar: "ما نوع الإقامة التي تبحث عنها؟",
};

const DESTINATION_CLARIFICATION_QUESTION_BY_LANGUAGE: Record<
  SupportedLanguage,
  string
> = {
  fr: "Super. Tu préfères quelle zone ou ambiance ?",
  en: "Great. Which area or vibe do you prefer?",
  ar: "رائع. أي منطقة أو أجواء تفضل؟",
};

const GREETING_WELCOME_TEXT_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  fr: [
    "👋 Salam ! 🇲🇦✨",
    "Je suis Okeyo, ton compagnon de voyage au Maroc.",
    "Je peux te recommander les meilleurs restaurants 🍽️, des activités à faire 🎨, des lieux à visiter 🌿 et des hidden gems que seuls les locaux connaissent ✨.",
    "🗺️ Je peux aussi te créer un itinéraire complet selon ton budget et tes envies. Et dans certaines destinations, je peux te proposer de magnifiques hébergements 🏡.",
    "✨ Dis-moi simplement ce que tu as envie de vivre… et je m'occupe du reste.",
    "🤔 Tu veux qu'on fasse un petit test pour Essaouira ? Tape simplement « Oui » 😉",
  ].join("\\n"),
  en: [
    "👋 Salam! 🇲🇦✨",
    "I'm Okeyo, your travel companion in Morocco.",
    "I can recommend the best restaurants 🍽️, activities to do 🎨, places to visit 🌿, and hidden gems only locals know ✨.",
    "🗺️ I can also create a complete itinerary based on your budget and what you feel like doing. And in some destinations, I can suggest beautiful stays 🏡.",
    "✨ Just tell me what you want to experience... and I'll handle the rest.",
    '🤔 Want to do a quick test for Essaouira? Just type "Yes" 😉',
  ].join("\\n"),
  ar: [
    "👋 سلام! 🇲🇦✨",
    "أنا Okeyo، رفيق سفرك في المغرب.",
    "يمكنني أن أقترح عليك أفضل المطاعم 🍽️، وأنشطة تقوم بها 🎨، وأماكن تزورها 🌿، وجواهر مخفية لا يعرفها إلا السكان المحليون ✨.",
    "🗺️ يمكنني أيضًا إنشاء برنامج سفر كامل حسب ميزانيتك ورغباتك. وفي بعض الوجهات، يمكنني اقتراح إقامات جميلة 🏡.",
    "✨ قل لي فقط ما الذي ترغب في عيشه... وسأتولى الباقي.",
    "🤔 هل تريد أن نجرب اختبارًا صغيرًا لمدينة الصويرة؟ اكتب فقط «نعم» 😉",
  ].join("\\n"),
};

const DESTINATION_OPTIONS_BASE = [
  "Marrakech",
  "Chefchaouen",
  "Atlas (Imlil/Ouirgane)",
  "Essaouira",
  "Agafay",
];

export function normalizeSupportedLanguage(
  value: unknown,
  fallback: SupportedLanguage = DEFAULT_LANGUAGE,
): SupportedLanguage {
  if (value === "fr" || value === "en" || value === "ar") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized.startsWith("fr")) return "fr";
    if (normalized.startsWith("en")) return "en";
    if (normalized.startsWith("ar")) return "ar";
  }

  return fallback;
}

export function getLanguageDisplayName(language: SupportedLanguage): string {
  if (language === "en") return "English";
  if (language === "ar") return "Arabic";
  return "French";
}

export function getGreetingQuickReplyOptions(
  language: SupportedLanguage,
  includeUnsureOption = true,
): string[] {
  const options = GREETING_OPTIONS_BY_LANGUAGE[language];
  return includeUnsureOption ? [...options] : options.slice(0, -1);
}

function normalizeQuickReplyValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function getQuickReplyFallbackQuestion(
  language: SupportedLanguage,
): string {
  return QUICK_REPLY_FALLBACK_QUESTION_BY_LANGUAGE[language];
}

export function getGreetingWelcomeText(language: SupportedLanguage): string {
  return GREETING_WELCOME_TEXT_BY_LANGUAGE[language];
}

export function getDestinationClarificationQuestion(
  language: SupportedLanguage,
): string {
  return DESTINATION_CLARIFICATION_QUESTION_BY_LANGUAGE[language];
}

export function getDestinationClarificationOptions(
  language: SupportedLanguage,
): string[] {
  return [
    ...DESTINATION_OPTIONS_BASE,
    GREETING_OPTIONS_BY_LANGUAGE[language][
      GREETING_OPTIONS_BY_LANGUAGE[language].length - 1
    ],
  ];
}

export function localizeKnownQuickReplyOption(
  value: string,
  language: SupportedLanguage,
): string {
  const normalized = normalizeQuickReplyValue(value);

  for (
    let index = 0;
    index < GREETING_OPTIONS_BY_LANGUAGE.fr.length;
    index += 1
  ) {
    const variants = (
      Object.values(GREETING_OPTIONS_BY_LANGUAGE) as string[][]
    ).map((options) => options[index]);

    if (
      variants.some(
        (variant) => normalizeQuickReplyValue(variant) === normalized,
      )
    ) {
      return GREETING_OPTIONS_BY_LANGUAGE[language][index];
    }
  }

  return value;
}

export function localizeKnownQuickReplyQuestion(
  value: string,
  language: SupportedLanguage,
): string {
  const normalized = normalizeQuickReplyValue(value);

  const fallbackQuestionEntry = Object.entries(
    QUICK_REPLY_FALLBACK_QUESTION_BY_LANGUAGE,
  ).find(([, question]) => normalizeQuickReplyValue(question) === normalized);
  if (fallbackQuestionEntry) {
    return QUICK_REPLY_FALLBACK_QUESTION_BY_LANGUAGE[language];
  }

  const clarificationQuestionEntry = Object.entries(
    DESTINATION_CLARIFICATION_QUESTION_BY_LANGUAGE,
  ).find(([, question]) => normalizeQuickReplyValue(question) === normalized);
  if (clarificationQuestionEntry) {
    return DESTINATION_CLARIFICATION_QUESTION_BY_LANGUAGE[language];
  }

  return value;
}
