-- =====================================================
-- ENHANCED SEARCH FUNCTION
-- Combines: semantic search, distance, promos, availability, filters
-- =====================================================

CREATE OR REPLACE FUNCTION search_experiences_enhanced(
  -- Semantic search
  query_embedding vector(1536) DEFAULT NULL,
  semantic_threshold REAL DEFAULT 0.7,
  
  -- Text search (fallback)
  text_query TEXT DEFAULT NULL,
  
  -- Experience filters
  exp_type experience_type DEFAULT NULL,
  city_filter TEXT DEFAULT NULL,
  region_filter TEXT DEFAULT NULL,
  price_min_cents INT DEFAULT NULL,
  price_max_cents INT DEFAULT NULL,
  min_rating NUMERIC DEFAULT NULL,
  min_guests INT DEFAULT NULL,
  
  -- Date and availability
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL,
  check_availability BOOLEAN DEFAULT false,
  
  -- Location-based search
  user_lat REAL DEFAULT NULL,
  user_lng REAL DEFAULT NULL,
  max_distance_km REAL DEFAULT NULL,
  
  -- Promo filters
  only_with_promo BOOLEAN DEFAULT false,
  only_auto_apply BOOLEAN DEFAULT false,
  
  -- Sorting and pagination
  sort_by TEXT DEFAULT 'relevance', -- 'relevance', 'distance', 'price_asc', 'price_desc', 'rating', 'promo_priority'
  result_limit INT DEFAULT 20,
  result_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  short_description TEXT,
  type experience_type,
  city TEXT,
  region TEXT,
  thumbnail_url TEXT,
  price_cents INT,
  currency TEXT,
  avg_rating NUMERIC,
  reviews_count INT,
  distance_km REAL,
  relevance_score REAL,
  has_promo BOOLEAN,
  promo_badge TEXT,
  promo_discount_type discount_type,
  promo_discount_value NUMERIC,
  auto_apply_promo BOOLEAN,
  is_available BOOLEAN,
  host_id UUID,
  host_name TEXT
) AS $$
DECLARE
  user_location GEOGRAPHY;
