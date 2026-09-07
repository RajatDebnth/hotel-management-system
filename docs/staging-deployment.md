# Staging deployment: Vercel + Render

This repository is a monorepo. Vercel deploys `frontend/`; Render deploys `backend/` through the root `render.yaml` Blueprint. Supabase remains the database, Auth, and Storage provider.

## 1. Publish the repository

Create a private GitHub repository and push the project. Confirm `.env`, `.env.local`, database dumps, and credentials are absent before the first push. Both Vercel and Render should be granted access only to this repository.

## 2. Render API

In Render, choose **New → Blueprint**, select the GitHub repository, and use the repository-root `render.yaml`. Before applying the Blueprint, enter these secret environment values from the existing ignored `backend/.env`:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `DATABASE_URL`

Initially set `FRONTEND_URL` to the exact Vercel URL after Step 3. The service uses `backend/` as its root, installs the package, binds Uvicorn to Render's `$PORT`, and checks `/api/v1/health`.

Copy the resulting base URL, such as `https://hotel-management-api.onrender.com`. Do not append `/api/v1` when storing it as the frontend API URL.

## 3. Vercel frontend

Import the same GitHub repository into Vercel. Set **Root Directory** to `frontend` and keep the detected Next.js build settings. Add:

- `NEXT_PUBLIC_API_URL=https://<render-service>.onrender.com`
- `NEXT_PUBLIC_SITE_URL=https://<vercel-project>.vercel.app`
- `NEXT_PUBLIC_SUPABASE_URL` from `frontend/.env.local`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `frontend/.env.local`

Apply the variables to Production and the intended Preview environment, then redeploy. Never add `SUPABASE_SECRET_KEY` or `DATABASE_URL` to Vercel.

## 4. Complete cross-origin configuration

Set Render's `FRONTEND_URL` to the exact HTTPS Vercel production URL and redeploy Render. In Supabase **Authentication → URL Configuration**:

- Set **Site URL** to the exact Vercel production URL.
- Add `https://<vercel-project>.vercel.app/auth/callback`.
- Add `https://<vercel-project>.vercel.app/reset-password`.
- Keep the localhost callback/reset entries for local development.

Use exact production paths. Add a carefully scoped Vercel preview wildcard only if authentication must work on preview deployments.

## 5. Keep a free Render staging service warm

Render currently spins down a free web service after 15 minutes without inbound traffic. The `keep-render-awake.yml` GitHub workflow requests the health endpoint every 10 minutes. Add this GitHub Actions repository secret:

- Name: `RENDER_HEALTH_URL`
- Value: `https://<render-service>.onrender.com/api/v1/health`

Run the workflow manually once and confirm a successful response. Scheduled GitHub Actions can be delayed or disabled for inactive repositories, and Render can restart free services independently. This is suitable for staging convenience, not an uptime guarantee. Use a paid Render instance for reliable production availability. Continuous pings consume Render's monthly free instance hours.

## 6. Staging verification

1. Confirm both HTTPS URLs respond and the API health response is `200`.
2. Verify frontend API responses contain `access-control-allow-origin` matching only the Vercel origin.
3. Register and confirm a disposable customer through the deployed URL.
4. Browse availability, create/view/cancel a booking, and verify another user cannot read it.
5. Promote a controlled account to admin in Supabase and verify inventory image upload, booking/enquiry operations, dashboard, and reports.
6. Run Playwright with `PLAYWRIGHT_BASE_URL=https://<vercel-project>.vercel.app`.
7. Inspect Render/Vercel logs to confirm secrets, access tokens, passwords, and guest request bodies are absent.
