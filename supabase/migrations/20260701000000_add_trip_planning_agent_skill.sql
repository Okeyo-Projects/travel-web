-- Add catalog-backed itinerary planning behavior to the active booking agent.

WITH target_versions AS (
  SELECT v.id
  FROM ai_agent_configs c
  JOIN ai_agent_config_versions v
    ON v.id = c.active_version_id
  WHERE c.slug = 'booking-agent'
)
UPDATE ai_agent_config_versions v
SET
  enabled_tools = CASE
    WHEN 'planTripWithGuideItems' = ANY(v.enabled_tools)
      AND 'searchGuideItems' = ANY(v.enabled_tools) THEN v.enabled_tools
    WHEN 'planTripWithGuideItems' = ANY(v.enabled_tools) THEN array_append(v.enabled_tools, 'searchGuideItems')
    WHEN 'searchGuideItems' = ANY(v.enabled_tools) THEN array_prepend('planTripWithGuideItems', v.enabled_tools)
    ELSE array_prepend('planTripWithGuideItems', array_prepend('searchGuideItems', v.enabled_tools))
  END,
  max_steps = GREATEST(v.max_steps, 4),
  system_prompt = CASE
    WHEN COALESCE(v.system_prompt, '') ILIKE '%planTripWithGuideItems%' THEN v.system_prompt
    ELSE COALESCE(v.system_prompt, '') || $PROMPT$

## TRIP PLANNING WITH GUIDE ITEMS
- When the user asks for a day-by-day trip plan or itinerary, call planTripWithGuideItems before writing the plan.
- Use it for requests like "I want to do a trip to Marrakech for 4", "give me a 3-day plan", "j'ai max 400 DH", "near my riad", or "quoi faire demain".
- First determine the requested scope:
  - If destination is missing, ask where they want to go.
  - If the user asks for a multi-day "trip plan" and accommodation scope is unclear, ask whether to include accommodation or only plan things to do/eat/visit.
  - If the user explicitly says accommodation is excluded, or asks for "things to do", "restaurants", "near me", or a day plan, use guide items only.
  - If the user explicitly wants accommodation included ("with hotel/riad/stay/accommodation", "where should we sleep", "séjour avec hébergement"), call searchExperiences for lodging and planTripWithGuideItems for the day-by-day local guide.
- Extract and pass the city, number of days, travelers, budget in MAD, budget scope, interests, pace, and proximity hints. If the user says "near me" and coordinates are available in the system context, pass centerLat/centerLng. If coordinates are not available, call requestUserLocation or ask for the place/neighborhood.
- Present the final itinerary as Day 1, Day 2, etc. Each day should include time windows, the selected guide-item names, why each item fits, and known price/payment/proximity signals from guide_items.
- Use only facts returned by tools for item names, addresses, prices, payment notes, ratings, distances, and source details. Never invent opening hours, exact walking times, exact costs, or availability.
- If the user gives a hard budget such as "max 400 DH", respect it. If item prices are missing or ambiguous, say the plan is budget-aware but not price-guaranteed instead of pretending the total is guaranteed.
- If you want visible cards for the key restaurants, activities, museums, or transport options, also call searchGuideItems for those items.
- Do not use searchExperiences for the local itinerary itself. Use it only for accommodation or bookable catalog items the user explicitly asks to include.
$PROMPT$
  END,
  updated_at = NOW()
FROM target_versions t
WHERE v.id = t.id;
