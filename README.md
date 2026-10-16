# SupaSpace Host Prospects

A full-stack Next.js App Router application based on the SupaSpace Figma design. TypeScript, React Icons and Sass (`.scss`); Supabase Auth, Postgres and an authenticated Edge Function for user administration.

## Run locally

Use Node.js 24 LTS.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The example environment points at the configured General Project. Its publishable key is safe for browser use; database policies restrict access to workspace members. Never put a secret/service-role key in a `NEXT_PUBLIC_` variable or commit it.

## First administrator — one setup step remains

The initial administrator has **not** been created. Automatic approval review rejected a temporary web bootstrap endpoint, and no such endpoint is deployed. Create the initial account with the trusted local script, using the Supabase project's secret key from Settings → API Keys. Set these variables only in your terminal environment (or a local ignored `.env.local` file):

- `SUPABASE_SECRET_KEY`: server-only Supabase secret key
- `ADMIN_EMAIL`: the requested administrator email
- `ADMIN_PASSWORD`: the requested initial password
- `ADMIN_NAME`: your display name

Then run:

```sh
node --env-file=.env.local scripts/create-admin.mjs
```

This uses the supported Supabase Admin API, confirms the account, and creates its administrator membership. It refuses to run once the workspace has members. Remove the bootstrap credentials from your environment afterward. No password is stored in the repository.

Alternatively, create the user in Supabase Authentication → Users → Add user, auto-confirm their email, then add a row to `public.workspace_members` with that user's UUID, your name, and role `admin` through the Supabase dashboard.

## Features

- Basic email/password login, protected pages and server actions, sign-out.
- Update name, email and password; current password required. Email changes use Supabase's confirmation flow.
- Admin-only user creation and member listing. Members share the same prospect directory; public sign-ups alone do not grant workspace access.
- Prospect creation/editing, details drawer, search, sorting, pagination and mobile cards.
- Status changes, archive/restore, explicit permanent-removal confirmation.
- Contact and social links: phone, email, SMS, WhatsApp, website, Instagram, Facebook, TikTok, LinkedIn, X and YouTube. External URLs open a new tab. Actions open the user's communication app; they do not send messages automatically.
- Multiple emails/phones, follow-up dates, notes, certification and source URLs.
- Status/location/type/area/certification/follow-up/contact-availability filters.
- Excel `.xlsx`, CSV and JSON import with validation, preview and name/location duplicate detection. Invalid rows block import until corrected. Maximum 5 MB and 2,000 rows per import. The first worksheet and first-row headers are used for Excel.
- Live database metrics; no illustrative Figma prospects are seeded into production.

## Import columns

`name`, `location`, `type`, `area_group`, `emails`, `phones`, `whatsapp`, `website`, `socials`, `certification`, `status`, `last_contacted`, `next_follow_up`, `notes`, `sources`.

The original sheet's `email`, `phone`, `legality`, `Social media username`, and `Source URLs` headers are also accepted. Multiple contacts/source URLs can be separated by newlines or semicolons. Social cells accept `Inst: username` / `TikTok: username`, one per line; JSON also accepts `socials: [{"platform":"Instagram","value":"username"}]`. Dates should use `YYYY-MM-DD` (Excel date cells also work). Unknown certifications stay “Not verified”; a dash status becomes “Not contacted”.

## Supabase infrastructure

Project: `heygymzqxlllfimddssn` (General Project, eu-west-1).

The schema in `supabase/migrations/20261016115945_host_workspace.sql` has already been executed on this project. Do **not** rerun it there. It is retained as the initial schema for fresh environments; the remote migration ledger is not baselined by the direct SQL setup.

`manage-users` is already deployed. Its gateway JWT verification is disabled because the function validates the bearer token itself with `auth.getUser()` and checks the caller's role from `workspace_members` on every request. The service-role key stays inside Supabase's Edge runtime. No secret is needed on the Next.js server for normal operations.

For a fresh Supabase project: apply the schema, deploy `supabase/functions/manage-users/index.ts` with `--no-verify-jwt`, update the public environment variables, then create the administrator.

RLS is enabled on both public tables. Only members may access prospects. Members can update only their own name; roles can only be assigned by the protected admin function or project administrators. The database preserves record creator and creation timestamp on update.

## Hosting

Deploy this repository to any supported Next.js host (for example Vercel or a Node.js server). Set the two variables from `.env.example`. Run `npm run build` then `npm start` for Node hosting. Configure the deployed origin as the Supabase Auth Site URL and allow `<origin>/auth/callback` as a redirect URL so email changes can return to the app. Source is published to https://github.com/SsadiqRoy/prospect-hosts. No hosting deployment is included.

## Validation and limitations

```sh
npm run typecheck
npm test
npm run build
```

GitHub Actions runs these checks on pushes and pull requests. The Supabase security advisor returned no findings after schema creation. Initial account creation is still required before real sign-in and authenticated end-to-end testing. Browser visual verification was unavailable in the execution environment.

The attached white-text logo is used on a dark backing because the original Figma image download was blocked. Interface icons use React Icons as requested. Layout, colors and form structure follow the supplied Figma screens; unavailable Code Connect mappings had no implementation in the empty repository, so a small local component set is used.
