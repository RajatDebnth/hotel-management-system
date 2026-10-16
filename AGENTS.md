# Project Working Instructions

## Source of truth

- Read `PROJECT_STATUS.md` before implementation work.
- Read the relevant section of `BUILD_PLAN.md` before changing architecture or product scope.
- Update `PROJECT_STATUS.md` when a feature, blocker, or operational limitation changes.

## Implementation rules

- Preserve the architecture in `BUILD_PLAN.md` unless a documented technical constraint requires a change.
- Use Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui for the frontend.
- Use FastAPI, Pydantic, SQLAlchemy async, aiosqlite, and versioned SQLite initialization for the backend.
- Use signed HttpOnly cookies for authentication and confined local filesystem storage for room media.
- FastAPI owns booking rules, pricing, availability, authentication, and privileged mutations.
- Never expose or commit passwords, session keys, tokens, runtime databases, customer data, or `.env` files.
- Keep `.env.example` files limited to safe placeholder values.
- Do not weaken authentication, authorization, CSRF, ownership checks, or database invariants to make tests pass.
- Prevent overlapping active bookings at both the service and SQLite trigger/transaction levels.
- Preserve unrelated changes and add comments only where they clarify non-obvious behavior.

## Verification rules

- Use focused checks while iterating on small changes.
- Run the complete verification suite before a release or when explicitly requested.
- Add meaningful tests for business rules, authorization boundaries, SQLite invariants, and regressions.
- For UI changes, inspect desktop and mobile layouts when browser tooling is available.
- Review authentication, authorization, secrets, input validation, session behavior, and error responses before completing security-sensitive work.
