-- Keep the public chat welcome cards aligned with the localized UI.

WITH latest_published_version AS (
  SELECT DISTINCT ON (v.config_id)
    v.config_id,
    v.id
  FROM ai_agent_config_versions v
  WHERE v.status = 'published'
  ORDER BY v.config_id, v.version_number DESC
)
UPDATE ai_agent_configs c
SET active_version_id = latest_published_version.id,
    updated_at = NOW()
FROM latest_published_version
WHERE c.slug = 'booking-agent'
  AND c.active_version_id IS NULL
  AND latest_published_version.config_id = c.id;

WITH target_version AS (
  SELECT c.active_version_id AS id
  FROM ai_agent_configs c
  WHERE c.slug = 'booking-agent'
    AND c.active_version_id IS NOT NULL
)
UPDATE ai_agent_config_versions v
SET welcome_messages = $json$
    {
      "fr": {
        "title": "Bonjour, je suis votre assistant voyage",
        "description": "Je peux vous aider à trouver le bon séjour au Maroc, comparer les chambres et préparer votre réservation."
      },
      "en": {
        "title": "Hello, I am your travel assistant",
        "description": "I can help you find the right stay in Morocco, compare rooms, and prepare your booking."
      },
      "ar": {
        "title": "مرحبًا، أنا مساعدك في السفر",
        "description": "يمكنني مساعدتك في العثور على الإقامة المناسبة في المغرب ومقارنة الغرف وتحضير الحجز."
      }
    }
  $json$::jsonb,
    suggested_prompts = $json$
    {
      "fr": [
        {
          "title": "Riad romantique",
          "prompt": "Je cherche un riad romantique à Marrakech pour ce week-end."
        },
        {
          "title": "Lodge calme dans l’Atlas",
          "prompt": "Je cherche un lodge calme dans l’Atlas pour 2 nuits."
        },
        {
          "title": "Piscine et détente",
          "prompt": "Montre-moi un hébergement avec piscine et hammam près de Marrakech."
        },
        {
          "title": "Petit budget",
          "prompt": "Je veux une maison d’hôtes petit budget à Chefchaouen."
        }
      ],
      "en": [
        {
          "title": "Romantic riad",
          "prompt": "I am looking for a romantic riad in Marrakech for this weekend."
        },
        {
          "title": "Quiet Atlas lodge",
          "prompt": "I am looking for a quiet lodge in the Atlas for 2 nights."
        },
        {
          "title": "Pool and relaxation",
          "prompt": "Show me a stay with a pool and hammam near Marrakech."
        },
        {
          "title": "Budget stay",
          "prompt": "I want a budget guesthouse in Chefchaouen."
        }
      ],
      "ar": [
        {
          "title": "رياض رومانسي",
          "prompt": "أبحث عن رياض رومانسي في مراكش لعطلة نهاية الأسبوع."
        },
        {
          "title": "لودج هادئ في الأطلس",
          "prompt": "أبحث عن لودج هادئ في الأطلس لمدة ليلتين."
        },
        {
          "title": "مسبح واسترخاء",
          "prompt": "اعرض لي إقامة مع مسبح وحمام قرب مراكش."
        },
        {
          "title": "ميزانية محدودة",
          "prompt": "أريد دار ضيافة اقتصادية في شفشاون."
        }
      ]
    }
  $json$::jsonb,
    fallback_language = 'fr',
    supported_languages = ARRAY['fr', 'en', 'ar'],
    updated_at = NOW()
FROM target_version
WHERE v.id = target_version.id;
