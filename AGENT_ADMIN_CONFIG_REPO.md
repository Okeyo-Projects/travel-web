# Agent Admin Config (Repo-Accurate)

## Scope
This document maps the AI agent configuration system to the **current repository layout**:

- Runtime chat app: `apps/web` (Next.js App Router)
- Admin dashboard: `apps/admin` (Vite + TanStack Router)
- Database: `infra/supabase/migrations`

Goal: allow admins to manage multiple agent config versions while keeping exactly one active/published version.

## Current Runtime Flow

`apps/web/src/app/api/ai/chat/route.ts`

1. Receives chat request (`messages`, `sessionId`, `userLocation`, optional `configVersionId`)
2. Loads active agent config from Supabase (`ai_agent_configs` + `ai_agent_config_versions`)
3. Compiles prompt template if present; otherwise falls back to `buildSystemPrompt(...)`
4. Appends catalog context from `loadCatalogContext()`
5. Filters enabled tools according to config
6. Calls `streamText` with dynamic `model`, `temperature`, and `maxSteps`

## Database Model

Migration: `infra/supabase/migrations/20260208170000_create_ai_agent_config_tables.sql`

Tables:

- `ai_agent_configs`
  - top-level config by slug (`booking-agent`)
  - `active_version_id` points to the currently active version
- `ai_agent_config_versions`
  - full behavior snapshot per version (`draft|published|archived`)
  - model controls (`model`, `temperature`, `max_steps`)
  - prompt controls (`system_prompt`, `system_prompt_variables`)
  - tool controls (`enabled_tools`, `tool_overrides`)
  - UI content (`welcome_messages`, `suggested_prompts`)
  - behavior/guardrails (`behavior_rules`, `guardrails`)

Guarantees:

- unique index enforces one published version per config.
- seed creates default `booking-agent` with an initial published version.

## Public Config API

`apps/web/src/app/api/ai/config/public/route.ts`

Returns safe fields for UI:

- `version_id`
- `fallback_language`
- `supported_languages`
- `welcome_messages`
- `suggested_prompts`

Used by chat welcome UI to render copy and prompt chips without redeploying frontend code.

## Admin Controls

Integrated into existing settings page:

- `apps/admin/src/features/settings/system/agent-config-manager.tsx`
- `apps/admin/src/features/settings/system/data/use-agent-config.ts`
- wired in `apps/admin/src/features/settings/system/index.tsx`

Capabilities implemented:

1. List all versions
2. Select and edit draft version fields
3. Duplicate selected version into new draft
4. Publish selected version (archives previous published and updates active version pointer)

## Prompt Compilation

`apps/web/src/lib/ai/prompt-builder.ts`

Supported placeholders:

- `{{TODAY_DATE}}`
- `{{AVAILABLE_TOOLS}}`
- `{{BEHAVIOR_RULES}}`
- `{{GUARDRAILS}}`
- plus keys from `system_prompt_variables`

If no prompt template is stored, runtime uses existing hardcoded prompt logic.

## Incremental Rollout Plan

1. Deploy migration
2. Deploy `apps/web` changes (dynamic loader + public config endpoint)
3. Deploy `apps/admin` changes (editor/publish controls)
4. Start with simple edits (welcome copy, suggested prompts, model/temperature)
5. Move to full prompt-template editing after operational validation

## Next Enhancements

1. Add publish RPC for atomic version switch and audit logs
2. Add analytics table integration for version-level outcomes
3. Add preview mode in chat (force `configVersionId` from admin UI)
4. Add validation for prompt placeholders and JSON schema in admin form
