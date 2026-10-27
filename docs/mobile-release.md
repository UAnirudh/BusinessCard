# iOS and Android release status

## Current product

Tappd has two clients backed by the same web service:

- The Next.js 16 web app is the public card experience and backend. It supports public cards at `/c/{slug}`, QR/vCard sharing, browser installation, and the signed-in web wallet.
- `mobile/` is an Expo / React Native app for iOS and Android. It supports account sign-in and signup, card and QR display, system sharing, QR scanning, NFC tag writing, wallet connections, follow-up dates, native contact saving, and privacy links. It stores its bearer session in SecureStore (Keychain / Keystore) and holds wallet data in memory rather than persisting it locally.

The Expo app calls the deployed service using `EXPO_PUBLIC_API_URL`. The server issues revocable bearer sessions through `/api/native/auth/login` and `/api/native/auth/signup`; authenticated API routes accept those tokens. Both platforms use the same accounts, cards, and wallet as the web app.

The repository has app configuration and EAS build profiles, but no configured production server, production database, linked EAS project, publisher-owned application identifiers, store credentials, or store submissions. There has not yet been end-to-end testing on physical iOS and Android devices. Expo's JavaScript export and CI checks are not signed native store builds and do not replace device testing.

## Local development and CI

Web service:

```bash
npm ci
npm run typecheck
npm run build
npm run dev
```

Without `DATABASE_URL`, local web development uses PGlite. For Railway, configure a production Postgres database, set `DATABASE_URL` and the canonical HTTPS `NEXT_PUBLIC_APP_URL`, then deploy the Next.js app. `railway.json` runs `npm run db:migrate` as the pre-deploy command and starts the app with `npm start`. The proposed public service domain is `https://tappd.up.railway.app`; Railway must assign it to the service before it can be treated as live. No Tappd production host or database is configured in this repository checkout.

Native app:

```bash
cd mobile
npm ci
Copy-Item .env.example .env # PowerShell; on macOS/Linux, use: cp .env.example .env
# Set EXPO_PUBLIC_API_URL in .env to the deployed HTTPS service origin.
npm run typecheck
npx expo start
npx expo export --platform android
```

The Expo Android export bundles JavaScript and assets; it does not produce an APK or AAB. Camera and NFC use native modules, so validate them in a custom development build rather than Expo Go. A custom development or production build and physical device are required to verify permissions, QR scanning, contacts, NFC behavior, and app-link flows.

## Build configuration and store work

`mobile/app.json` currently uses the provisional `com.tappd.app` Android package and iOS bundle identifier. Before creating store records, choose identifiers controlled by the publisher and update both values. `mobile/eas.json` defines development, preview, and production build profiles, but this checkout does not contain a linked EAS project ID or configured publisher credentials.

After choosing the identifiers and linking/configuring an EAS project from `mobile/`, the available production build commands are:

