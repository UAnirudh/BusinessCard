# Tappd

**Digital business cards that remember who you met.**

Tappd turns a phone into a shareable business card: tap an NFC tag, show a QR code, or send a link. Everyone you meet lands in a searchable wallet, complete with tags, notes and the context you need to follow up.

The web service is built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Drizzle ORM and Postgres. The repository also includes an Expo / React Native app for iOS and Android. The intended production host is Railway with a hosted Postgres database. Local web development needs no database server: it runs on an embedded PGlite database that is migrated automatically.

---

## What's inside

### Your card
- Public card at `/c/your-handle` with a live accent theme, photo, bio, tags, contact rows, social links and custom links.
- **Save contact** downloads a real `.vcf` that works in iOS, Android and Google Contacts.
- **QR code** generated server-side (SVG, downloadable) and a scannable share sheet.
- **NFC writing** via Web NFC — write your card link to a cheap NTAG213/215/216 tag once, then tap phones.
- **QR scanner** in the app (camera + jsQR) to open someone else's card instantly.
- Privacy switches for public/private cards and visitor lead capture.
- Card views are tracked (owner views excluded) and shown on the dashboard.

### Your wallet
- Every exchange is stored with name, role, company, email, phone, website, city, tags, notes, source and the date you met.
- Add contacts manually, import a CSV (Google Contacts, Notion, Airtable…) or receive them from your card.
- Search, filter by tag/source/favorites, sort, favorite, annotate, export to CSV, save any contact as a `.vcf`, delete.
- Duplicate-safe exchanges: swapping cards twice updates the existing person instead of creating a copy.
- Two-way exchange: signed-in members who send their card back appear in each other's wallets automatically.
- Visitors without an account can leave their details in a few seconds — no install, no signup.

### Find the right person
`/app/find` is a deterministic ranking engine (no external AI keys needed):
- understands role synonyms — *designer ↔ design*, *VC ↔ investor*, *dev ↔ engineer*, *marketing ↔ growth*…
- weights name and tags above bio noise, boosts exact phrase matches and favorites
- explains each match ("role match “designer” · tag match “design”")
- returns a relevance score, highlights matched words and suggests fallbacks when nothing matches

### Account & operations
- Email + password auth with scrypt hashing, hashed session tokens in HttpOnly cookies, 30-day sessions.
- Sign out everywhere, change email/password, delete account (cascades card, wallet, avatar and sessions).
- Same-origin checks on every mutating API route, with shared database-backed rate limits for authentication, exchanges, and card views.
- Server-side validation with Zod on every input.

### Mobile install
- Installable on iPhone and Android from the browser, with app shortcuts for sharing your card and opening your wallet.
- A small offline page explains when the network is unavailable. Private pages, wallet data and API responses are never cached by the service worker.
- The installable web app keeps the public card experience available in mobile browsers. For native share sheets, QR camera scanning, contact saving, and NFC tag writing, use the Expo app described below.

### Native iOS and Android app
- `mobile/` contains the Expo / React Native client. It signs in to the same service, keeps its bearer session in iOS Keychain / Android Keystore through SecureStore, and keeps wallet responses in memory.
- The native app includes card sharing, QR display and scanning, NFC tag writing, wallet connections, follow-up dates, native contact saving, and privacy links.
- Camera and NFC require a custom development or release build; Expo Go does not include the NFC native module. Store builds are not configured or released yet; see [`mobile/README.md`](mobile/README.md) and [`docs/mobile-release.md`](docs/mobile-release.md).

---

## Quick start (local)

```bash
npm install
npm run db:seed     # optional: demo account, demo cards and a populated wallet
npm run dev
```

Open http://localhost:3000.

