# Tappd store listing draft

Draft only. Claims below reflect the current product in this repository. The name Tappd is not cleared for app-store use: several active digital-card sites use the same name, including products with overlapping Wallet/NFC features. Resolve brand and trademark clearance, then choose publisher-owned package and bundle identifiers before creating permanent store records. Before submission, confirm each claim against the signed production build, deployed backend, and completed Apple/Google privacy disclosures. Replace founder and support placeholders before publishing.

## App name and short copy

### Apple App Store

- **Name:** Tappd
- **Subtitle:** Digital cards & follow-ups
- **Promotional text:** Share your card by QR or link. Keep introductions organized with notes, tags, and follow-up reminders.

### Google Play

- **App name:** Tappd: Digital Business Cards
- **Short description:** Share a digital card. Save contacts, add notes, and follow up.

## Long description

Make a strong introduction—and remember what happens next.

Tappd gives you a digital business card you can share by link or QR code. When you meet someone, save their details in your private Tappd wallet, add a note or tag, and set a follow-up date so the connection is easier to pick up later.

**Share your card**

- Show a QR code or send your public card link.
- Let people open your card in a browser without installing Tappd.
- Let visitors save your public details to their phone contacts as a contact file.
- Write your card link to a supported NFC tag when you have a compatible device and writable tag.

**Keep your introductions organized**

- Save contacts you meet and the details they share with you.
- Add notes, tags, favorites, and follow-up dates.
- Search your wallet when you need to find someone again.
- Export your wallet as a CSV file.
- Save an individual contact to your phone contacts when you choose.

**Designed for control**

- Choose whether your public card is visible or private.
- Keep your account and saved wallet behind sign-in.
- Use QR scanning to open another Tappd card.
- Review the privacy policy and request account deletion from the service.

Tappd needs an internet connection for sign-in and wallet sync. Camera access is used when you scan a QR code. Contacts access is used only when you choose to create a phone contact; Tappd does not read or upload your address book. NFC sharing requires a compatible phone and writable NFC tag.

Tappd is for managing professional introductions. It does not guarantee that a contact will respond or that a follow-up will lead to business.

## Search terms

Use terms that describe the app, rather than competitor names or unsupported outcomes.

- **Apple keywords draft:** digital business card,networking,contacts,QR code,follow up,NFC
- **Google Play tags to consider:** Business, Productivity, Networking (select only tags available in Play Console and appropriate to the shipped app)

## Categories and audience

- **Apple primary category:** Business (confirm against current App Store Connect categories)
- **Google Play category:** Business (confirm against current Play Console categories)
- **Audience:** Adults who exchange professional contact details. Do not designate children as the target audience.
- **Age/content rating:** Complete Apple's and Google's current rating questionnaires based on the final binary. Review public profiles, user-submitted bios/links, visitor contact submissions, QR/NFC sharing, and contact data. Do not claim a specific rating in this draft.

## Store links and publisher details to complete

- **Marketing URL:** https://tappd.up.railway.app (verify on production before submission)
- **Support URL:** https://tappd.up.railway.app/support (add a monitored support email before submission)
- **Privacy policy URL:** https://tappd.up.railway.app/privacy (verify final operator and provider disclosures before submission)
- **Account deletion URL:** https://tappd.up.railway.app/account-deletion (verify the complete deletion flow on the signed build)
- **Seller/developer name:** [legal publisher name shown in the store]
- **Copyright:** [publisher name and year]
- **Contact email:** [monitored support address]
- **Release notes:** [specific changes in the submitted build]

The app has a public support route at `https://tappd.up.railway.app/support` with help topics, privacy, sign-in, and account-deletion links. Set `TAPPD_SUPPORT_EMAIL` to an inbox the operator controls and monitors before production release; the support and privacy pages hide the email action when this value is missing. The native app opens `/support` on its configured `EXPO_PUBLIC_API_URL`. Verify the production route before submitting the listing.

## Store metadata limits to preserve

