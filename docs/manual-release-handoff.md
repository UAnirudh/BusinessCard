# Followfolk release handoff

This is the short list of owner-only actions needed to move from the verified CI builds to production releases. Do not send passwords, API keys, service-account JSON, signing keys, or recovery codes in chat or commit them to this repository.

## Verified now

- Quality Gate #87 passed the web, Android, and iOS simulator jobs. Its [40,264,314-byte Android QA APK](https://github.com/UAnirudh/BusinessCard/actions/runs/41952950851/artifacts/13383180246) is debug-signed, not for Google Play, and expires 2026-11-19 02:27:39 UTC. See the [run](https://github.com/UAnirudh/BusinessCard/actions/runs/41952950851).
- Production GET checks return HTTP 200 for `/` and `/signup`, and HTTP 404 for `/c/maya-chen` and `/api/vcard/maya-chen`; the public-card recipient flow remains unverified.
- Railway access is restored. The production Web and Postgres services report online, and Web deploys from `main` with `npm run db:migrate` before deploy. The Web service lacks `RESEND_API_KEY`, `TAPPD_EMAIL_FROM`, `TAPPD_SUPPORT_EMAIL`, and `TAPPD_MODERATOR_EMAILS`; only variable names were inspected. EAS CLI is not on this machine's PATH, and `mobile/app.json` has no EAS project link.
- `mobile/app.json` still has provisional IDs `com.tappd.app`; `mobile/eas.json` has an empty `submit.production` profile.

## 1. Configure production email and operator access

1. Railway is now connected and the existing production project is accessible. The current API host remains `https://tappd.up.railway.app` until a replacement domain is configured.
2. Control an email-sending domain and verify it with Resend. Choose the sender address you want customers to see.
3. In the Railway Web service's production variables, confirm or set the values documented in [`.env.example`](../.env.example):
   - `RESEND_API_KEY` and `TAPPD_EMAIL_FROM` for signup verification, password recovery, and email changes.
   - `TAPPD_SUPPORT_EMAIL` as an inbox you monitor.
   - `TAPPD_MODERATOR_EMAILS` with at least one operator account you monitor.
   - Confirm the existing production origin, database, trusted proxy, and TLS settings remain correct. The setup notes are in [README.md](../README.md#deploying-to-railway).
4. Confirm the Railway Web service runs `npm run db:migrate` as its pre-deploy command.

Do not enable public signup until Resend delivers a verification link to a real inbox.

## 2. Verify the production card flow

After signup email works, create an owner-controlled test account using an inbox you can access. Confirm the verification link, sign in, create a card, and turn on public sharing. Record its public URL. Then verify that:

- The public card, QR image, and `.vcf` download load without signing in or installing Followfolk.
- Opening the `.vcf` on iPhone and Android offers to add the contact.
- Password recovery, account deletion, report intake, and moderator review work against production.
- `/support` shows the monitored support contact.

The public card and vCard checks must return 200 for this real card before calling the recipient flow verified. The sample `maya-chen` card currently returns 404.

Apple Wallet and Google Wallet pass buttons remain hidden until their separate signing/issuer credentials and approvals are configured. Contact-file download remains the available no-app path in the meantime.

## 3. Set publisher identity and link EAS

1. **Clear Followfolk before creating permanent store records.** Followfolk is the current working display brand for this branch. The former name Tappd had close category/name overlap with [Tappd.co.za](https://tappd.co.za/pages/pricing). Initial exact-match web/store searches and RDAP lookups did not surface an obvious current Followfolk match, but that is not legal clearance. Search the USPTO and target stores and obtain qualified advice before launch. The app display name and verification scheme now use Followfolk; keep `com.tappd.app` provisional until the publisher controls final IDs. The current Railway API host remains `tappd.up.railway.app` until an owner-controlled replacement domain is set up.
2. Activate Google Play Console and Apple Developer/App Store Connect accounts under the publisher identity you intend to show customers.
3. Choose unique Android package and iOS bundle IDs controlled by the publisher. Send me the chosen IDs; I can update the app config and run the checks. Do not use `com.tappd.app` without confirming the publisher controls it.
4. On this computer, in PowerShell:

   ```powershell
   Set-Location C:\Users\uanir\OneDrive\Documents\GitHub\BusinessCard\mobile
   npx eas-cli@latest login
   npx eas-cli@latest whoami
   npx eas-cli@latest init
   ```

   In `eas init`, select the publisher-owned Expo account/project. It will link the project in app config. Do not paste Expo passwords or tokens into chat.
5. After the IDs and EAS project link are set, configure EAS production signing credentials for Android and iOS. Expo can create/manage signing credentials interactively. Add the production `EXPO_PUBLIC_API_URL` in the EAS production environment; the project already targets `https://tappd.up.railway.app` in `eas.json`.
6. Create an Android App Bundle and iOS App Store build:

   ```powershell
   npx eas-cli@latest build --platform android --profile production
   npx eas-cli@latest build --platform ios --profile production
   ```

   The QA APK from GitHub Actions cannot be uploaded to Play. EAS production builds must use store signing credentials.

For iPhone TestFlight, a custom app domain is not required; the Railway HTTPS URL can remain the API origin. TestFlight does require Apple Developer membership, App Store Connect access, the publisher-owned bundle ID, and a store-signed iOS build. After the build completes, upload it with:

```powershell
npx eas-cli@latest submit --platform ios --latest
```

Then add internal testers in App Store Connect. External testers require the TestFlight beta information and Apple's beta review for the first build. Install Apple's TestFlight app on the iPhone and accept the invitation there. Expo's current [TestFlight guide](https://docs.expo.dev/submit/testflight/) describes the flow.

## 4. Finish store setup and testing

- Create the app records in Play Console and App Store Connect using the chosen IDs.
- Configure the Google Play service account for EAS Submit and the App Store Connect submission credentials. The repo's `submit.production` profile is currently empty, so I can fill it in once the publisher chooses and links those accounts.
- Complete store names, descriptions, screenshots, support/privacy links, age ratings, privacy/Data Safety declarations, review notes, and test credentials.
- Install the signed builds through Google Play internal testing and TestFlight. Test signup, card sharing, QR scanning, NFC, contact saving, privacy controls, and account deletion on physical devices.
- Check Play Console for any account-specific closed-testing requirement before requesting production access. Submit each store release for review and address review feedback before rollout.

Expo's current guides cover [EAS production builds](https://docs.expo.dev/deploy/build-project/), [Google Play submission](https://docs.expo.dev/submit/android/), [Apple submission](https://docs.expo.dev/submit/ios/), and [EAS environment variables](https://docs.expo.dev/eas/environment-variables/). A successful CI simulator build or debug APK is not a store-signed artifact.

## What I can take over after access is restored

- Verify Railway configuration and signup email delivery without exposing secret values.
- Recheck the live public card, QR, and contact-file flow once a real card exists.
- Update and validate publisher-owned app IDs and EAS project config.
- Configure the submission profile, run signed EAS builds, and review the generated artifacts and store checklists.
- Prepare the final store listing text and review notes from the current privacy/support pages.