```bash
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

These builds require an EAS account/project, `EXPO_PUBLIC_API_URL` set in the production build environment, and platform signing configuration. Android distribution and submission require a Google Play developer account and Play App Signing setup. iOS distribution and submission require an Apple Developer account and App Store Connect setup. The `submit.production` profile is currently empty; no automated store submission is configured. Builds and submissions must be initiated by an authorized publisher account.

## Remaining launch gates

### Production service and privacy

- Create the Tappd Railway project and service, configure a production Postgres database, choose its region and backup/retention settings, and generate/verify the proposed `tappd.up.railway.app` service domain. Set `DATABASE_URL`, canonical HTTPS `NEXT_PUBLIC_APP_URL`, `TAPPD_SUPPORT_EMAIL`, and the mobile production `EXPO_PUBLIC_API_URL`; run migrations and verify the live service before building store clients.
- Set `DATABASE_URL`, canonical HTTPS `NEXT_PUBLIC_APP_URL`, and the mobile production `EXPO_PUBLIC_API_URL`; run migrations and verify the live service before building store clients.
- Configure `TAPPD_TRUSTED_CLIENT_IP_HEADER` to the single-IP header injected by the production reverse proxy for login, signup, and exchange rate limits. The proxy must remove any incoming client value for that header and set its own. With this setting absent or invalid, requests share an `unattributed` rate-limit bucket; do not trust `X-Forwarded-For` or `X-Real-IP` directly.
- Review `/privacy` and complete Apple privacy details and Google Play Data safety disclosures against the actual deployed providers and data handling. The privacy page still needs verified operator, service-provider, region, retention, and support details.
- Publish and verify the public self-service deletion page at `/account-deletion`; add its canonical HTTPS URL to the Google Play listing. The page takes account holders to password-confirmed deletion in web Settings, and is linked from the website footer and privacy page.
- For actual Wallet passes on public cards, configure an Apple Pass Type ID/team/certificate and Google Wallet issuer/service-account plus an approved Generic Pass class. Add the values in `.env.example` to the production secret store, never to client/mobile environment variables. Apple pass generation requires OpenSSL in the Node server runtime; set `OPENSSL_BIN` if needed. Web and native Wallet actions remain hidden unless the server confirms a complete configuration; the native card screen shows Apple Wallet on iOS and Google Wallet on Android. Google Wallet demo issuer access only supports configured test users until publishing access is granted. A Wallet pass is distinct from contact saving: recipients can import contact details from the public card's `.vcf` action.
- Configure `RESEND_API_KEY` and `TAPPD_EMAIL_FROM` using a verified sending domain to enable password recovery and account-email change confirmation. Password-reset and email-change tokens are single-use, expire after one hour, and are stored as digests; password reset revokes all sessions, while email change keeps the current sessions. Test delivery, expiry, replay, password reauthentication, and email-provider failure behavior before launch. Initial signup email verification is still not implemented. Set the build/runtime to Node 22.13 or later to satisfy Expo SDK 58's documented minimum.

### Native functionality and quality

- Configure EAS and publisher-owned bundle/package IDs; create development builds for each platform.
- Review the mobile dependency audit before store upload: Expo SDK 58's Expo CLI tooling currently pulls high-severity `node-forge@1.4.0` and `zod@3.25.76` advisories. The `node-forge` advisory has no patched release; the Zod advisory's patched version is 4.6.6, while Expo CLI 58.1.15 declares Zod `^3.25.76`. These are build/developer-tool dependencies rather than the shipped app runtime, but they still affect local and cloud builds. Recheck the upstream Expo dependency tree and advisories before release; do not force a major override without compatibility evidence. `npm audit fix --force` proposes downgrading Expo to SDK 44 and is not a safe fix.
- Test signup/sign-in, token restore/revocation, public/private card states, QR exchange, wallet refresh, follow-up editing, contact saving, sign-out, and account deletion against the production-like backend.
- Test camera and Contacts permissions, NFC-capable and NFC-unavailable devices, writable tags, denied permissions, offline/network failure, and small/large screen layouts on physical iPhones and Android devices.
- Confirm deep-link behavior, accessibility, app icons, splash/safe-area layout, and release versioning on signed builds.
- The public `/support` route is linked from the landing-page footer when `TAPPD_SUPPORT_EMAIL` is set. The native app opens `/support` on its configured `EXPO_PUBLIC_API_URL`. Set a monitored `TAPPD_SUPPORT_EMAIL` before publishing, and complete crash reporting, reviewer access, store screenshots, descriptions, age ratings, and release notes.

### Store submission

- Generate signed Android and iOS builds and validate installation/update flows.
- Complete Google Play internal testing and the applicable closed-testing/release requirements for the publisher account.
- Upload the iOS build to TestFlight and prepare a reviewer-ready account and sample QR/NFC tag.
- Submit disclosures and builds through the publisher accounts, address review feedback, and publish only after both stores approve.

### Submission requirements checked October 2026

- New Google Play apps and updates must target Android 16 (API level 36) or higher from August 31, 2026. Expo SDK 58's default target API is 36; confirm the generated release manifest before uploading.
- If the Play Console publisher uses a personal developer account created after November 13, 2023, production access requires a closed test with at least 12 testers opted in continuously for 14 days, followed by a production-access application. Confirm the account type and creation date in Play Console; this requirement does not apply to every publisher account.
- App Store Connect uploads must use Xcode 26 or later and an SDK for iOS 26 or later, effective April 28, 2026. Confirm the selected EAS build image when creating the signed iOS build.

## Platform references

- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [Google Play target API level requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Google Play testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [Apple upcoming submission requirements](https://developer.apple.com/news/upcoming-requirements/)
- [node-forge advisory GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
- [Zod advisory GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
- [Apple Wallet pass certificates](https://developer.apple.com/help/account/capabilities/create-wallet-identifiers-and-certificates)
- [Google Wallet issuer onboarding](https://developers.google.com/wallet/generic/getting-started/issuer-onboarding)
- [Apple Core NFC](https://developer.apple.com/documentation/corenfc/)
- [Android NFC](https://developer.android.com/develop/connectivity/nfc)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play functionality policy](https://support.google.com/googleplay/android-developer/answer/9898783?hl=en)
