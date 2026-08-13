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
   create all tables, indexes, and constraints.
3. (Optional) Run [`supabase/seed.sql`](./supabase/seed.sql) to load the
   same fictional demo dataset into your real database — useful for seeing
   the app populated before entering your own numbers.
4. In your Supabase project settings (Project Settings → API), copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (server-only —
     never prefix with `NEXT_PUBLIC_`, never expose to the browser)
5. Copy `.env.example` to `.env.local` and fill in the three values.
6. Restart `npm run dev`. The app now reads/writes your real database.

## 3. Environment variables

See [`.env.example`](./.env.example) for the full list with comments.

| Variable | Where it's used | Required for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | any real (non-demo) usage |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | any real (non-demo) usage |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | bypassing RLS in V1 (there is none yet, but this is the key Server Actions use) |

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
