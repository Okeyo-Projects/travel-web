-- =====================================================
-- EMBEDDING HELPER FUNCTIONS
-- Generate rich text for embedding from experience data
-- =====================================================

-- Function to generate comprehensive text for embedding an experience
-- This combines all relevant experience data into a single searchable text
CREATE OR REPLACE FUNCTION generate_experience_embedding_text(exp_id UUID)
RETURNS TEXT AS $$
DECLARE
  exp_record RECORD;
  lodging_record RECORD;
  trip_record RECORD;
  amenities_text TEXT;
  services_included_text TEXT;
  tags_text TEXT;
  itinerary_text TEXT;
  room_types_text TEXT;
  result_text TEXT;
BEGIN
  -- Get base experience data
  SELECT 
    e.title, 
    e.short_description, 
    e.long_description,
    e.city,
    e.region,
    e.type,
    e.tags,
    h.name as host_name
  INTO exp_record
  FROM experiences e
  LEFT JOIN hosts h ON h.id = e.host_id
  WHERE e.id = exp_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Start building the text
  result_text := coalesce(exp_record.title, '') || '. ' ||
                 coalesce(exp_record.short_description, '') || '. ' ||
                 coalesce(exp_record.long_description, '') || '. ' ||
                 'Located in ' || coalesce(exp_record.city, '') || 
                 CASE WHEN exp_record.region IS NOT NULL THEN ', ' || exp_record.region ELSE '' END || '. ' ||
                 'Type: ' || coalesce(exp_record.type::text, '') || '. ' ||
                 'Host: ' || coalesce(exp_record.host_name, '') || '. ';
  
  -- Add tags
  IF exp_record.tags IS NOT NULL AND array_length(exp_record.tags, 1) > 0 THEN
    tags_text := 'Tags: ' || array_to_string(exp_record.tags, ', ') || '. ';
    result_text := result_text || tags_text;
  END IF;
  
  -- Add amenities for lodging
  SELECT string_agg(a.label_fr, ', ') INTO amenities_text
  FROM experience_amenities ea
  JOIN amenities a ON a.key = ea.amenity_key
  WHERE ea.experience_id = exp_id;
  
  IF amenities_text IS NOT NULL THEN
    result_text := result_text || 'Amenities: ' || amenities_text || '. ';
  END IF;
  
  -- Add included services (for trips/activities)
  SELECT string_agg(s.label_fr, ', ') INTO services_included_text
  FROM experience_services_included esi
  JOIN services s ON s.key = esi.service_key
  WHERE esi.experience_id = exp_id;
  
  IF services_included_text IS NOT NULL THEN
    result_text := result_text || 'Included services: ' || services_included_text || '. ';
  END IF;
  
  -- Add lodging-specific details
  IF exp_record.type = 'lodging' THEN
    SELECT * INTO lodging_record
    FROM experiences_lodging
    WHERE experience_id = exp_id;
    
    IF FOUND THEN
      result_text := result_text || 'Lodging type: ' || coalesce(lodging_record.lodging_type::text, '') || '. ';
      
      IF lodging_record.house_rules IS NOT NULL THEN
        result_text := result_text || 'House rules: ' || lodging_record.house_rules || '. ';
      END IF;
      
      IF lodging_record.non_fumeur THEN
        result_text := result_text || 'Non-smoking. ';
      END IF;
      
      IF lodging_record.animaux_acceptes THEN
        result_text := result_text || 'Pet-friendly. ';
      END IF;
    END IF;
    
    -- Add room types info
    SELECT string_agg(
      coalesce(name, room_type::text) || ' (capacity: ' || max_persons || ' persons)', 
      ', '
    ) INTO room_types_text
    FROM lodging_room_types
    WHERE experience_id = exp_id AND deleted_at IS NULL;
    
    IF room_types_text IS NOT NULL THEN
      result_text := result_text || 'Room types: ' || room_types_text || '. ';
    END IF;
  END IF;
  
  -- Add trip-specific details
  IF exp_record.type = 'trip' THEN
    SELECT * INTO trip_record
    FROM experiences_trip
    WHERE experience_id = exp_id;
    
    IF FOUND THEN
      result_text := result_text || 
        'Trip category: ' || coalesce(trip_record.category::text, '') || '. ' ||
        'Departure from: ' || coalesce(trip_record.departure_place, '') || '. ';
      
      IF trip_record.arrival_place IS NOT NULL THEN
        result_text := result_text || 'Arriving at: ' || trip_record.arrival_place || '. ';
      END IF;
      
      IF trip_record.skill_level IS NOT NULL THEN
        result_text := result_text || 'Skill level: ' || trip_record.skill_level::text || '. ';
      END IF;
      
      IF trip_record.physical_difficulty IS NOT NULL THEN
        result_text := result_text || 'Physical difficulty: ' || trip_record.physical_difficulty || '/5. ';
      END IF;
      
      IF trip_record.duration_days IS NOT NULL AND trip_record.duration_days > 0 THEN
        result_text := result_text || 'Duration: ' || trip_record.duration_days || ' days';
        
        IF trip_record.duration_hours IS NOT NULL AND trip_record.duration_hours > 0 THEN
          result_text := result_text || ' ' || trip_record.duration_hours || ' hours';
        END IF;
        
        result_text := result_text || '. ';
      END IF;
      
      IF trip_record.what_to_bring IS NOT NULL THEN
        result_text := result_text || 'What to bring: ' || trip_record.what_to_bring || '. ';
      END IF;
    END IF;
    
    -- Add itinerary details
    SELECT string_agg(title || ': ' || details, ' | ') INTO itinerary_text
    FROM trip_itinerary
    WHERE experience_id = exp_id
    ORDER BY day_number, order_index;
    
    IF itinerary_text IS NOT NULL THEN
      result_text := result_text || 'Itinerary: ' || itinerary_text || '. ';
    END IF;
  END IF;
  
  -- Add activity-specific details (reuses trip table for category/details)
  IF exp_record.type = 'activity' THEN
    SELECT * INTO trip_record
    FROM experiences_trip
    WHERE experience_id = exp_id;
    
    IF FOUND THEN
      result_text := result_text || 
        'Activity category: ' || coalesce(trip_record.category::text, '') || '. ';
      
      IF trip_record.skill_level IS NOT NULL THEN
        result_text := result_text || 'Skill level required: ' || trip_record.skill_level::text || '. ';
      END IF;
      
      IF trip_record.physical_difficulty IS NOT NULL THEN
        result_text := result_text || 'Physical difficulty: ' || trip_record.physical_difficulty || '/5. ';
      END IF;
      
      IF trip_record.duration_hours IS NOT NULL THEN
        result_text := result_text || 'Duration: ' || trip_record.duration_hours || ' hours. ';
      END IF;
    END IF;
  END IF;
  
  RETURN result_text;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION generate_experience_embedding_text IS 'Generate comprehensive text representation of an experience for vector embedding';
