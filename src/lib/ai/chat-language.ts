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
    "Salut ! Bienvenue sur OKEYO Travel.",
    "Je suis là pour t'aider à trouver le lodge parfait au Maroc : des riads de charme, des maisons d'hôtes cosy et des adresses calmes loin de la foule.",
    "Pour le moment, on te fait découvrir : Chefchaouen, Imlil, Ouirgane, Lalla Takerkoust, Agafay et Essaouira.",
    "Et si tu ne sais pas encore où aller, aucun souci.",
    "Dis-moi simplement ce qui t'attire le plus.",
    "Choisis ce qui te parle le plus :",
  ].join("\\n"),
  en: [
    "Hello! Welcome to OKEYO Travel.",
    "I'm here to help you find the perfect lodge in Morocco: charming riads, cozy guesthouses, and peaceful stays away from the crowds.",
    "Right now, we can guide you to Chefchaouen, Imlil, Ouirgane, Lalla Takerkoust, Agafay, and Essaouira.",
    "If you are not sure where to go yet, that's completely fine.",
    "Tell me what attracts you most.",
    "Choose what fits your mood best:",
  ].join("\\n"),
  ar: [
    "مرحبا بك في OKEYO Travel.",
    "أنا هنا لمساعدتك في العثور على الإقامة المثالية في المغرب: رياضات ساحرة ودور ضيافة مريحة وأماكن هادئة بعيدًا عن الزحام.",
    "حاليًا يمكننا أن نرشدك إلى Chefchaouen وImlil وOuirgane وLalla Takerkoust وAgafay وEssaouira.",
    "وإذا لم تكن تعرف بعد إلى أين تذهب، فلا مشكلة.",
    "أخبرني فقط بما يجذبك أكثر.",
    "اختر ما يناسبك أكثر:",
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
