# Setup

## 1. Local development (no Supabase needed)

```bash
npm install
npm run dev
```

That's it — with no `.env.local`, the app detects the missing Supabase env
vars and runs in **demo mode**: an in-memory seed dataset (see
`src/lib/database/demo-data.ts`) so every screen has realistic, fictional
data to explore. Nothing you add in demo mode persists across a server
restart — connect a real Supabase project (below) for anything to stick.

## 2. Connect a real Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](./supabase/schema.sql) to
   create all tables, indexes, constraints, and Row Level Security policies.
3. In Supabase Dashboard → Authentication → Providers, confirm **Email** is
   enabled (it is by default). For local development, you can turn off
   "Confirm email" under Authentication → Settings so sign-up doesn't
   require clicking an email link — turn it back on before sharing the app
   with anyone else.
4. (Optional) [`supabase/seed.sql`](./supabase/seed.sql) needs a small manual
   tweak now that Row Level Security is on — see the comment at the top of
   that file. Easiest path: skip it and add a few things through the app
   itself once you're signed in.
5. In your Supabase project settings (Project Settings → API), copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Copy `.env.example` to `.env.local` and fill in both values.
7. Restart `npm run dev`. **Signing in is now required** — go to
   `/login`, create an account (first tab, "New here? Create an account"),
   and you're in. Every table is scoped to your account via Row Level
   Security (see ARCHITECTURE.md) — there's no separate admin/service key
   to manage.

## 3. Environment variables

See [`.env.example`](./.env.example) for the full list with comments.

| Variable | Where it's used | Required for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | any real (non-demo) usage |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | any real (non-demo) usage |

Both env vars set → sign-in required. Neither set → demo mode, no login.

## 4. Deploying to Vercel

1. Push this repository to GitHub.
2. Import it into [Vercel](https://vercel.com/new).
3. Add the three environment variables from step 3 in the Vercel project
   settings (Environment Variables).
4. Deploy. Production architecture is Browser → Vercel/Next.js → Supabase →
   PostgreSQL — there is no local production database or server involved.

## 5. Running tests

```bash
npm run test
```

Runs the Vitest suite covering the calculation layer (`lib/calculations/*`)
— holdings, FIFO realized P&L, CAGR/XIRR, and more. This is where
correctness risk is highest, so it's prioritized over UI tests in V1.
