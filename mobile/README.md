# Tappd mobile app

An Expo / React Native client for Android and iOS. It uses the same Tappd account and wallet as the web app, with platform share, Contacts, QR camera, NFC tag writing, and Keychain/Keystore-backed session storage.

## Run locally

1. Use Node.js 22.13 or newer (required by Expo SDK 58), then install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to the deployed backend origin (no trailing slash). Expo embeds public environment variables into the app binary; this value is not a secret.
3. Run `npx expo start` for the JS app. Camera and NFC require a custom native development build (`npx expo run:android` / `npx expo run:ios` or an EAS development build); Expo Go cannot load the NFC native module.

## App Store / Google Play build

This checkout has production build profiles but is not yet linked to an EAS project or publisher accounts. Before creating store records, replace the provisional `com.tappd.app` Android package and iOS bundle identifier in `app.json` with identifiers owned by the publisher. Then log in to EAS and configure/link the project:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
```

Set `EXPO_PUBLIC_API_URL` in the EAS production environment to the deployed HTTPS backend. Build signed binaries with:

```bash
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

These commands require a configured EAS project and platform signing credentials. Apple signing, Google Play app signing, store listing assets, privacy disclosures, and review submission must be configured in the publisher accounts. The empty `submit.production` profile does not automate store submission. See [`../docs/mobile-release.md`](../docs/mobile-release.md) for current release blockers.

The NFC reader/writer needs a physical NFC-capable device and a writable NDEF tag. QR scanning needs camera permission. Saving a wallet contact opens the platform's native create-contact form and does not read or upload the address book.

Before store submission, review the public `/privacy` policy against actual operations and fill in verified details for the operator, service providers, processing regions, backup/retention practices, and support contact. Store privacy disclosures must match the shipped backend and its vendors.

## API contract

- `POST /api/native/auth/login` returns `{ ok, token, expiresAt, user, card }`. Native signup returns HTTP 202 with `{ ok, verificationRequired, email, message }`; the user verifies email and chooses a password in the browser, then signs in to the app.
- The token is stored only in `expo-secure-store` and sent as `Authorization: Bearer …` on protected requests. Wallet payloads are held in memory and are not persisted on the device.
- `GET /api/native/bootstrap` refreshes account/card state; `GET /api/connections` provides the wallet; `PATCH /api/connections/{id}` updates `followUpDate` as `YYYY-MM-DD` or `null`.
- `GET /api/native/wallet-availability` returns server-confirmed Apple and Google Wallet readiness for the signed-in app. The card screen offers the matching platform action only when its provider is configured; it opens `/api/wallet/{apple|google}/{slug}`. A Wallet pass is separate from saving a contact: people can use **Save contact** on the public card to import its `.vcf` details.
- `POST /api/exchange` accepts `{ slug, name, email, phone, company, headline, note }` for signed-in two-way exchanges.
- `POST /api/auth/logout` revokes the active bearer token.
- The card share URL assumes public cards are served at `/c/{slug}`. Privacy settings link to `/privacy`.

If API names or response fields differ from the deployed backend, update `src/api.ts` and the calls in `App.tsx` together.
