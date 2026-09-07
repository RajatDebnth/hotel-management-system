# Codex Project Instructions

## Source of truth

- Read `CODEX_RUNBOOK.md` before starting implementation work.
- Read the relevant section of `BUILD_PLAN.md` before implementing a step.
- `CODEX_RUNBOOK.md` is the execution tracker. Update it after every completed or blocked step.
- `BUILD_PLAN.md` defines the intended architecture and product scope.

## Meaning of "do next"

When the user says `do next`, `continue`, or an equivalent instruction:

1. Inspect the workspace and Git status.
2. Read the Current State section in `CODEX_RUNBOOK.md`.
3. Select the first step whose status is `READY`.
4. Confirm that its prerequisites are satisfied through read-only checks.
5. Implement the complete step without asking the user to repeat its requirements.
6. Run the checks listed for that step.
7. Update `CODEX_RUNBOOK.md`:
   - mark the step `DONE` only if its acceptance checks pass;
   - mark the following eligible step `READY`;
   - record important decisions, commands, migrations, and remaining limitations;
   - update the Current State section.
8. Report using the required completion format below.

If a prerequisite requires user-owned credentials, account setup, payment, production deployment approval, or another action Codex cannot safely perform, complete all unblocked local work first. Then mark the step `WAITING`, record the exact blocker, and give the user the shortest possible action list.

## Implementation rules

- Work on one runbook step at a time unless the user explicitly requests a different scope.
- Preserve the architecture in `BUILD_PLAN.md` unless a discovered technical constraint requires a change.
- Use Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui for the frontend.
- Use FastAPI, Pydantic, SQLAlchemy async, Alembic, and PostgreSQL for the API and data layer.
- Use Supabase for PostgreSQL, Auth, Storage, and RLS.
- FastAPI owns booking rules, pricing, availability, and privileged mutations.
- Never expose or commit Supabase secret/service-role keys, database passwords, access tokens, or `.env` files.
- Keep `.env.example` files current with placeholder values only.
- Never weaken RLS or authorization merely to make a test pass.
- Prevent overlapping active bookings at both service and PostgreSQL constraint levels.
- Keep changes scoped; preserve unrelated user edits.
- Add comments only where they clarify non-obvious behavior.

## Verification rules

- Run the checks specified by the active step.
- Add meaningful tests for business rules, authorization boundaries, RLS, and regressions.
- Do not mark a step complete when required checks fail.
- If a failure is unrelated to the step, document the evidence clearly and avoid rewriting unrelated code.
- For UI steps, inspect the rendered result at desktop and mobile sizes when browser tooling is available.
- Before completing security-sensitive work, review authentication, authorization, secret handling, input validation, and error responses.

## Required response after each step

Use this concise structure:

### Done

- What was implemented.
- Important files or migrations changed.

### Verification

- Commands/checks run and their results.

### Current state

- Active completed step.
- Whether the app is runnable and what currently works.

### Next step

- Step number and objective.

### Prerequisites for next step

- State `None` when no user action is required.
- Otherwise list only exact values/actions needed, where to obtain them, and where the user should store them locally.

End with: `Say "do next" when you want me to continue.`

