# Architecture

The application uses Next.js for the web experience, FastAPI for business operations, and Supabase for PostgreSQL, authentication, storage, and row-level security.

```text
Browser -> Next.js -> FastAPI -> Supabase PostgreSQL
   |           |          |
   +---- Supabase Auth ---+
               |
        Supabase Storage
```

FastAPI owns booking availability, pricing, status changes, and privileged mutations. Next.js owns rendering, navigation, forms, and the Supabase session lifecycle. Supabase RLS provides a second authorization boundary around persisted data.

