import { createHash, createPrivateKey, createSign, X509Certificate } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { Readable } from "node:stream";
import { ZipFile } from "yazl";
import type { Card } from "@/db/schema";
import { getOrigin } from "@/lib/origin";

const env = (key: string) => process.env[key]?.trim() ?? "";
const execFileAsync = promisify(execFile);

type AppleWalletMaterial = {
  signerCertificate: string;
  signerPrivateKey: string;
  wwdrCertificate: string;
  passTypeIdentifier: string;
  teamIdentifier: string;
  passphrase?: string;
  now?: number;
};

function decodeBase64(value: string) {
  if (!value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) throw new Error("Invalid base64");
  const decoded = Buffer.from(value, "base64");
  if (decoded.length === 0 || decoded.toString("base64") !== value) throw new Error("Invalid base64");
  return decoded;
}

function certificateIsCurrent(certificate: X509Certificate, now: number) {
  const validFrom = Date.parse(certificate.validFrom);
  const validTo = Date.parse(certificate.validTo);
  return Number.isFinite(validFrom) && Number.isFinite(validTo) && now >= validFrom && now < validTo;
}

function certificateSubjectMatches(certificate: X509Certificate, passTypeIdentifier: string, teamIdentifier: string) {
  const attributes = certificate.subject.split("\n").map((line) => {
    const separator = line.indexOf("=");
    return separator < 0 ? null : [line.slice(0, separator), line.slice(separator + 1)] as const;
  }).filter((attribute): attribute is readonly [string, string] => attribute !== null);
  const userIds = attributes.filter(([name]) => name === "UID").map(([, value]) => value);
  const organizationalUnits = attributes.filter(([name]) => name === "OU").map(([, value]) => value);
  return userIds.length === 1 && userIds[0] === passTypeIdentifier &&
    organizationalUnits.length === 1 && organizationalUnits[0] === teamIdentifier;
}

/** Validate locally available Apple pass signing materials without exposing credential details. */
export function appleWalletSigningMaterialIsValid({
  signerCertificate,
  signerPrivateKey,
  wwdrCertificate,
  passTypeIdentifier,
  teamIdentifier,
  passphrase,
  now = Date.now(),
}: AppleWalletMaterial) {
  try {
    const signer = new X509Certificate(decodeBase64(signerCertificate));
    const wwdr = new X509Certificate(decodeBase64(wwdrCertificate));
    const key = createPrivateKey({ key: decodeBase64(signerPrivateKey), format: "pem", ...(passphrase ? { passphrase } : {}) });
    return key.type === "private" && signer.checkPrivateKey(key) &&
      certificateSubjectMatches(signer, passTypeIdentifier, teamIdentifier) &&
      signer.checkIssued(wwdr) && signer.verify(wwdr.publicKey) &&
      certificateIsCurrent(signer, now) && certificateIsCurrent(wwdr, now);
  } catch {
    return false;
  }
}

export async function isOpenSslAvailable(command: string) {
  if (!command.trim()) return false;
  try {
    await execFileAsync(command, ["version"], { windowsHide: true, timeout: 5000, maxBuffer: 64 * 1024 });
    return true;
  } catch {
    return false;
  }
}

const opensslChecks = new Map<string, Promise<boolean>>();
function cachedOpenSslAvailable(command: string) {
  let check = opensslChecks.get(command);
  if (!check) {
    check = isOpenSslAvailable(command);
    opensslChecks.set(command, check);
  }
  return check;
}

function googleWalletIsConfigured(issuerId: string, classId: string) {
  let validGoogleAccount = false;
  try {
    const raw = Buffer.from(env("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64"), "base64").toString("utf8");
    const credentials = JSON.parse(raw) as { client_email?: string; private_key?: string };
    validGoogleAccount = Boolean(credentials.client_email && credentials.private_key);
  } catch {
    validGoogleAccount = false;
  }
  return Boolean(issuerId && classId.startsWith(`${issuerId}.`) && /^[A-Za-z0-9._-]+$/.test(classId) && validGoogleAccount);
}

export async function walletAvailability() {
  const issuerId = env("GOOGLE_WALLET_ISSUER_ID");
  const classId = env("GOOGLE_WALLET_CLASS_ID");
  const signerCertificate = env("APPLE_WALLET_SIGNER_CERT_BASE64");
  const signerPrivateKey = env("APPLE_WALLET_SIGNER_KEY_BASE64");
  const wwdrCertificate = env("APPLE_WALLET_WWDR_CERT_BASE64");
  const passTypeIdentifier = env("APPLE_WALLET_PASS_TYPE_ID");
  const teamIdentifier = env("APPLE_WALLET_TEAM_ID");
  const appleMaterialReady = Boolean(
    passTypeIdentifier && teamIdentifier &&
    appleWalletSigningMaterialIsValid({
      signerCertificate,
      signerPrivateKey,
      wwdrCertificate,
      passTypeIdentifier,
      teamIdentifier,
      passphrase: env("APPLE_WALLET_SIGNER_KEY_PASSPHRASE") || undefined,
    }),
  );
  const [apple, google] = await Promise.all([
    appleMaterialReady ? cachedOpenSslAvailable(env("OPENSSL_BIN") || "openssl") : false,
    Promise.resolve(googleWalletIsConfigured(issuerId, classId)),
  ]);
  return {
    apple,
    google,
  };
}

function localized(value: string) {
  return { defaultValue: { language: "en-US", value } };
}

