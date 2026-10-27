# Store privacy and data-disclosure worksheet

**Status: internal draft, prepared from the current working tree based on `dd9b81e`.** This worksheet helps prepare Apple App Privacy and Google Play Data safety forms. It is not a legal determination and should not be copied into either store console without operator review against the final signed build, current production configuration, provider contracts, retention settings, and applicable law.

## Code-evidenced data inventory

| Data area | Data handled by the product | Purpose visible in code | What the operator must confirm |
| --- | --- | --- | --- |
| Account and authentication | Name, email, scrypt password hash, session identifier digest, session expiry; signup, password-reset, and email-change token digests when those flows are used | Account access, email ownership verification, authentication, account recovery, and changing sign-in email | Retention/deletion timing for backups and logs |
| Public profile | Name and any supplied role, company, bio, location, photo, phone, email, social links, custom links, accent, tags, and public/private setting | Render and share the member's business card | New verified accounts start with a private card and opt into public sharing; existing cards may remain public until their owner changes the setting |
| Wallet contacts | Name, role, company, bio, email, phone, website, location, notes, tags, favorite, follow-up date, source, meeting time, and linked card/account IDs where available | Save, search, annotate, follow up, exchange, and export professional contacts | Contact data can be provided by members or visitors and may include information about people who do not have accounts |
| Visitor submissions | Name, one contact method (email or phone), optional note, and target card | Deliver a visitor's details to the card owner for follow-up | Confirm whether visitor submissions are enabled in the submitted build and disclose that the recipient is another user |
| Safety reports and blocks | Report category, optional report details, target card, reporting account ID when signed in, blocked-account pairs, moderation status and reviewer account ID | Review reported public-card content, hide cards, and suspend abusive accounts | Confirm moderator access, support/response process, retention period for open and closed reports, and disclosure of any personal information included by reporters |
| Usage and abuse prevention | Card ID, view source, timestamp; request IP address is used in rate-limit keys, and shared rate-limit counters expire | Show aggregate card views and limit abusive requests | Confirm Railway logs/IP retention, database cleanup/retention for view records and rate-limit entries, and whether metrics are enabled |
| Device permissions and local data | Camera access for scanning; Contacts permission only when a member chooses to create a phone contact; native bearer session in iOS Keychain/Android Keystore | QR scanning, optional device contact creation, and persistent sign-in | Confirm OS disclosures against the generated manifests and test both permission grant and denial on real devices |
| Email delivery | Account email and one-time signup-verification, password-reset, or email-change link if Resend is configured | Verify mailbox ownership, recover accounts, and confirm sign-in email changes | At the reviewed production state, `RESEND_API_KEY` and `TAPPD_EMAIL_FROM` were not configured; the new signup flow therefore fails closed until the operator configures a verified sending domain and tests delivery |
| Hosting and database | Data submitted to the service, plus operational request/deployment diagnostics | Serve the app and persist account/card/wallet data | Confirm Railway service region, subprocessors, backup policy, log retention, and deletion behavior from the actual account settings and contract |

## Data sharing and visibility checks

- Public card fields are intentionally visible to anyone who has the public card URL while the card is public. The card includes a QR code and downloadable vCard representation.
- Visitor details submitted from a public card are delivered to that card's owner and stored in the owner's wallet.
- A member can share a card link through the platform share sheet. The recipient can view the public card in a browser without installing the app.
- Current code does not show an advertising SDK, cross-app advertising identifier, analytics SDK, crash-reporting SDK, or third-party contact discovery integration. Recheck the final dependency graph and EAS/native build before declaring that no such data is collected.
- Native wallet responses remain in memory; the native sign-in token is stored using SecureStore. The app does not sync or upload the device address book; contact creation is a user-triggered action for one selected wallet entry.

## Owner confirmations required before console entry

- [ ] Legal publisher/operator name and contact address.
- [ ] Railway data region, backup retention, operational-log retention, and deletion propagation.
- [ ] Whether Resend is enabled in production, its region/data processing terms, and the verified sender identity.
- [ ] Configure `TAPPD_MODERATOR_EMAILS` with monitored operator accounts and establish timely report review, removal, and appeal procedures.
- [ ] Define and disclose a retention schedule for moderation reports and review records.
- [ ] Whether any analytics, crash reporting, monitoring, customer support, or marketing providers were added outside the checked code paths.
- [ ] Exact public fields and visitor lead collection behavior in the signed build.
- [ ] Whether each collected category is linked to a user identity, optional, and retained until account deletion or for a defined period.
- [ ] Apple App Privacy answers and Google Play Data safety answers reviewed by the responsible publisher against current console definitions.
- [ ] Privacy URL, support URL with monitored email, and account-deletion URL are live and exercised using the release build.

## Release verification

1. Generate the signed Android App Bundle and signed iOS archive from the final publisher-owned app identifiers.
2. Inspect generated release artifacts and manifests. Verify Android `targetSdkVersion` is at least API 36, and verify iOS SDK/build settings meet Apple's current upload rule.
3. Compare the final native manifests, permissions, entitlements, privacy manifest, and dependency list with the disclosures above.
4. Exercise signup, login, public/private cards, visitor contact submission, QR/NFC sharing, optional contact creation, password recovery, email change, and account deletion on physical devices.
5. Resolve all unchecked owner confirmations before submitting Data safety or App Privacy declarations.
