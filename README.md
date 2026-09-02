# Networking Tracker

A private, secure contact tracker for the people you want to stay connected
with at Berkeley — companies, roles, where you met, notes, and a priority
level, all scoped to your own account.

**Live app:** _TODO: add the deployed Vercel URL here_

## Screenshots / walkthrough

_TODO: add screenshots or a short recording of: sign-up/sign-in, adding a
contact, editing, deleting, refresh-persistence, and the two-account privacy
test. See [Evidence](#evidence) below for the exact list required._

## Features

- Email/password sign-up, sign-in, and sign-out
- Add, view, edit, delete, sort, and filter contacts
- Required fields: name, company, role, where you met, notes, priority
  (`high` / `medium` / `low` only)
- Search across name, company, role, and notes; filter by priority; sort by
  name, company, priority, or date added
- Contacts persist across refresh (stored in Postgres, not local state)
- Clear loading, empty, success, and error states throughout
- Responsive layout: a table on desktop, stacked cards on mobile
- Every contact is private to its owner, enforced by Postgres Row Level
  Security — not just hidden in the UI

## Technology stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | Single framework for both frontend routes and backend route handlers, first-class Vercel support |
| Styling / components | Tailwind CSS + shadcn/ui | A real component system (the assignment's requirement) with accessible, themeable primitives (dialogs, tables, forms) instead of hand-rolled CSS |
| Backend | Next.js Route Handlers (`app/api/**`) | A separated backend layer for server-side validation, independent of the UI |
| Database | Neon Postgres | Serverless Postgres with branching, generous free tier, and native RLS/JWT support |
| Auth | Neon Managed Better Auth | Managed email/password auth issuing JWTs that Postgres RLS can read directly via `auth.user_id()` — no separate auth server to run |
| Data access | Neon Data API (`@neondatabase/neon-js`) | A REST layer over Postgres that enforces RLS on every request, called directly from the client with the signed-in user's JWT |
| Testing | Vitest | Fast, zero-config unit testing for the validation logic |
| Hosting | Vercel | Zero-config Next.js deployment, environment variable management, preview deployments |

## Architecture

```
┌──────────────────────┐        ┌────────────────────────────┐
│   Browser (client)    │        │        Neon project         │
│                        │        │                              │
│  React components      │──────▶│  Managed Better Auth         │
│  (sign-in/up, contacts)│  JWT   │  (email/password → JWT)      │
│                        │        │                              │
│  @neondatabase/neon-js │──────▶│  Data API (PostgREST-style)  │
│  client (auth + CRUD)  │  REST  │  validates JWT, enforces RLS │
│                        │        │        │                     │
│  fetch() ─────────────┼───────▶│        ▼                     │
└──────────┬─────────────┘  validate  Postgres `contacts` table  │
           │              only        (RLS: owner-only policies) │
           ▼                        └────────────────────────────┘
┌──────────────────────┐
│ Next.js Route Handler │
│ /api/contacts/validate│
│ (zod, server-side)    │
└──────────────────────┘
```

- **Frontend**: React client components call the Neon Data API directly
  (`lib/neon.ts`) for every read/write, using the signed-in user's JWT. This
  is the pattern Neon's own SDK is built for — the JWT is attached to every
  request automatically, and Postgres RLS is the real security boundary
  regardless of what the client sends.
- **Backend**: Every create/edit first calls `POST /api/contacts/validate`,
  a Next.js Route Handler that re-validates the payload with the same `zod`
  schema (`lib/validation.ts`) used by the automated test. This is a genuine
  server-side validation step — a request crafted to skip the UI still gets
  rejected here with field-level errors — separate from (and in addition to)
  the database-level `CHECK` constraints in `db/schema.sql`, which are the
  layer that can't be bypassed even by a direct Data API call.
- **Database**: a single `contacts` table with RLS enabled and four
  ownership policies (select/insert/update/delete), all keyed on
  `auth.user_id() = user_id`. See [Schema](#database-schema) below.
- **Auth**: Neon Managed Better Auth, wired up client-side only
  (`BetterAuthReactAdapter`) — there is no custom auth server in this repo.
- **Hosting**: the whole app (frontend + `/api` routes) deploys as one
  Vercel project.

## Local setup

Prerequisites: Node 20+, a [Neon](https://neon.tech) account.

1. **Clone and install**

   ```bash
   git clone <this-repo-url>
   cd networking-tracker
   npm install
   ```

2. **Create a Neon project**
   - In the [Neon console](https://console.neon.tech), create a project in
     an **AWS** region (Managed Better Auth currently requires AWS).
   - Open **Auth** in the sidebar and enable **Managed Better Auth**.
   - Open **Data API** in the sidebar, enable it, and make sure **Use Neon
     Auth** and **Grant public schema access** are both on.
   - Copy the **Auth URL** and **Data API URL** shown on those pages.

3. **Create the schema**
   - Open the Neon **SQL Editor** and run the contents of
     [`db/schema.sql`](db/schema.sql) (or `psql "$DATABASE_URL" -f db/schema.sql`
     using the connection string from **Connect** in the console).

4. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in `NEXT_PUBLIC_NEON_AUTH_URL` and `NEXT_PUBLIC_NEON_DATA_API_URL`
   from step 2. `DATABASE_URL` is only needed if you run the schema via
   `psql` instead of the SQL Editor.

5. **Run it**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000, sign up, and start adding contacts.

## Environment variables

| Variable | Where it's used | Notes |
|---|---|---|
| `NEXT_PUBLIC_NEON_AUTH_URL` | Client (public) | Neon Auth endpoint; safe to expose — auth is protected by password + JWT signing, not URL secrecy |
| `NEXT_PUBLIC_NEON_DATA_API_URL` | Client (public) | Neon Data API endpoint; safe to expose — RLS protects every row regardless of who can reach this URL |
| `DATABASE_URL` | Local tooling only | Direct Postgres connection string, used only to run `db/schema.sql`; never used by the running app, never committed |
| `NEON_AUTH_BASE_URL` | Not used | Reserved for a future server-side auth proxy; this implementation runs auth entirely client-side |
| `NEON_AUTH_COOKIE_SECRET` | Not used | Same as above |

See [`.env.example`](.env.example) for the full file with placeholder values.

## Database schema

`contacts` table (see [`db/schema.sql`](db/schema.sql) for the full DDL):

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `user_id` | `text` | **Not null**, defaults to `auth.user_id()` — the owning user, set automatically on insert |
| `name` | `text` | Not null, `CHECK` rejects empty/whitespace-only names |
| `company` | `text` | Optional, defaults to `''` |
| `role` | `text` | Optional, defaults to `''` |
| `met_at` | `text` | Optional, defaults to `''` |
| `notes` | `text` | Optional, defaults to `''` |
| `priority` | `text` | Not null, `CHECK (priority in ('high','medium','low'))` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()`, kept current by a trigger on every update |

## Authentication and RLS ownership

- Sign-up/sign-in create a session with Neon Managed Better Auth, which
  issues a JWT containing the user's id.
- The `@neondatabase/neon-js` client attaches that JWT to every Data API
  request automatically.
- Postgres reads the JWT via the `pg_session_jwt` extension and exposes the
  user's id through `auth.user_id()`.
- **Row Level Security is enabled on `contacts`**, with four separate
  policies:

  ```sql
  create policy "select_own_contacts" on contacts
    for select to authenticated using (auth.user_id() = user_id);

  create policy "insert_own_contacts" on contacts
    for insert to authenticated with check (auth.user_id() = user_id);

  create policy "update_own_contacts" on contacts
    for update to authenticated
    using (auth.user_id() = user_id)
    with check (auth.user_id() = user_id);

  create policy "delete_own_contacts" on contacts
    for delete to authenticated using (auth.user_id() = user_id);
  ```

  The `update` policy's `USING` clause stops a user from touching a row they
  don't already own, and its `WITH CHECK` clause stops them from changing a
  row they do own so that it points at someone else's `user_id`. Combined
  with `user_id text not null default auth.user_id()`, ownership is set once
  at insert time and can never be reassigned.
- This means even a handcrafted request straight to the Data API — bypassing
  the UI entirely — can only ever see or modify rows owned by the calling
  user. The frontend never filters by `user_id` itself; it doesn't have to.

## Testing

```bash
npm run test
```

Runs the Vitest suite in [`lib/validation.test.ts`](lib/validation.test.ts)
against the same `zod` schema used by the `/api/contacts/validate` route
handler. It verifies:

- an empty (or whitespace-only) name is rejected with a clear message
- a missing name is rejected
- an invalid `priority` value (anything other than `high`/`medium`/`low`) is
  rejected
- a fully valid contact passes
- a contact with only the required fields (name + priority) passes

Sample output:

```
_TODO: paste `npm run test` output here_
```

## Deployment

1. Push this repository to GitHub (public).
2. In [Vercel](https://vercel.com), import the repository (or run
   `vercel --prod` from the CLI).
3. Add the production environment variables (`NEXT_PUBLIC_NEON_AUTH_URL`,
   `NEXT_PUBLIC_NEON_DATA_API_URL`) in the Vercel project settings.
4. In the Neon console, add your Vercel domain to Auth's trusted origins.
5. Redeploy, then open the live URL in a private browser window and confirm
   sign-up/sign-in work end to end.

## Known limitations and next steps

- No password reset / email verification flow — out of scope for this
  assignment, but Better Auth supports both if needed later.
- Sorting and filtering happen client-side over the full contact list, which
  is fine at personal-networking scale but wouldn't scale to thousands of
  rows; the Data API's own `order`/filter query params would be the next
  step.
- No pagination — same reasoning as above.
- No contact photos/avatars.
- The `/api/contacts/validate` backend check and the database `CHECK`
  constraints currently duplicate the same rules; a follow-up could
  generate one from the other.

## Evidence

_TODO before submission — replace this section with:_

- [ ] Automated test output showing at least one passing validation test
- [ ] Screenshot/recording of sign-in and sign-out
- [ ] Screenshot/recording of creating, editing, deleting, and refreshing a
      contact
- [ ] Two-account test showing User A cannot access User B's contacts
- [ ] Screenshot of one invalid input failing safely (empty name or bad
      priority)
- [ ] Confirmation that no secret values are committed to Git
