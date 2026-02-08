# Linked Experiences Feature

## Overview
Linked experiences allow complementary offerings to be associated together, enabling users to discover and book related activities, lodging, and trips in a single flow.

---

## Database Schema

**Table:** `experience_links`
```sql
CREATE TABLE experience_links (
  id UUID PRIMARY KEY,
  source_experience_id UUID REFERENCES experiences(id),
  target_experience_id UUID REFERENCES experiences(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Relationship:**
- **Directional**: source → target (e.g., lodge → activity)
- **Constraints**:
  - No self-links
  - Unique pairs (source, target)

**Examples:**
- Riad Saida Atlas (lodge) → Trek Imlil 3 jours (trip)
- Riad Saida Atlas (lodge) → Cours de cuisine berbère (activity)
- Trek Imlil (trip) → Auberge Imlil (lodge)

---

## AI Agent Integration

### New Tool: `getLinkedExperiences`

**Purpose:** Fetch experiences linked to a given experience

**Input:**
```typescript
{
  experience_id: "uuid"
}
```

**Output:**
```typescript
{
  success: true,
  count: 2,
  linked_experiences: [
    {
      id: "uuid",
      title: "Trek Imlil 3 jours",
      type: "trip",
      city: "Marrakech",
      region: "Imlil",
      description: "...",
      price_mad: 1500,
      rating: 4.8,
      reviews_count: 24
    },
    {
      id: "uuid",
      title: "Cours de cuisine",
      type: "activity",
      // ...
      rooms: [...] // if type=lodging
    }
  ]
}
```

**Features:**
- Automatically filters unpublished experiences
- Includes room types for lodging experiences
- Returns empty array if no links exist

---

## AI Behavior

### When to Show Linked Experiences

**1. User Shows Interest**
```
User: "Ce riad me plaît"
AI: Calls getLinkedExperiences → Shows linked activities/treks
Response: "Super choix ! Ce riad propose aussi un trek dans l'Atlas et un cours de cuisine. Voulez-vous voir les détails ?"
```

**2. User Asks About Activities**
```
User: "Qu'est-ce qu'on peut faire là-bas ?"
AI: Calls getLinkedExperiences → Shows linked activities
```

**3. Proactive Suggestions**
```
User: [Searches for lodge]
AI: Shows lodge → Automatically mentions linked experiences
Response: "Ce riad offre un lit double à 650 MAD/nuit. Il propose aussi des treks guidés et des ateliers de cuisine. Intéressé ?"
```

**4. Multi-day Activities**
```
User: [Searches for 3-day trek]
AI: Shows trek → Suggests linked lodging
Response: "Ce trek de 3 jours inclut un guide et les repas. Pour l'hébergement avant/après, nous avons des auberges partenaires à Imlil."
```

### How AI Presents Links

**Natural Language:**
- "Ce riad propose aussi..."
- "Des activités complémentaires sont disponibles..."
- "Vous pouvez réserver ensemble..."

**Future Booking:**
- Mention combined bookings: "Vous pouvez réserver le riad et le trek ensemble"
- Sets expectation for future multi-experience checkout

---

## Implementation Files

### Tool Definition
- `/src/lib/ai/tools/get-linked-experiences.ts` - Tool implementation
- `/src/lib/ai/tools/index.ts` - Export

### API Integration
- `/src/app/api/ai/chat/route.ts` - Added to production chat
- `/src/app/api/ai/test/chat/route.ts` - Added to test API

### System Prompt
- `/src/lib/ai/system-prompt.ts` - Added LINKED EXPERIENCES section
  - When to show
  - How to present
  - Example flows

---

## Usage Examples

### Example 1: Lodge with Activities

**Database:**
```sql
INSERT INTO experience_links (source_experience_id, target_experience_id)
VALUES
  ('riad-saida-uuid', 'trek-imlil-uuid'),
  ('riad-saida-uuid', 'cooking-class-uuid');
```

**User Flow:**
```
User: "Je cherche un riad à Imlil"
AI: [Shows Riad Saida with searchExperiences]

User: "Parfait, je prends ça"
AI: [Calls getLinkedExperiences('riad-saida-uuid')]
Response: "Excellent choix ! Ce riad propose aussi :
- Trek guidé dans l'Atlas (3 jours) - 1500 MAD/personne
- Cours de cuisine berbère - 300 MAD/personne
Voulez-vous réserver l'un de ces avec votre séjour ?"
```

### Example 2: Trek with Lodging

**Database:**
```sql
INSERT INTO experience_links (source_experience_id, target_experience_id)
VALUES
  ('trek-imlil-uuid', 'auberge-imlil-uuid');
```

**User Flow:**
```
User: "Un trek de 3 jours à Imlil"
AI: [Shows trek details]

User: "C'est quoi pour l'hébergement ?"
AI: [Calls getLinkedExperiences('trek-imlil-uuid')]
Response: "Pour l'hébergement avant et après le trek, nous recommandons l'Auberge Imlil à 400 MAD/nuit. Elle est située à 5 minutes du point de départ."
```

---

## Testing

### Test API
```bash
# Test linked experiences
curl -X POST http://localhost:3000/api/ai/test/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Ce riad me plaît"
  }'
```

**Expected Response:**
- AI calls `getLinkedExperiences`
- Shows linked activities/treks
- Mentions combined booking option

---

## Future Enhancements

### Phase 1 (Current)
- ✅ AI suggests linked experiences
- ✅ Visual cards for linked experiences
- ✅ Natural language presentation

### Phase 2 (Next)
- [ ] Multi-experience checkout flow
- [ ] Combined pricing/discounts
- [ ] Package deals (lodge + activity bundles)

### Phase 3 (Future)
- [ ] AI creates custom packages
- [ ] Dynamic pricing for bundles
- [ ] Availability coordination across multiple experiences

---

## Database Maintenance

### Adding Links
```sql
-- Link a lodge to an activity
INSERT INTO experience_links (source_experience_id, target_experience_id)
SELECT
  (SELECT id FROM experiences WHERE title = 'Riad Saida Atlas'),
  (SELECT id FROM experiences WHERE title = 'Trek Imlil 3 jours');
```

### Viewing Links
```sql
SELECT
  e1.title AS source,
  e2.title AS target,
  e2.type AS target_type
FROM experience_links el
JOIN experiences e1 ON el.source_experience_id = e1.id
JOIN experiences e2 ON el.target_experience_id = e2.id;
```

### Removing Links
```sql
DELETE FROM experience_links
WHERE source_experience_id = 'uuid' AND target_experience_id = 'uuid';
```

---

## Notes

- Links are directional: A → B doesn't mean B → A
- To create bidirectional links, insert both directions
- Only published experiences are shown to users
- Links are loaded dynamically when needed (not in catalog context)
- Room information is automatically included for lodging links