No environment variables are required for local development. Without `DATABASE_URL`, the app boots an embedded [PGlite](https://pglite.dev) Postgres database in `.data/pglite` and applies the generated migrations on first use.

Seeded demo account:

```
Email:    maya.chen@tappd.app
Password: tappd-demo
Demo cards: /c/maya-chen, /c/daniel-roth, /c/sofia-reyes
```

> Stop the dev server before running `db:seed` again — a single local process should own the PGlite data directory.

### Useful scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build (requires `DATABASE_URL`) |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:generate` | Generate a migration after schema changes |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run db:seed` | Load the demo workspace into a local database (idempotent; blocked for production and remote databases) |
| `npm run vercel-build` | Migrate then build (used by the existing Vercel configuration) |

For the native client, see [`mobile/README.md`](mobile/README.md) for Expo development and EAS build commands. A native build requires a deployed backend URL in `EXPO_PUBLIC_API_URL`.

For a production-mode preview locally without Postgres, allow the embedded database explicitly:

```bash
TAPPD_ALLOW_EMBEDDED_DB=1 NEXT_PUBLIC_APP_URL=http://localhost:3000 npm start
```

---

## Deploy to Railway

The production Railway project is already deployed at `https://tappd.up.railway.app` with a Postgres service. To reproduce or replace it:

1. **Create a Railway project and Postgres service.** Copy the database connection string. The app enables SSL automatically for non-localhost hosts.
2. **Create a web service from this GitHub repository.** Set the build command to `npm run build`, pre-deploy command to `npm run db:migrate`, and start command to `npm start`. The migration must finish before the new app version starts.
3. **Generate a public Railway domain** in the service's Networking settings. The production hostname is `tappd.up.railway.app`.
4. **Set the production environment variables** in the Railway service:
   - `DATABASE_URL` — the Postgres connection string (also read: `POSTGRES_URL`, `POSTGRES_PRISMA_URL`)
   - `NEXT_PUBLIC_APP_URL` — the assigned production HTTPS Railway origin (used for QR codes, card links and metadata)
   - `TAPPD_SUPPORT_EMAIL` — monitored support and privacy inbox controlled by the operator
   - `TAPPD_TRUSTED_CLIENT_IP_HEADER=X-Real-IP` — Railway's public HTTP edge overwrites this header with the remote client IP. This trust applies to requests through the Railway HTTP edge; don't reuse it on direct or differently proxied deployments. [Railway request-header docs](https://docs.railway.com/networking/public-networking/specs-and-limits) and [Railway's edge-header clarification](https://station.railway.com/questions/security-clarification-x-forwarded-for-fb0bba28).
   - Add Resend and Wallet secrets only after their respective provider accounts and credentials are configured.
5. **Deploy and verify** the health of the service, then set the HTTPS origin in `mobile/.env` as `EXPO_PUBLIC_API_URL`. EAS preview and production profiles already point to the production origin. Do not seed the hosted database: `npm run db:seed` is restricted to local development databases and refuses production mode or remote database hosts.

`.env.example` documents the variables. Never commit real credentials. Railway production uses a self-signed Postgres TLS certificate, so its Web service explicitly sets `TAPPD_ALLOW_SELF_SIGNED_DATABASE_CERT=true`; certificate validation remains strict by default on other hosts.

---

## Architecture

```
app/
  page.tsx                   Marketing site
  login, signup              Auth screens
  c/[slug]                   Public card (vCard, QR, exchange, lead capture)
  app/                       Authenticated app shell
    page.tsx                 Dashboard: stats, card preview, checklist, activity
    card/                    Card studio (live preview, photo upload, theme, privacy)
    connections/             Wallet browser + contact detail
    find/                    Natural-language people search
    tap/                     QR, NFC writer, camera scanner
    settings/                Account, password, export, delete
  api/                       Web and native auth, card, avatar, wallet, exchange, views, export
components/                  UI components (client + server)
db/                          Drizzle schema and dual Postgres/PGlite client
drizzle/                     Generated SQL migrations
lib/                         Auth, validation, search ranking, CSV, vCard, helpers
scripts/                     migrate.mjs, seed.ts
mobile/                      Expo / React Native iOS and Android client
```

### Database

| Table | Purpose |
| --- | --- |
| `users` | Accounts (email, scrypt hash, display name) |
| `sessions` | SHA-256 hashed session tokens with expiry |
| `cards` | One public card per user (slug, profile, tags, links, theme, privacy) |
| `avatars` | Base64 image bytes per card, served from `/api/avatar/[cardId]` |
| `card_views` | Card visits with attribution source |
| `connections` | The wallet: saved people, their details, notes, tags, source |

Migrations live in `drizzle/`. Change `db/schema.ts`, then run `npm run db:generate` and `npm run db:migrate`.

### How the data layer works

`db/index.ts` picks a driver at runtime:

- `DATABASE_URL` present → `pg` connection pool (production, and local if you prefer a real Postgres).
- no URL → embedded PGlite at `.data/pglite`, with migrations applied on first query (development).
- production without a URL → throws a clear setup error unless `TAPPD_ALLOW_EMBEDDED_DB=1`.

Both drivers share the same Drizzle schema and query API, so behaviour is identical.

---

## Notes, limits and next steps

- **NFC:** Web NFC writing requires Chrome on Android over HTTPS (localhost works). iPhones read NFC tags natively but cannot write them from a browser, so the UI falls back to QR. There is no peer-to-peer "bump" API on modern phones — the tag/QR link is the tap.
- **App stores:** An Expo / React Native iOS and Android client now exists in `mobile/`; it is not yet a signed, device-verified, or published store build. Store release still needs a production backend, publisher-owned application identifiers, EAS project/build configuration, Apple and Google signing credentials, listing assets and disclosures, physical-device testing, and store review. See [`docs/mobile-release.md`](docs/mobile-release.md) for the current checklist.
- **No email sending:** there is no password-reset or verification email yet; accounts are created instantly. Add a transactional email provider before opening signups publicly.
- **Rate limiting** uses shared database-backed counters, so app instances connected to the same Postgres database share rate limits. Review capacity and retention as production traffic and abuse patterns become clear.
- **One card per account.** Team cards, multiple identities per user, and CRM integrations (HubSpot, Notion, Google Contacts sync) are natural next steps.
- **Images** are stored in Postgres for zero extra infrastructure. At scale, move avatars to object storage (S3/R2/Blob) — the serving route is isolated at `/api/avatar/[cardId]`.
