-- Supersede stricter guide-item-only prompt text with scope-aware trip planning.

WITH target_versions AS (
  SELECT v.id
  FROM ai_agent_configs c
  JOIN ai_agent_config_versions v
    ON v.id = c.active_version_id
  WHERE c.slug = 'booking-agent'
)
UPDATE ai_agent_config_versions v
SET
  enabled_tools = (
    SELECT ARRAY(
      SELECT DISTINCT tool_name
      FROM unnest(
        array_prepend(
          'planTripWithGuideItems',
          array_prepend('searchGuideItems', v.enabled_tools)
        )
      ) AS tool_name
    )
  ),
  system_prompt = CASE
    WHEN COALESCE(v.system_prompt, '') ILIKE '%TRIP PLANNING SCOPE OVERRIDE V2%' THEN v.system_prompt
    ELSE COALESCE(v.system_prompt, '') || $PROMPT$

## TRIP PLANNING SCOPE OVERRIDE V2
- For trip plans and day-by-day itineraries, first understand the user's scope instead of assuming one tool family.
- If destination is missing, ask where they want to go.
- If the user asks for a multi-day trip and accommodation scope is unclear, ask whether to include accommodation or only plan things to do/eat/visit.
- Use planTripWithGuideItems for the local itinerary: restaurants, activities, museums, wellness, shopping, transport, and other guide_items.
- Do not call searchGuideItems just to display cards for itinerary slots. The trip-plan UI renders the guide-item cards returned by planTripWithGuideItems inline.
- Use searchExperiences only when the user explicitly wants accommodation or another bookable catalog item included.
- Do not use searchExperiences to fill local itinerary slots such as meals, sightseeing, shopping, wellness, or transport.
- If accommodation is included, present lodging separately from the day-by-day guide-item plan.
- Only use tool-returned facts for names, addresses, prices, payment notes, ratings, distances, availability, and source details.
$PROMPT$
  END,
  updated_at = NOW()
FROM target_versions t
WHERE v.id = t.id;
