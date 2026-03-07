---
id: "000"
title: "Task title here"
status: todo              # todo | in_progress | review | done | blocked
priority: medium          # low | medium | high | urgent
created: YYYY-MM-DD
updated: YYYY-MM-DD
assigned: codex           # codex | human | review-agent
branch: null
pr: null
attempts: 0
depends_on: []            # list of task IDs that must be done first
progress: 0               # percentage 0-100, updated by agent
---

## Description
<!-- What needs to be done and why -->

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Context
<!-- Relevant files, docs, links, or background info -->
<!-- IMPORTANT: List relevant Supabase tables/migrations and mobile app screens -->
<!-- Example:
  - Schema: infra/supabase/migrations/20251004002801_create_experience_tables.sql
  - Types: packages/types/src/experience.ts
  - Mobile reference: apps/mobile/app/(user)/explore/index.tsx
-->

## Checklist
<!-- Agent breaks the task into small steps and checks them off as it goes.
     This is the KEY to resumability -- the agent knows exactly where it stopped. -->
- [ ] Step 1: Read relevant Supabase schema and understand data model
- [ ] Step 2: Check mobile app for design reference
- [ ] Step 3: ...

## Review Notes
<!-- Reviewer fills this in when sending back to TODO -->

## Agent Log
<!-- Agent appends entries here. Each run gets a dated entry. -->
