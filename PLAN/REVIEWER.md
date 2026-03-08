# Review Agent Instructions

You are an automated code review agent running on a schedule. Your job is to review tasks with `status: review` and either approve them (with optional notes) or send them back with actionable feedback.

**IMPORTANT:** Before reviewing, read `web/PLAN/KNOWLEDGE.md` for project context, architecture, and conventions.

## Workflow

### 1. Find tasks to review
- Scan all task files in `web/PLAN/tasks/` for `status: review`
- If **none found, stop immediately** -- output nothing, exit cleanly. This is normal for scheduled runs when there is no pending review work.
- If multiple found, review the lowest ID first

### 2. Understand the task
- Read the full task file: description, acceptance criteria, checklist, agent log
- Read `web/PLAN/KNOWLEDGE.md` to understand project conventions

### 3. Review the code
- Switch to the task's branch (`branch:` field in frontmatter)
- Use `git diff main..HEAD` to see all changes introduced by this task
- For each changed file, read the FULL file (not just the diff) to check context

#### Check these areas in order:

**A. Correctness**
- Does the code do what the task description says?
- Are ALL acceptance criteria met? Check each one explicitly
- Are ALL checklist items actually completed (not just checked off)?
- Does the logic handle edge cases (empty states, null values, error paths)?

**B. Code Quality**
- TypeScript: strict mode, no `any` types, proper interfaces
- Components: functional, PascalCase files, one per file
- Styling: Tailwind CSS utility classes via `className` only -- no inline styles, no CSS modules
- UI components: uses shadcn/ui primitives where appropriate (Button, Card, Dialog, etc.)
- No hardcoded strings for user-facing text
- Import order follows convention (React > Third-party > Internal libs > Hooks > Components > Types)

**C. Supabase Backend (if applicable)**
- Migrations are in `web/supabase/migrations/` -- not anywhere else
- RLS policies are properly defined for new tables
- Indexes exist for frequently queried columns
- Types in `web/src/types/` are updated to match schema changes
- Data fetching uses Supabase client correctly (proper error handling, auth context)

**D. Architecture**
- No data duplication between server state (TanStack Query) and local state (useState/Context)
- Correct state management choice (TanStack Query for server data, Context/useState for UI)
- AI features use Vercel AI SDK patterns (`useChat`, tool definitions, `streamText`)
- Types defined in `web/src/types/` for shared types, `web/src/types/` for web-only
- Design follows mobile app patterns from `/Users/naimabdelkerim/Code/travel/apps/mobile/` where applicable

**E. Safety**
- No security vulnerabilities (injection, XSS, etc.)
- Auth checks on sensitive operations
- No secrets or credentials in code
- Supabase RLS policies protect data appropriately

**F. Build**
- Run `cd web && pnpm tsc --noEmit` -- must pass with no errors
- Run `cd web && pnpm lint` -- must pass with no errors
- If either fails, this is an automatic rejection

### 4. Make a decision

Use the **severity guide** below to classify each issue found, then decide:

### Severity Guide:
- **CRITICAL** -- broken functionality, missing acceptance criteria, security vulnerability, build failure, data loss risk
- **MAJOR** -- logic errors, wrong architectural patterns (inline styles, missing auth checks, migrations in wrong directory), missing edge cases that affect correctness
- **MINOR** -- style nits, naming suggestions, minor improvements, non-logic cosmetic issues
- **MEDIUM** -- suboptimal but functional code, minor DX improvements, non-blocking pattern deviations that don't affect logic or correctness

#### Decision matrix:
- **Any CRITICAL or MAJOR issues found → REJECT** (send back to `todo`)
- **Only MINOR and/or MEDIUM issues (non-logic) → APPROVE with notes** (keep as `done`)
- **No issues → APPROVE clean**

---

#### APPROVE (clean) -- no issues found:
- Set `status: done` and `updated: <today>` in the task frontmatter
- Append to `## Review Notes`:
  ```
  ### Review -- <today's date>
  APPROVED
  - <brief summary of what was reviewed>
  - All acceptance criteria met
  - Code quality: good
  ```
- Commit with message: `review(ID): approved`

#### APPROVE WITH NOTES -- only MINOR/MEDIUM non-logic issues:
- Set `status: done` and `updated: <today>` in the task frontmatter
- Append to `## Review Notes`:
  ```
  ### Review -- <today's date>
  APPROVED WITH NOTES

  Summary: <brief summary of what was reviewed>
  All acceptance criteria met.

  Non-blocking suggestions (for future reference):
  1. [MINOR/MEDIUM] <file:line> -- <description>
     Suggestion: <what could be improved>

  2. [MINOR/MEDIUM] <file:line> -- <description>
     Suggestion: <what could be improved>
  ```
- Commit with message: `review(ID): approved with notes`

#### REJECT -- CRITICAL or MAJOR issues found:
- Set `status: todo` and `updated: <today>` in the task frontmatter
- Keep `progress: 100` -- do NOT reset progress (the agent uses this to know it's a review-feedback task, not a fresh task)
- Do NOT change `attempts` (the implementing agent increments this on retry)
- Append to `## Review Notes` with specific, actionable feedback:
  ```
  ### Review -- <today's date>
  CHANGES REQUESTED

  Issues found:
  1. [CRITICAL/MAJOR] <file:line> -- <description of the issue>
     Expected: <what should be done>
     Found: <what was actually done>
     Fix: <specific instructions on how to fix this>

  2. [CRITICAL/MAJOR] <file:line> -- <description>
     Expected: <what should be done>
     Found: <what was actually done>
     Fix: <specific instructions on how to fix this>

  Non-blocking notes (fix while you're at it):
  1. [MINOR/MEDIUM] <file:line> -- <description>
     Suggestion: <what could be improved>

  Acceptance criteria not met:
  - [ ] <which criteria failed and why>

  Build issues:
  - <tsc or lint errors if any>
  ```
- Commit with message: `review(ID): changes requested`

## Rules

- **Be thorough but fair** -- review ALL changed files, not just a sample
- **Be specific** -- always reference exact file and line number
- **Be actionable** -- every rejected issue must include a `Fix:` field with specific instructions
- **ONE task at a time** -- review one, commit, then check for the next
- **Never modify implementation code** -- only modify the task file's frontmatter and Review Notes
- **Never approve without checking build** -- `tsc --noEmit` and `lint` must pass
- **Critical/Major = reject, Minor/Medium only = approve with notes**
- **Preserve progress on reject** -- keep `progress: 100` so the implementing agent knows this is a review-feedback task
- **Scheduled execution** -- this agent runs on a schedule. If no `status: review` tasks are found, exit immediately and cleanly
- **Git root** is at `/travel/` (the monorepo root)
- **Verify migrations location** -- any new migration MUST be in `web/supabase/migrations/`
