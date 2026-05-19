-- Align booking-agent welcome suggestions with the top published inventory cities.

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
SET suggested_prompts = $json$
    {
      "fr": [
        {
          "title": "Essaouira",
          "prompt": "Essaouira"
        },
        {
          "title": "Marrakech",
          "prompt": "Marrakech"
        },
        {
          "title": "Chefchaouen",
          "prompt": "Chefchaouen"
        },
        {
          "title": "Imlil",
          "prompt": "Imlil"
        },
        {
          "title": "Lalla Takerkoust",
          "prompt": "Lalla Takerkoust"
        }
      ],
      "en": [
        {
          "title": "Essaouira",
          "prompt": "Essaouira"
        },
        {
          "title": "Marrakech",
          "prompt": "Marrakech"
        },
        {
          "title": "Chefchaouen",
          "prompt": "Chefchaouen"
        },
        {
          "title": "Imlil",
          "prompt": "Imlil"
        },
        {
          "title": "Lalla Takerkoust",
          "prompt": "Lalla Takerkoust"
        }
      ],
      "ar": [
        {
          "title": "الصويرة",
          "prompt": "الصويرة"
        },
        {
          "title": "مراكش",
          "prompt": "مراكش"
        },
        {
          "title": "شفشاون",
          "prompt": "شفشاون"
        },
        {
          "title": "إمليل",
          "prompt": "إمليل"
        },
        {
          "title": "للا تكركوست",
          "prompt": "للا تكركوست"
        }
      ]
    }
  $json$::jsonb,
    updated_at = NOW()
FROM target_version
WHERE v.id = target_version.id;
