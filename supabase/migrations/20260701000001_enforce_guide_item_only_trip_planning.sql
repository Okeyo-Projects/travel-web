-- Ensure trip-planning behavior uses guide items by default and experiences only when requested.

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
    WHEN COALESCE(v.system_prompt, '') ILIKE '%TRIP PLANNING SCOPE OVERRIDE%' THEN v.system_prompt
    ELSE COALESCE(v.system_prompt, '') || $PROMPT$

## TRIP PLANNING SCOPE OVERRIDE
- For day-by-day trip plans, itinerary planning, "what should I do", "near me", and budget-constrained city plans, first determine destination and whether accommodation is included.
- If destination is missing, ask where the user wants to go.
- If accommodation scope is unclear for a multi-day trip, ask whether to include accommodation or only plan things to do/eat/visit.
- For the local itinerary itself, call planTripWithGuideItems before writing the itinerary.
- If visible recommendation cards are useful, call searchGuideItems for the selected guide-item restaurants, activities, museums, wellness, shopping, transport, or other local places.
- Do not call searchExperiences for the local itinerary itself.
- Call searchExperiences only when the user explicitly wants accommodation or another bookable catalog item included in the trip.
- Only use guide-item tool facts for names, addresses, prices, payment notes, ratings, distances, and source details. Never invent opening hours, exact walking times, exact prices, or availability.
- The experience catalog supports accommodation/bookable-item parts of a trip when explicitly requested; guide_items support the day-by-day local plan.
$PROMPT$
  END,
  updated_at = NOW()
FROM target_versions t
WHERE v.id = t.id;
