# AI-Guided Booking Flow (Hybrid Approach)

## Overview
Hybrid booking flow where AI guides the conversation and collects booking details, then user confirms with a click to proceed to payment. Best of both conversational UX and user control.

---

## Architecture

### Database Schema

**bookings** - Main container
```sql
- id (PK)
- guest_id
- experience_id (main/backward compat)
- host_id
- from_date, to_date
- adults, children, infants
- rooms (JSONB)
- status (draft, pending_payment, confirmed, etc.)
- price_* fields
- metadata
```

**booking_items** - Multi-experience support
```sql
- id (PK)
- booking_id (FK → bookings)
- experience_id (FK → experiences)
- host_id
- from_date, to_date
- adults, children, infants
- departure_id (for trips)
- session_id (for activities)
- rooms (JSONB for lodging)
- price_* fields
- order_index
```

**Relationship:**
- One booking → Many booking_items
- Each item represents one experience
- Enables multi-experience bookings (main + linked)

---

## AI Tool: `createBookingIntent`

### Purpose
Creates draft booking when user wants to reserve, collecting all details from conversation.

### Input Schema
```typescript
{
  items: [
    {
      experience_id: "uuid",
      from_date: "2026-02-15",  // YYYY-MM-DD
      to_date: "2026-02-17",
      adults: 2,
      children: 0,
      infants: 0,
      rooms: [{room_type_id: "uuid", quantity: 1}], // lodging only
      departure_id: "uuid", // trips only
      session_id: "uuid", // activities only
      guest_notes: "Anniversary trip"
    }
  ],
  promotion_code: "WINTER2026" // optional
}
```

### What It Does
1. **Validates user authentication** (returns requires_auth if not logged in)
2. **Validates each experience** (exists, published, type)
3. **Gets pricing quote** via `get_booking_quote` RPC for each item
4. **Creates draft booking** (status='draft')
5. **Creates booking_items** for each experience
6. **Returns summary** with checkout_url

### Output
```typescript
{
  success: true,
  booking_id: "uuid",
  checkout_url: "/checkout/uuid",
  summary: {
    booking_id: "uuid",
    total_cents: 5600,
    currency: "MAD",
    items: [
      {
        experience_title: "Riad Saida Atlas",
        experience_type: "lodging",
        from_date: "2026-02-14",
        to_date: "2026-02-18",
        adults: 2,
        children: 0,
        nights: 4,
        rooms: [{room_type_id: "...", quantity: 1}],
        subtotal_cents: 2600,
        total_cents: 2600
      },
      {
        experience_title: "Trek Atlas 3 jours",
        experience_type: "trip",
        from_date: "2026-02-15",
        to_date: "2026-02-17",
        adults: 2,
        nights: 3,
        subtotal_cents: 3000,
        total_cents: 3000
      }
    ]
  }
}
```

---

## User Flow Examples

### Single Experience Booking

```
1. User: "Je cherche un riad à Marrakech"
   AI: [Shows Riad Saida Atlas card]

2. User: "Parfait, je veux réserver pour ce weekend"
   AI: "Super choix ! Quelle chambre préférez-vous ?"
       [Shows room options with prices]

3. User: "La Suite Romantique"
   AI: [Calculates weekend dates: Feb 15-17]
       "Parfait ! Voici ce que je prépare :
       - Riad Saida Atlas
       - Suite Romantique (650 MAD/nuit)
       - 15-17 février 2026 (2 nuits)
       - 2 adultes
       - Total: 1300 MAD

       Je confirme la réservation ?"

4. User: "Oui confirme"
   AI: [Calls createBookingIntent]
       "✅ Votre réservation est prête !

       📋 Résumé:
       Riad Saida Atlas
       • Suite Romantique
       • 15-17 février (2 nuits)
       • 2 adultes
       💰 Total: 1300 MAD

       [Button: Continuer vers le paiement]"

5. User: [Clicks button]
   → Opens /checkout/{booking_id}
   → Pre-filled with all details
   → User completes payment
```

