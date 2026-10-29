# Store privacy and data-disclosure worksheet

**Status: internal draft, reviewed against repository source on 2026-10-28.** This worksheet helps prepare Apple App Privacy and Google Play Data safety forms. It is not a legal determination and should not be copied into either store console without operator review against the final signed build, current production configuration, provider contracts, retention settings, and applicable law. Apple requires app-level answers to include third-party partners; Google requires app data flows, including SDKs, to be reviewed. See [Apple App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy) and [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en-en).

## Code-evidenced data inventory

| Data area | Data handled by the product | Purpose visible in code | What the operator must confirm |
| --- | --- | --- | --- |
| Account and authentication | Name, email, scrypt password hash, Terms of Use acceptance timestamp/version, session identifier digest, session expiry; signup, password-reset, and email-change token digests when those flows are used | Account access, email ownership verification, recording agreement to current Terms, authentication, account recovery, and changing sign-in email | Retention/deletion timing for backups and logs |
| Public profile | Name and any supplied role, company, bio, location, avatar image, phone, email, social links, custom links, accent, tags, and public/private setting. Avatar bytes are stored as base64 in Postgres. | Render and share the member's business card | New verified accounts start with a private card and opt into public sharing; existing cards may remain public until their owner changes the setting |
| Wallet contacts | Name, role, company, bio, email, phone, website, location, notes, tags, favorite, follow-up date, source, meeting time, and linked card/account IDs where available | Save, search, annotate, follow up, exchange, and export professional contacts | Contact data can be provided by members or visitors and may include information about people who do not have accounts |
| Visitor submissions and card exchanges | Name, optional role/headline and company, optional email and phone, optional note and tags, and target card; unauthenticated visitor submissions must include email or phone, while signed-in exchanges may omit both | Deliver a visitor's details to the card owner and save card exchanges in the member's wallet | Confirm whether visitor submissions are enabled in the submitted build and disclose that the recipient is another user |
| Safety reports and blocks | Report category, optional report details, target card, reporting account ID when signed in, blocked-account pairs, moderation status and reviewer account ID | Review reported public-card content, hide cards, and suspend abusive accounts | Confirm moderator access, support/response process, retention period for open and closed reports, and disclosure of any personal information included by reporters |
| Usage and abuse prevention | Card ID, view source, timestamp; request client IP and, on some routes, email/token/card/account identifiers contribute to abuse-limit keys. The database stores an HMAC-SHA-256 digest of each key, not the raw key. | Show card-view counts and limit abusive requests | Confirm Railway request-log/IP retention, view-record retention, rate-limit cleanup behavior, and whether metrics are enabled |
| Device permissions and local data | Camera access for scanning; Contacts permission only when a member chooses to create a phone contact; NFC access when writing a tag; native bearer session in iOS Keychain/Android Keystore | QR scanning, optional device contact creation, writing a public card link to an NFC tag, and persistent sign-in | Confirm the generated manifests and entitlements for camera, contacts, and NFC, and test available devices and permission flows on real devices |
| Email delivery | Account email and one-time signup-verification, password-reset, or email-change link if Resend is configured | Verify mailbox ownership, recover accounts, and confirm sign-in email changes | At the reviewed production state, `RESEND_API_KEY` and `TAPPD_EMAIL_FROM` were not configured; the new signup flow therefore fails closed until the operator configures a verified sending domain and tests delivery |
| Optional Wallet passes | If enabled, the Apple pass contains the card name, role/company, optional email/phone/website, and public card URL/QR. The Google Wallet save token contains the card name, role/company, and public card URL/QR. | Add a member's public card to Apple Wallet or Google Wallet after the member taps the corresponding action | Credentials and Wallet publishing approvals were not configured at review time. Verify provider terms, actual issuer behavior, and what each platform retains before enabling or declaring the integration |
| Hosting and database | Data submitted to the service, plus operational request/deployment diagnostics | Serve the app and persist account/card/wallet data | Confirm Railway service region, subprocessors, backup policy, log retention, and deletion behavior from the actual account settings and contract |

## Data sharing and visibility checks

- Public card fields are intentionally visible to anyone who has the public card URL while the card is public. The card includes a QR code and downloadable vCard representation.
- Visitor details submitted from a public card are delivered to that card's owner and stored in the owner's wallet.
- A member can share a card link through the platform share sheet. The recipient can view the public card in a browser without installing the app.
- In the native share sheet, Tappd supplies the member's name, optional headline, and public card URL to the app the member chooses. Review the final OS share behavior and recipient context when preparing disclosures.
- The native Contacts integration presents the system's create-contact form for one selected wallet entry. The app does not read or upload the device address book. QR scanning processes the scanned card URL in the app; NFC writes the public card URL to a compatible tag.
- If enabled, Google Wallet receives a save URL whose signed payload includes the public card name, role/company, and card URL. Apple Wallet receives a pass generated by the service with the public card name, role/company, optional email/phone/website, and card URL. These integrations are currently unconfigured; verify final provider behavior before activation and disclosure.
- Current code does not show an advertising SDK, cross-app advertising identifier, analytics SDK, crash-reporting SDK, or third-party contact discovery integration. Recheck the final dependency graph and EAS/native build before declaring that no such data is collected.
- Native wallet responses remain in memory; the native sign-in token is stored using SecureStore. The app does not sync or upload the device address book; contact creation is a user-triggered action for one selected wallet entry.