BEGIN
  -- Create geography point from user coordinates
  IF user_lat IS NOT NULL AND user_lng IS NOT NULL THEN
    user_location := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;
  END IF;
  
  RETURN QUERY
  WITH base_experiences AS (
    SELECT 
      e.id,
      e.title,
      e.short_description,
      e.type,
      e.city,
      e.region,
      e.thumbnail_url,
      e.avg_rating,
      e.reviews_count,
      e.embedding,
      e.search_vector,
      e.location,
      h.id as host_id,
      h.name as host_name,
      -- Get base price (varies by type)
      CASE 
        WHEN e.type = 'lodging' THEN (
          SELECT MIN(lrt.price_cents) 
          FROM lodging_room_types lrt 
          WHERE lrt.experience_id = e.id AND lrt.deleted_at IS NULL
        )
        WHEN e.type IN ('trip', 'activity') THEN (
          SELECT et.price_cents 
          FROM experiences_trip et 
          WHERE et.experience_id = e.id
        )
      END as price_cents,
      'MAD' as currency,
      -- Calculate distance if user location provided
      CASE 
        WHEN user_location IS NOT NULL 
        THEN ST_Distance(e.location, user_location) / 1000.0
        ELSE NULL
      END as distance_km,
      -- Calculate semantic similarity if embedding provided
      CASE 
        WHEN query_embedding IS NOT NULL AND e.embedding IS NOT NULL
        THEN 1 - (e.embedding <=> query_embedding)
        ELSE NULL
      END as semantic_score,
      -- Calculate text search rank if text query provided
      CASE 
        WHEN text_query IS NOT NULL
        THEN ts_rank(e.search_vector, websearch_to_tsquery('french', text_query))
        ELSE NULL
      END as text_rank
    FROM experiences e
    LEFT JOIN hosts h ON h.id = e.host_id
    WHERE 
      e.status = 'published'
      AND e.deleted_at IS NULL
      -- Type filter
      AND (exp_type IS NULL OR e.type = exp_type)
      -- Location filters
      AND (city_filter IS NULL OR LOWER(e.city) = LOWER(city_filter))
      AND (region_filter IS NULL OR LOWER(e.region) = LOWER(region_filter))
      -- Rating filter
      AND (min_rating IS NULL OR e.avg_rating >= min_rating)
      -- Distance filter
      AND (
        max_distance_km IS NULL OR user_location IS NULL OR
        ST_Distance(e.location, user_location) / 1000.0 <= max_distance_km
      )
      -- Search filter (semantic or text)
      AND (
        query_embedding IS NULL OR
        text_query IS NULL OR
        e.embedding IS NOT NULL OR
        e.search_vector @@ websearch_to_tsquery('french', text_query)
      )
  ),
  experiences_with_promos AS (
    SELECT 
      be.*,
      prom.has_promo,
      prom.best_badge as promo_badge,
      prom.best_discount_type as promo_discount_type,
      prom.best_discount_value as promo_discount_value,
      prom.auto_apply_available as auto_apply_promo,
      -- Calculate promo priority score (for sorting)
      CASE
        WHEN prom.auto_apply_available THEN 3
        WHEN prom.has_promo THEN 2
        ELSE 1
      END as promo_priority
    FROM base_experiences be
    LEFT JOIN LATERAL (
      SELECT * FROM experience_active_promos(be.id)
    ) prom ON true
    WHERE
      -- Promo filters
      (NOT only_with_promo OR prom.has_promo)
      AND (NOT only_auto_apply OR prom.auto_apply_available)
      -- Price filters (after we have price_cents)
      AND (price_min_cents IS NULL OR be.price_cents >= price_min_cents)
      AND (price_max_cents IS NULL OR be.price_cents <= price_max_cents)
  ),
  experiences_with_availability AS (
    SELECT 
      ewp.*,
      CASE
        WHEN NOT check_availability OR date_from IS NULL THEN true
        WHEN ewp.type = 'lodging' THEN EXISTS (
          SELECT 1 FROM lodging_availability la
          JOIN lodging_room_types lrt ON lrt.id = la.room_type_id
          WHERE la.experience_id = ewp.id
            AND la.date BETWEEN date_from AND COALESCE(date_to, date_from)
            AND la.rooms_available > 0
            AND lrt.deleted_at IS NULL
            AND (min_guests IS NULL OR lrt.max_persons >= min_guests)
        )
        WHEN ewp.type = 'trip' THEN EXISTS (
          SELECT 1 FROM trip_departures td
          WHERE td.experience_id = ewp.id
            AND td.depart_at::date >= date_from
            AND (date_to IS NULL OR td.depart_at::date <= date_to)
            AND td.status = 'scheduled'
            AND td.seats_available > 0
            AND (min_guests IS NULL OR td.seats_available >= min_guests)
        )
        WHEN ewp.type = 'activity' THEN EXISTS (
          SELECT 1 FROM activity_sessions as_
          WHERE as_.experience_id = ewp.id
            AND as_.start_at::date >= date_from
            AND (date_to IS NULL OR as_.start_at::date <= date_to)
            AND as_.status = 'scheduled'
            AND as_.capacity_available > 0
            AND (min_guests IS NULL OR as_.capacity_available >= min_guests)
        )
        ELSE true
      END as is_available
    FROM experiences_with_promos ewp
  ),
  filtered_experiences AS (
    SELECT 
      ewa.*,
      -- Calculate final relevance score
      CASE
        WHEN semantic_score IS NOT NULL AND semantic_score >= semantic_threshold 
        THEN semantic_score
        WHEN text_rank IS NOT NULL 
        THEN text_rank / 10.0 -- Normalize text rank to 0-1 range
        ELSE 0.5 -- Default neutral score
      END as relevance_score
    FROM experiences_with_availability ewa
    WHERE
      -- Filter by availability if required
      (NOT check_availability OR ewa.is_available)
      -- Filter by semantic threshold
      AND (query_embedding IS NULL OR semantic_score IS NULL OR semantic_score >= semantic_threshold)
  )
  SELECT 
    fe.id,
    fe.title,
    fe.short_description,
    fe.type,
    fe.city,
    fe.region,
    fe.thumbnail_url,
    fe.price_cents,
    fe.currency,
    fe.avg_rating,
    fe.reviews_count,
    fe.distance_km,
    fe.relevance_score,
    fe.has_promo,
    fe.promo_badge,
    fe.promo_discount_type,
    fe.promo_discount_value,
    fe.auto_apply_promo,
    fe.is_available,
    fe.host_id,
    fe.host_name
  FROM filtered_experiences fe
  ORDER BY
    CASE 
      WHEN sort_by = 'relevance' THEN fe.relevance_score
      WHEN sort_by = 'rating' THEN fe.avg_rating
      WHEN sort_by = 'distance' THEN -fe.distance_km -- Negative for DESC order with NULLS LAST
      WHEN sort_by = 'promo_priority' THEN fe.promo_priority
      ELSE NULL
    END DESC NULLS LAST,
    CASE 
      WHEN sort_by = 'price_asc' THEN fe.price_cents
      ELSE NULL
    END ASC NULLS LAST,
    CASE 
      WHEN sort_by = 'price_desc' THEN fe.price_cents
      ELSE NULL
    END DESC NULLS LAST,
    -- Secondary sorts for consistency
    fe.reviews_count DESC,
    fe.avg_rating DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_experiences_enhanced IS 'Enhanced search combining semantic search, distance, promotions, and availability checks';