### Multi-Experience Booking

```
1. User: "Je veux un riad à Imlil"
   AI: [Shows Riad]
       [Calls getLinkedExperiences]
       "Ce riad propose aussi un trek de 3 jours dans l'Atlas.
       Voulez-vous voir ?"

2. User: "Oui montre-moi"
   AI: [Shows trek card]

3. User: "Parfait, je veux réserver les deux"
   AI: "Excellent choix ! Je prépare votre séjour complet.

       Pour le riad, quelle chambre ?"

4. User: "Chambre Double"
   AI: "Et pour le trek, quelle date ?"

5. User: "Le deuxième jour de mon séjour"
   AI: "Parfait ! Voici votre séjour complet :

       1️⃣ Riad Saida Atlas
       • Chambre Double
       • 14-18 février (4 nuits)
       • 2 adultes
       • 2400 MAD

       2️⃣ Trek Atlas 3 jours
       • 15-17 février
       • Guide + repas inclus
       • 2 adultes
       • 3000 MAD

       💰 Total: 5400 MAD

       Je confirme votre séjour ?"

6. User: "Oui"
   AI: [Calls createBookingIntent with items:[riad, trek]]
       "✅ Séjour complet prêt !
       [Shows combined summary]
       [Button: Réserver le séjour - 5400 MAD]"

7. User: [Clicks button]
   → Opens /checkout/{booking_id}
   → Shows both experiences
   → Single payment for everything
```

---

## AI Behavior Rules

### When to Create Booking

**✅ DO create when:**
- User explicitly says "je réserve", "je veux réserver", "je prends ça"
- After user confirms summary
- All required details collected (dates, guests, rooms for lodging)

**❌ DON'T create when:**
- User just browsing ("ça a l'air bien")
- Missing required info (no dates, no room selection)
- User hasn't confirmed
- Not authenticated (return requires_auth)

### Required Details

**For Lodging:**
- ✅ Dates (from, to)
- ✅ Guests (adults, children, infants)
- ✅ **Room selection** (MUST ask user to choose)
- Example: "Quelle chambre préférez-vous ? Suite Romantique (650 MAD) ou Chambre Double (450 MAD) ?"

**For Trips:**
- ✅ Dates
- ✅ Guests
- ✅ Specific departure (use checkAvailability to get options)

**For Activities:**
- ✅ Date
- ✅ Guests
- ✅ Specific session (use checkAvailability to get options)

### Multi-Experience Logic

**When user wants multiple:**
1. Collect details for each experience separately
2. Ensure dates are compatible (e.g., trek during lodge stay)
3. Create single booking with items array
4. Show combined total
5. Mention convenience: "Un seul paiement pour tout !"

---

## System Prompt Guidance

### Key Sections

**BOOKING FLOW** section includes:
- Required details per experience type
- Step-by-step process
- Multi-experience handling
- Error handling rules

**Critical Rules** updated:
- Guide user through booking
- Always confirm before creating
- Check availability first
- Handle authentication

---

## Error Handling

### User Not Authenticated
```json
{
  "success": false,
  "error": "User not authenticated...",
  "requires_auth": true
}
```

**AI Response:**
"Pour réserver, vous devez être connecté. Souhaitez-vous vous connecter ou créer un compte ?"

### Experience Not Available
```json
{
  "success": false,
  "error": "Experience not found..."
}
```

**AI Response:**
"Désolé, cette expérience n'est plus disponible. Voici des alternatives similaires..."

### Quote Fails
```json
{
  "success": false,
  "error": "Failed to get quote..."
}
```

**AI Response:**
"Désolé, je n'ai pas pu calculer le prix. Pouvez-vous essayer avec d'autres dates ? Ou contactez-nous directement."

### Availability Check Fails
**AI should:**
1. Call checkAvailability first
2. If fails, suggest alternatives
3. Don't create booking intent

