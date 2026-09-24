# Hotel Management System frontend

Next.js App Router frontend for the local Hotel Management System.

## Run

Start the FastAPI service at `http://localhost:8000`, then:

```powershell
npm install
npm run dev
```

Open <http://localhost:3000>. `NEXT_PUBLIC_API_URL` is optional and defaults to `http://localhost:8000`.

## Commands

- `npm run lint` — ESLint
- `npm run typecheck` — generated Next.js route types and TypeScript
- `npm test` — Vitest unit/component tests
- `npm run build` — production build
- `npm run verify` — complete static/unit/build gate
- `npm run test:e2e` — Playwright desktop/mobile journeys; requires both local services
- `npm run generate:api` — regenerate `src/lib/api-schema.d.ts` from the running FastAPI OpenAPI document

Authentication uses the FastAPI-issued `hms_session` HttpOnly cookie. Browser mutations send credentials to the configured local API, and protected Server Components forward the cookie to FastAPI for authorization.
