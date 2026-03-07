#!/bin/bash
# Usage: ./PLAN/new-task.sh "Task title" [priority]
# Creates a new task from template with auto-incremented ID

set -e

PLAN_DIR="$(cd "$(dirname "$0")" && pwd)"
TASKS_DIR="$PLAN_DIR/tasks"
TITLE="${1:?Usage: new-task.sh \"Task title\" [priority]}"
PRIORITY="${2:-medium}"
TODAY=$(date +%Y-%m-%d)

# Find next ID
LAST_ID=$(ls "$TASKS_DIR"/*.md 2>/dev/null | grep -v _TEMPLATE | sed 's/.*\///' | sed 's/-.*//' | sort -n | tail -1)
if [ -z "$LAST_ID" ]; then
  NEXT_ID="001"
else
  NEXT_NUM=$((10#$LAST_ID + 1))
  NEXT_ID=$(printf "%03d" $NEXT_NUM)
fi

# Create slug from title
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-' | head -c 40)
FILENAME="${NEXT_ID}-${SLUG}.md"

# Create task from template
sed -e "s/\"000\"/\"$NEXT_ID\"/" \
    -e "s/Task title here/$TITLE/" \
    -e "s/status: todo/status: todo/" \
    -e "s/priority: medium/priority: $PRIORITY/" \
    -e "s/YYYY-MM-DD/$TODAY/g" \
    "$TASKS_DIR/_TEMPLATE.md" > "$TASKS_DIR/$FILENAME"

# Add to queue
echo "- $NEXT_ID" >> "$PLAN_DIR/_queue.md"

echo "Created: PLAN/tasks/$FILENAME"
echo "Added to queue with ID: $NEXT_ID"