function googleWalletKey(): { client_email: string; private_key: string } {
  const raw = Buffer.from(env("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64"), "base64").toString("utf8");
  const credentials = JSON.parse(raw) as { client_email?: string; private_key?: string };
  if (!credentials.client_email || !credentials.private_key) throw new Error("Invalid Google Wallet service account credentials");
  return { client_email: credentials.client_email, private_key: credentials.private_key };
}

export async function googleWalletSaveUrl(card: Card) {
  const issuerId = env("GOOGLE_WALLET_ISSUER_ID");
  const classId = env("GOOGLE_WALLET_CLASS_ID");
  const credentials = googleWalletKey();
  const origin = await getOrigin();
  const cardUrl = `${origin}/c/${card.slug}`;
  const safeId = card.slug.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64);
  const identity = [card.headline, card.company].filter(Boolean).join(" · ").slice(0, 140) || "Tappd member";

  const payload = {
    iss: credentials.client_email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [origin],
    payload: {
      genericObjects: [{
        id: `${issuerId}.${safeId}`,
        classId,
        genericType: "GENERIC_TYPE_UNSPECIFIED",
        state: "ACTIVE",
        cardTitle: localized("Tappd"),
        subheader: localized(identity),
        header: localized(card.displayName),
        hexBackgroundColor: "#182018",
        barcode: { type: "QR_CODE", value: cardUrl, alternateText: card.slug },
      }],
    },
  };
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsignedToken = `${encode({ alg: "RS256", typ: "JWT" })}.${encode(payload)}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(credentials.private_key, "base64url");
  return `https://pay.google.com/gp/v/save/${unsignedToken}.${signature}`;
}

export async function appleWalletPass(card: Card) {
  const cert = (name: string) => Buffer.from(env(name), "base64");
  const passTypeIdentifier = env("APPLE_WALLET_PASS_TYPE_ID");
  const teamIdentifier = env("APPLE_WALLET_TEAM_ID");
  const origin = await getOrigin();
  const cardUrl = `${origin}/c/${card.slug}`;
  const icon = await readFile(path.join(process.cwd(), "public", "icon-192.png"));
  const passJson = {
    formatVersion: 1,
    passTypeIdentifier,
    teamIdentifier,
    serialNumber: card.id,
    organizationName: "Tappd",
    description: `${card.displayName} on Tappd`,
    backgroundColor: "rgb(24, 32, 24)",
    foregroundColor: "rgb(255, 255, 255)",
    labelColor: "rgb(206, 233, 153)",
    generic: {
      primaryFields: [{ key: "name", label: "NAME", value: card.displayName }],
      secondaryFields: card.headline || card.company
        ? [{ key: "role", label: "ROLE", value: [card.headline, card.company].filter(Boolean).join(" · ") }]
        : [],
      backFields: [
        ...(card.email ? [{ key: "email", label: "EMAIL", value: card.email }] : []),
        ...(card.phone ? [{ key: "phone", label: "PHONE", value: card.phone }] : []),
        ...(card.website ? [{ key: "website", label: "WEBSITE", value: card.website }] : []),
        { key: "profile", label: "TAPPD CARD", value: cardUrl },
      ],
    },
    barcodes: [{ format: "PKBarcodeFormatQR", message: cardUrl, messageEncoding: "iso-8859-1" }],
  };
  const files: Record<string, Buffer> = {
    "pass.json": Buffer.from(JSON.stringify(passJson)),
    "icon.png": icon,
    "icon@2x.png": icon,
  };
  const manifest = Object.fromEntries(
    Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([name, contents]) => [
      name,
      createHash("sha1").update(contents).digest("hex"),
    ]),
  );
  files["manifest.json"] = Buffer.from(JSON.stringify(manifest));

  const temp = await mkdtemp(path.join(tmpdir(), "tappd-wallet-"));
  try {
    const certPath = path.join(temp, "signer.pem");
    const keyPath = path.join(temp, "signer-key.pem");
    const wwdrPath = path.join(temp, "wwdr.pem");
    const manifestPath = path.join(temp, "manifest.json");
    const signaturePath = path.join(temp, "signature");
    await Promise.all([
      writeFile(certPath, cert("APPLE_WALLET_SIGNER_CERT_BASE64"), { mode: 0o600 }),
      writeFile(keyPath, cert("APPLE_WALLET_SIGNER_KEY_BASE64"), { mode: 0o600 }),
      writeFile(wwdrPath, cert("APPLE_WALLET_WWDR_CERT_BASE64"), { mode: 0o600 }),
      writeFile(manifestPath, files["manifest.json"], { mode: 0o600 }),
    ]);
    const args = ["smime", "-binary", "-sign", "-certfile", wwdrPath, "-signer", certPath, "-inkey", keyPath, "-in", manifestPath, "-out", signaturePath, "-outform", "DER"];
    const passphrase = env("APPLE_WALLET_SIGNER_KEY_PASSPHRASE");
    if (passphrase) args.push("-passin", "env:APPLE_WALLET_SIGNER_KEY_PASSPHRASE");
    await execFileAsync(env("OPENSSL_BIN") || "openssl", args, { windowsHide: true, maxBuffer: 1024 * 1024 });
    files.signature = await readFile(signaturePath);

    const zip = new ZipFile();
    for (const [name, contents] of Object.entries(files)) zip.addBuffer(contents, name, { compress: true });
    zip.end();
    const chunks: Buffer[] = [];
    for await (const chunk of zip.outputStream as Readable) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
