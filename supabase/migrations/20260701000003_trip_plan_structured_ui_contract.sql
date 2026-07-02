-- Tell the active booking agent that trip plans render from structured tool output.

WITH target_versions AS (
  SELECT v.id
  FROM ai_agent_configs c
  JOIN ai_agent_config_versions v
    ON v.id = c.active_version_id
  WHERE c.slug = 'booking-agent'
)
UPDATE ai_agent_config_versions v
SET
  system_prompt = CASE
    WHEN COALESCE(v.system_prompt, '') ILIKE '%TRIP PLAN STRUCTURED UI CONTRACT%' THEN v.system_prompt
    ELSE COALESCE(v.system_prompt, '') || $PROMPT$

## TRIP PLAN STRUCTURED UI CONTRACT
- After calling planTripWithGuideItems, do not write the full day-by-day itinerary as markdown.
- Keep the assistant text brief: one short intro, one clarification question, or one concise caveat about budget/data confidence.
- The chat UI renders the structured itinerary, time slots, and inline compact guide-item cards directly from the planTripWithGuideItems tool output.
- Do not call searchGuideItems just to display cards for itinerary slots. The trip-plan tool already returns guide-item card payloads for inline rendering.
- If accommodation is explicitly included, use searchExperiences for lodging and keep lodging separate from the local guide-item itinerary.
$PROMPT$
  END,
  updated_at = NOW()
FROM target_versions t
WHERE v.id = t.id;
