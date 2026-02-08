# AI Agent Test API

Test the AI agent's behavior programmatically using curl commands.

## Endpoints

### POST /api/ai/test/chat
Main test endpoint for chatting with the AI agent.

**Request:**
```json
{
  "message": "Your message here",
  "conversation_id": "optional-uuid-for-context",
  "reset_context": false
}
```

**Response:**
```json
{
  "conversation_id": "uuid",
  "message": "AI's response text",
  "tool_calls": [
    {
      "tool": "searchExperiences",
      "arguments": { "query": "...", "city": "...", "limit": 3 },
      "result": { "success": true, "count": 3, "results": [...] }
    }
  ],
  "metadata": {
    "model": "gpt-4.1-mini",
    "tokens_used": 1234,
    "prompt_tokens": 890,
    "completion_tokens": 344,
    "response_time_ms": 856,
    "finish_reason": "stop",
    "steps": 2
  }
}
```

### POST /api/ai/test/reset
Reset conversation context.

**Request:**
```json
{
  "conversation_id": "uuid-to-reset"
}
```

---

## Test Scenarios

### 1. Greeting (No Search)

```bash
curl -X POST http://localhost:3000/api/ai/test/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

**Expected:**
- `tool_calls`: Empty array
- `message`: Greeting in English
- No searchExperiences called

---

### 2. Broad Query (City Only)

```bash
curl -X POST http://localhost:3000/api/ai/test/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "je veux aller à marrakech"}'
```

**Expected:**
- `tool_calls[0].tool`: "searchExperiences"
- `tool_calls[0].arguments.city`: "marrakech"
- `tool_calls[0].arguments.limit`: 3
- `tool_calls[0].result.count`: 3 (diverse types)
- `message`: Contains question about type preference

---

### 3. Specific Query with Price Constraint

```bash
curl -X POST http://localhost:3000/api/ai/test/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "je veux passer quelques jour à imlil, max 300 par nuit"}'
```

**Expected:**
- `tool_calls[0].tool`: "searchExperiences"
- `tool_calls[0].arguments.region`: "Imlil" (NOT city)
- `tool_calls[0].arguments.type`: "lodging"
- `tool_calls[0].arguments.max_price_mad`: 300
- `tool_calls[0].arguments.limit`: 1
- `tool_calls[0].result.count`: 1 (or 0 with fallback)
- `message`: Mentions specific room with price

---

### 4. Type Only Query

```bash
curl -X POST http://localhost:3000/api/ai/test/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "je cherche un riad"}'
```

**Expected:**
- `tool_calls[0].tool`: "searchExperiences"
- `tool_calls[0].arguments.type`: "lodging"
- `tool_calls[0].arguments.limit`: 2
- `tool_calls[0].result.count`: 2 (different locations)
- `message`: Asks for location preference

---

### 5. Specific Query with Details

```bash
curl -X POST http://localhost:3000/api/ai/test/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "riad romantique à marrakech"}'
```

**Expected:**
- `tool_calls[0].tool`: "searchExperiences"
- `tool_calls[0].arguments.query`: Contains "romantique"
- `tool_calls[0].arguments.city`: "marrakech"
- `tool_calls[0].arguments.type`: "lodging"
- `tool_calls[0].arguments.limit`: 1
- `message`: Personal recommendation with room details

---

### 6. Multi-Turn Conversation

```bash
# First message
CONV_ID=$(curl -s -X POST http://localhost:3000/api/ai/test/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "je cherche un riad à marrakech"}' \
  | jq -r '.conversation_id')

echo "Conversation ID: $CONV_ID"

# Second message (with context)
curl -X POST http://localhost:3000/api/ai/test/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"parfait je réserve\", \"conversation_id\": \"$CONV_ID\"}"
```

**Expected:**
- Second call uses checkAvailability tool
- AI remembers the experience from first message

---

### 7. Booking Intent

```bash
# This requires a conversation context with a previous experience shown
# Follow the multi-turn example above
```

**Expected:**
- `tool_calls[0].tool`: "checkAvailability"
- Uses experience_id from previous result

---

## Validation Script

Create a test validation script:

```bash
#!/bin/bash
# test-ai-agent.sh

API_URL="http://localhost:3000/api/ai/test/chat"

echo "=== Test 1: Greeting ==="
RESPONSE=$(curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}')

echo "$RESPONSE" | jq '.'
TOOL_COUNT=$(echo "$RESPONSE" | jq '.tool_calls | length')
echo "✓ Tool calls: $TOOL_COUNT (expected: 0)"
echo ""

echo "=== Test 2: Broad Query ==="
RESPONSE=$(curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"message": "je veux aller à marrakech"}')

echo "$RESPONSE" | jq '.'
LIMIT=$(echo "$RESPONSE" | jq -r '.tool_calls[0].arguments.limit')
echo "✓ Limit: $LIMIT (expected: 3)"
echo ""

echo "=== Test 3: Price Constraint ==="
RESPONSE=$(curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"message": "je veux passer quelques jour à imlil, max 300 par nuit"}')

echo "$RESPONSE" | jq '.'
REGION=$(echo "$RESPONSE" | jq -r '.tool_calls[0].arguments.region')
TYPE=$(echo "$RESPONSE" | jq -r '.tool_calls[0].arguments.type')
MAX_PRICE=$(echo "$RESPONSE" | jq -r '.tool_calls[0].arguments.max_price_mad')
echo "✓ Region: $REGION (expected: Imlil)"
echo "✓ Type: $TYPE (expected: lodging)"
echo "✓ Max Price: $MAX_PRICE (expected: 300)"
echo ""
```

Make it executable:
```bash
chmod +x test-ai-agent.sh
./test-ai-agent.sh
```

---

## Quick Assertions

Use `jq` to validate responses:

```bash
# Check tool was called
curl -s ... | jq '.tool_calls[0].tool'

# Check limit
curl -s ... | jq '.tool_calls[0].arguments.limit'

# Check result count
curl -s ... | jq '.tool_calls[0].result.count'

# Check message language
curl -s ... | jq '.message'
```

---

## Notes

- Conversation state is stored in-memory (not persistent)
- Reset the server to clear all conversations
- Use `conversation_id` to maintain context across messages
- Set `reset_context: true` to start fresh with same conversation_id
