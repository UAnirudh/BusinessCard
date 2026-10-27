# iOS and Android release status

## Current product

Tappd has two clients backed by the same web service:

- The Next.js 16 web app is the public card experience and backend. It supports public cards at `/c/{slug}`, QR/vCard sharing, browser installation, and the signed-in web wallet.
- `mobile/` is an Expo / React Native app for iOS and Android. It supports account sign-in and signup, card and QR display, system sharing, QR scanning, NFC tag writing, wallet connections, follow-up dates, native contact saving, and privacy links. It stores its bearer session in SecureStore (Keychain / Keystore) and holds wallet data in memory rather than persisting it locally.

The Expo app calls the deployed service using `EXPO_PUBLIC_API_URL`. Native sign-in receives a revocable bearer session from `/api/native/auth/login`. Native signup requests an email verification link; after confirming it in the browser and choosing a password, the new member returns to the app and signs in. Authenticated API routes accept the native session token. Both platforms use the same accounts, cards, and wallet as the web app.

The production web service and Postgres database are deployed on Railway at `https://tappd.up.railway.app`; the database migration and public database-backed QR/vCard endpoints have been verified. The EAS preview and production profiles point to this API. The app still needs a linked EAS project, publisher-owned application identifiers, store credentials, and store submissions. There has not yet been end-to-end testing on physical iOS and Android devices. Expo's JavaScript export and CI checks are not signed native store builds and do not replace device testing.

## Local development and CI

Web service:

```bash
npm ci
npm run typecheck
npm run build
npm run dev
```

Without `DATABASE_URL`, local web development uses PGlite. Railway production uses Postgres and `NEXT_PUBLIC_APP_URL=https://tappd.up.railway.app`; `railway.json` runs `npm run db:migrate` before starting the Next.js app. Railway's private Postgres endpoint presents a self-signed TLS certificate, so its Web service sets `TAPPD_ALLOW_SELF_SIGNED_DATABASE_CERT=true`. TLS remains enabled; strict certificate validation is the default everywhere else.

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

After downloading the Android App Bundle, inspect the manifest from the signed release artifact, not a debug build. With Google's `bundletool` installed, run `java -jar bundletool.jar dump manifest --bundle=path/to/tappd.aab --module=base` and confirm `android:targetSdkVersion` is at least `36` and the package is the publisher-owned ID. [bundletool manifest command reference](https://github.com/google/bundletool/blob/master/src/main/java/com/android/tools/build/bundletool/commands/DumpCommand.java).

## Remaining launch gates

### Production service and privacy

- Set a monitored `TAPPD_SUPPORT_EMAIL` before publishing. Railway production, its Postgres database, the canonical HTTPS domain, and the Expo preview/production API URL are configured and the database-backed public endpoints respond successfully.
- Railway production sets `TAPPD_TRUSTED_CLIENT_IP_HEADER=X-Real-IP`. Railway's public HTTP edge overwrites this header with the remote client address, so auth rate limits use a per-client IP bucket. This trust applies to public HTTP ingress; do not reuse it for a direct/private listener or a different proxy without verifying its header behavior. [Railway request-header docs](https://docs.railway.com/networking/public-networking/specs-and-limits) and [edge-header clarification](https://station.railway.com/questions/security-clarification-x-forwarded-for-fb0bba28).
- Review `/privacy` and complete Apple privacy details and Google Play Data safety disclosures against the actual deployed providers and data handling. The privacy page still needs verified operator, service-provider, region, retention, and support details.
- Public cards now have a server-side basic English-language text filter, a report form, signed-in viewer blocks, and a moderator review queue. Configure `TAPPD_MODERATOR_EMAILS` with operator-controlled account emails before launch. A moderator must monitor the queue, promptly review reports, remove objectionable content, suspend abusive accounts when needed, and maintain a response process. The text filter is heuristic and is not comprehensive across languages or evasion techniques; existing public cards are not automatically re-screened. This code does not by itself establish Apple Guideline 1.2 compliance.
- The moderation queue and suspension controls require an authenticated moderator account. Before launch, exercise report intake, review, dismiss, card hide, account suspension/session revocation, and account deletion against production data. Decide and disclose retention for report details and moderation records; set a support contact users can reach.
- Publish and verify the public self-service deletion page at `/account-deletion`; add its canonical HTTPS URL to the Google Play listing. The page takes account holders to password-confirmed deletion in web Settings, and is linked from the website footer and privacy page.
- For actual Wallet passes on public cards, configure an Apple Pass Type ID/team/certificate and Google Wallet issuer/service-account plus an approved Generic Pass class. Add the values in `.env.example` to the production secret store, never to client/mobile environment variables. Apple pass generation requires OpenSSL in the Node server runtime; set `OPENSSL_BIN` if needed. Web and native Wallet actions remain hidden unless the server confirms a complete configuration; the native card screen shows Apple Wallet on iOS and Google Wallet on Android. Google Wallet demo issuer access only supports configured test users until publishing access is granted. A Wallet pass is distinct from contact saving: recipients can import contact details from the public card's `.vcf` action.
- Configure `RESEND_API_KEY` and `TAPPD_EMAIL_FROM` using a verified sending domain before enabling production signup. New signup links are single-use, expire after 24 hours, and are stored as digests; the member chooses their name and password only after opening the link. Accounts and cards are created after confirmation, and new cards start private with visitor lead collection off. Password-reset and email-change tokens are single-use, expire after one hour, and are stored as digests; password reset revokes all sessions, while email change keeps the current sessions. Test delivery, expiry, replay, password reauthentication, and email-provider failure behavior before launch. Set the build/runtime to Node 22.13 or later to satisfy Expo SDK 58's documented minimum.

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