## Deletion and retention behavior visible in code

- A 30-day session credential stops authenticating after expiry; browser sessions use an HTTP-only cookie and native sessions use Expo SecureStore on the device. The server stores a digest of each bearer session token rather than its raw token. No scheduled session-row cleanup job was found, so an expired row may remain until logout, revocation, or account deletion.
- Deleting an account transactionally removes other members' Tappd wallet connections linked to that account or its card, then cascades deletion to the account's sessions, card and avatar, owned wallet connections, blocks, card views, and password-reset/email-change tokens. Confirm production backup and log deletion timelines separately; database cascades do not prove that backups or host logs are erased on the same schedule.
- A saved contact is a snapshot, but the current account-deletion flow removes Tappd recipient-wallet snapshots that still reference the deleted account or card. Copies already exported as vCards or CSVs, created in a phone address book, shared through external apps, or saved to external Wallet services are outside this database deletion transaction and may persist. The service has no revocation flow for those copies; explain the limit clearly and verify the exact behavior of any enabled Wallet provider.
- If a user who filed a report deletes their account, `reporterUserId` is set to null; the report's reason/details remain while its target card exists. If the target card is deleted, its reports cascade-delete. Set and disclose the moderation-record retention policy, including the content of free-text report details.
- Rate-limit inputs can include the request client IP, email, token digest, card slug, or account ID. The rate-limit table stores an HMAC-SHA-256 digest of each combined key, not the raw IP or identifier. Expired counters are removed opportunistically when a later rate-limit request runs cleanup, after the reset time plus a 24-hour grace period; this is not a fixed deletion deadline. Card-view records retain the card ID, source, and timestamp, but do not store the viewer IP in that table. Confirm Railway's separate request-log behavior and retention.

Treat profile and wallet fields tied to a Tappd account as linked to that account during the store questionnaire review. Do not assume a pseudonymous rate-limit digest is out of scope without applying the store's current definitions. Confirm the final platform categories, purposes, optionality, and sharing answers from the shipped build and third-party SDK inventory; this worksheet intentionally does not pre-fill console answers.

These are code-level observations, not store-console answers. Google treats data transmitted off-device as collection unless a specific exception applies; Apple requires data types to be assessed against its collection/linking/tracking definitions. Review the final flows and partner SDKs using the linked official guidance before submitting declarations.

## Owner confirmations required before console entry

- [ ] Legal publisher/operator name and contact address.
- [ ] Railway data region, backup retention, operational-log retention, and deletion propagation.
- [ ] Whether Resend is enabled in production, its region/data processing terms, and the verified sender identity.
- [ ] Configure `TAPPD_MODERATOR_EMAILS` with monitored operator accounts and establish timely report review, removal, and appeal procedures.
- [ ] Define and disclose a retention schedule for moderation reports and review records.
- [ ] Whether any analytics, crash reporting, monitoring, customer support, or marketing providers were added outside the checked code paths.
- [ ] Exact public fields and visitor lead collection behavior in the signed build.
- [ ] Whether optional Apple/Google Wallet passes are enabled. If enabled, confirm the data passed to each provider, provider retention, and the corresponding disclosure fields.
- [ ] Whether the account-deletion promise explains that linked recipient-wallet snapshots are removed from Tappd while previously exported vCards/CSVs, phone contacts, external shares, and external Wallet copies may persist. Confirm and disclose the moderation-report and backup/log retention rules separately.
- [ ] Verify platform-generated Android/iOS manifests, privacy manifests, native dependency data practices, and actual permission prompts from the signed build; `app.json` alone is not proof of the final manifest.
- [ ] Whether each collected category is linked to a user identity, optional, and retained until account deletion or for a defined period.
- [ ] Apple App Privacy answers and Google Play Data safety answers reviewed by the responsible publisher against current console definitions.
- [ ] Privacy URL, support URL with monitored email, and account-deletion URL are live and exercised using the release build.

## Release verification

1. Generate the signed Android App Bundle and signed iOS archive from the final publisher-owned app identifiers.
2. Inspect generated release artifacts and manifests. Verify Android `targetSdkVersion` is at least API 36, and verify iOS SDK/build settings meet Apple's current upload rule.
3. Compare the final native manifests, permissions, entitlements, privacy manifest, and dependency list with the disclosures above.
4. Exercise signup, login, public/private cards, visitor contact submission, QR/NFC sharing, optional contact creation, password recovery, email change, and account deletion on physical devices.
5. Resolve all unchecked owner confirmations before submitting Data safety or App Privacy declarations.
