# Agent Instructions

You are an automated coding agent running on a schedule. Follow this workflow strictly.

**IMPORTANT:** Before starting any task, read `PLAN/KNOWLEDGE.md` for project context, architecture, and conventions.

## Workflow

### 1. Always start from `main`
- Run `git checkout main && git pull origin main` to ensure you're on the latest `main`
- All task discovery happens from `main` — never start from a task branch

### 2. Pick a task
- Scan all task files in `PLAN/tasks/` on `main` for `status: todo`
- **Skip** any task whose `depends_on` list contains IDs that are NOT `status: done`
- From eligible tasks, pick by priority: urgent > high > medium > low
- If same priority, pick the lowest ID first
- If no eligible `todo` tasks exist, stop — do nothing

### 3. Check if the task was already started
- Check if a branch exists for this task: `git branch -a --list "*task/<id>-*"`
- **If branch exists:** the task was started in a previous run
  - Switch to the branch: `git checkout task/<id>-<slug>`
  - Read the task file's `## Checklist` — checked items are DONE, unchecked remain
  - Read the latest `## Agent Log` entry to understand what was done last
  - **Resume from where you left off** — do NOT redo completed checklist items
  - Skip to step 5 (Implement)
- **If no branch exists:** this is a fresh start
  - Continue to step 4

### 4. Start work (new tasks only)
- Create a new git branch from `main`: `git checkout -b task/<id>-<short-slug>`
- Update the task file: set `status: in_progress` and `updated: <today>`
- Read the full task description and acceptance criteria
- **Understand the data model first:** Read relevant Supabase migrations in `supabase/migrations/` and types in `src/types/`
- **Check the mobile app** (`/Users/naimabdelkerim/Code/travel/apps/mobile/`) for design reference on UI tasks
- **Break the work into small steps** and write them as a checklist under `## Checklist`
- Each step should be small enough to complete in ~5 minutes
- Commit the checklist to the task file before starting implementation

### 5. Implement
- Follow the task's description and acceptance criteria exactly
- Do NOT add extra features or refactor unrelated code

**Architecture rules:**
- **Database migrations** go in `supabase/migrations/` — never create migration files anywhere else
- **Shared types** go in `src/types/` — web-specific types go in `src/types/`
- **UI components** use shadcn/ui + Tailwind CSS — no inline styles, no CSS modules
- **Data fetching** uses Supabase client + TanStack Query for caching
- **AI features** use Vercel AI SDK (`useChat`, `streamText`, tool definitions)
- **Design reference:** Check `/Users/naimabdelkerim/Code/travel/apps/mobile/` for the corresponding screen to match UX patterns

**After completing each checklist step:**
  - Check it off (`- [x]`) in the task file
  - Update `progress:` percentage in frontmatter
  - Commit with message: `task(ID): step description`
  - These frequent commits are your **save points** for resumption
- Append what you did under `## Agent Log` with a dated entry

### 6. Submit and merge
- Set `status: done`, `progress: 100`, and `updated: <today>` in the task file
- Ensure all checklist items are checked
- Commit all remaining changes on the task branch
- Push the branch: `git push -u origin task/<id>-<slug>`
- Create a PR and auto-merge:
  ```
  gh pr create --base main --head task/<id>-<slug> \
    --title "task(<id>): <title>" \
    --body "Automated task. See PLAN/tasks/<id>-*.md for details."
  gh pr merge --merge --auto
  ```
- Switch back to main: `git checkout main`

### 7. Handle review feedback
- If a task has `status: todo` AND `attempts > 0`, it was sent back from review
- Read the `## Review Notes` section for feedback
- Address ALL feedback points before resubmitting
- Increment `attempts` count

## Rules
- **Always start from `main`** — discover tasks on main, check branches for progress
- **ONE task at a time** — never work on multiple tasks simultaneously
- **Commit after each checklist step** — this is your crash recovery mechanism
- **Max 3 attempts** — if `attempts >= 3`, set `status: blocked` and stop
- **Never skip tests** — if tests fail, fix them before submitting
- **Never modify other task files** — only touch the task you're working on
- **Append, don't overwrite** agent logs — each run gets a new dated entry
- **Git root** is at `/travel-web/` (this repository root)
- **Supabase migrations** always go in `supabase/migrations/` — never elsewhere
- **Check data schema** before implementing — read relevant migrations and `src/types/supabase.ts`
- **Mobile app is design reference** — check `/Users/naimabdelkerim/Code/travel/apps/mobile/app/` for the corresponding screen before building any UI
- **Never loop on blocked steps** — if a step requires something unavailable (network, external service, credentials), mark it as skipped with a note, set `progress: 100`, and submit. Do NOT retry the same blocked step across multiple runs.
- **Max 2 retries on environment-blocked steps** — if you've logged the same blocked step twice, skip it on the third run.