- Google Play: app name up to 30 characters, short description up to 80, and full description up to 4,000. See [Play listing setup](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en-en) and [metadata policy](https://support.google.com/googleplay/android-developer/answer/9898842?hl=en).
- App Store Connect: name and subtitle up to 30 characters each; promotional text up to 170; description up to 4,000; keywords up to 100 bytes. Privacy policy URL is required and Support URL must provide contact information. See [App information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information) and [platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information).
- Apple screenshots are required (1–10 per localization). Tappd targets iPhone and Android phones; iPad support is disabled until a tablet layout is reviewed. Capture an iPhone screenshot for a device with Dynamic Island. Verify current device sizes and requirements in [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/), and confirm the layout on the final build before capture.

The privacy page describes Tappd's current code-level data handling, but operator identity, production providers, data region, backup/retention details, and a monitored `TAPPD_SUPPORT_EMAIL` must be verified before that page is treated as final store documentation. Use [the internal disclosure worksheet](store-data-disclosure-worksheet.md) to prepare the console declarations; it is a code-based draft, not a final legal or store declaration.

## Screenshot and preview checklist

Capture the final signed production build on real supported device sizes. Use a production domain and real, consented or synthetic profiles that are clearly not private customer data.

1. **Your card:** a polished card with its share link and QR action.
2. **Share flow:** QR/link sharing, with the recipient's browser card shown without requiring Tappd.
3. **Contact download:** the public card's “Download contact” action and the instruction for opening the `.vcf` file on a phone.
4. **Your wallet:** a saved introduction with note, tags, and follow-up date.
5. **Find someone:** search and useful results from a realistic contact set.
6. **Native actions:** show QR scanning, contact save, and NFC only on devices where those actions were tested.

Before exporting screenshots, remove localhost URLs, developer menus, test credentials, unapproved Wallet claims, personal data, loading/offline screens, and platform UI that obscures the product. Check the current store-specific screenshot sizes and device requirements when preparing the final image set.

## Store asset handoff checklist

These are production assets, not mockups. Capture them from the final signed build with synthetic profiles; do not add feature claims or promotional text that the build does not show.

### Google Play

- [ ] Upload the launcher icon as a 512 × 512 PNG with alpha, no larger than 1 MB. The icon must follow Play's icon rules; do not add ranking, price, or category badges.
- [ ] Upload at least two screenshots across different device types. Use JPEG or 24-bit PNG without alpha; each image must be 320–3840 px, with its longest side no more than twice its shortest. Use actual app captures, and make sure any added captions stay accurate to the shipped experience.
- [ ] If using a feature graphic, prepare a 1024 × 500 JPEG or 24-bit PNG without alpha. Keep it distinct from the app icon and avoid small detail that will not read on a phone.
- [ ] For tablet/large-screen distribution, capture and review the large-screen experience separately. Play recommends four screenshots at 1080 × 1920 (portrait) or 1920 × 1080 (landscape) for recommendation eligibility; treat this as a quality target, not a basic listing minimum.

### Apple App Store

- [ ] Upload 1–10 screenshots for each required device family and localization. Tappd currently targets iPhone; if iPad support is enabled later, review and capture the tablet layout before submission.
- [ ] App previews are optional. If added, capture the real app experience and verify Apple's current device-size and video specifications before export.

See Google's [preview asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en) and Apple's [screenshot and app preview upload requirements](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/). Recheck those pages when exporting because allowed sizes and device categories can change.

## Claims that require release verification

- Wallet passes are deliberately not mentioned. The Apple/Google pass buttons appear only when the corresponding provider is configured; these credentials and publishing approvals are not yet configured in the release environment.
- vCard/contact saving is a contact import path, not an Apple Wallet or Google Wallet pass.
- Confirm NFC tag writing and QR scanning on physical devices before featuring them in screenshots or store copy.
- Store privacy labels must reflect the actual deployed services and SDKs. Recheck collection, sharing, retention, deletion, diagnostics, and account requirements for the shipped build.
- Keep subscription, pricing, revenue, and business-outcome claims out of the listing until implemented, compliant with each store's billing rules, and supported by evidence.