---

## UI Components (Future Implementation)

### BookingSummaryCard (Chat UI)
```tsx
<Card className="booking-summary">
  <h3>✅ Réservation prête !</h3>

  {items.map(item => (
    <div>
      <h4>{item.experience_title}</h4>
      <p>{item.from_date} - {item.to_date}</p>
      <p>{item.adults} adultes</p>
      <p className="price">{item.total_cents / 100} MAD</p>
    </div>
  ))}

  <div className="total">
    <strong>Total: {summary.total_cents / 100} MAD</strong>
  </div>

  <Button onClick={() => router.push(summary.checkout_url)}>
    Continuer vers le paiement
  </Button>
</Card>
```

### Checkout Page
```
/checkout/[booking_id]/page.tsx
- Loads booking from database
- Shows full summary
- Collects payment info
- Calls payment provider
- Updates booking status to 'confirmed'
```

---

## Testing

### Test Single Experience
```bash
# Step 1: Search
curl -X POST http://localhost:3000/api/ai/test/chat \
  -d '{"message": "je cherche un riad à marrakech"}'

# Step 2: Book
curl -X POST http://localhost:3000/api/ai/test/chat \
  -d '{
    "message": "je réserve la suite romantique pour ce weekend",
    "conversation_id": "..."
  }'
```

**Expected:**
- AI calls `createBookingIntent`
- Returns booking summary with checkout_url
- Creates draft booking in database

### Test Multi-Experience
```bash
# Get linked experiences
curl -X POST http://localhost:3000/api/ai/test/chat \
  -d '{"message": "je veux ce riad"}'

# Book both
curl -X POST http://localhost:3000/api/ai/test/chat \
  -d '{
    "message": "je réserve le riad et le trek ensemble",
    "conversation_id": "..."
  }'
```

**Expected:**
- AI asks for room choice
- AI confirms dates for both
- Creates booking with 2 items
- Shows combined summary

---

## Database Queries

### View Booking with Items
```sql
SELECT
  b.id AS booking_id,
  b.status,
  b.price_total_cents / 100.0 AS total_mad,
  bi.experience_id,
  e.title AS experience_title,
  bi.from_date,
  bi.to_date,
  bi.adults,
  bi.price_total_cents / 100.0 AS item_total_mad
FROM bookings b
JOIN booking_items bi ON bi.booking_id = b.id
JOIN experiences e ON e.id = bi.experience_id
WHERE b.id = 'booking-uuid';
```

### Check User's Bookings
```sql
SELECT
  b.id,
  b.status,
  b.created_at,
  COUNT(bi.id) AS items_count,
  SUM(bi.price_total_cents) / 100.0 AS total_mad
FROM bookings b
LEFT JOIN booking_items bi ON bi.booking_id = b.id
WHERE b.guest_id = 'user-uuid'
GROUP BY b.id
ORDER BY b.created_at DESC;
```

---

## Next Steps

### Phase 1 (Current) ✅
- ✅ AI tool created
- ✅ System prompt updated
- ✅ Multi-experience support

### Phase 2 (Next)
- [ ] Update chat UI to show BookingSummaryCard
- [ ] Implement /checkout/[booking_id] page
- [ ] Add payment integration
- [ ] Update booking status flow

### Phase 3 (Future)
- [ ] Package deals (bundles with discounts)
- [ ] Coordinated availability across experiences
- [ ] AI suggests optimal itineraries
- [ ] Dynamic pricing for bundles

---

## Files Modified

1. `/src/lib/ai/tools/create-booking-intent.ts` - New tool
2. `/src/lib/ai/tools/index.ts` - Export
3. `/src/app/api/ai/chat/route.ts` - Add tool
4. `/src/app/api/ai/test/chat/route.ts` - Add tool
5. `/src/lib/ai/system-prompt.ts` - Add BOOKING FLOW section
