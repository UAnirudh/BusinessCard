export const SITE = {
  name: "Tappd",
  tagline: "Digital cards, contacts and follow-ups.",
  description:
    "Create a digital business card to share by link, QR code or NFC. Save contacts with meeting notes and follow-up dates.",
};

export type Accent = {
  key: string;
  label: string;
  base: string;
  ink: string;
  chip: string;
  swatch: string;
};

export const ACCENTS: Accent[] = [
  {
    key: "lime",
    label: "Soft sage",
    base: "#e8ede0",
    ink: "#151a05",
    chip: "rgba(21, 26, 5, 0.12)",
    swatch: "#d4dfc4",
  },
  {
    key: "violet",
    label: "Lavender",
    base: "#ece8f3",
    ink: "#140b2e",
    chip: "rgba(20, 11, 46, 0.14)",
    swatch: "#d8d0e7",
  },
  {
    key: "sky",
    label: "Sky",
    base: "#e4eef2",
    ink: "#062330",
    chip: "rgba(6, 35, 48, 0.12)",
    swatch: "#c9dfe7",
  },
  {
    key: "coral",
    label: "Clay",
    base: "#f1e5df",
    ink: "#33130a",
    chip: "rgba(51, 19, 10, 0.12)",
    swatch: "#e3c8bb",
  },
  {
    key: "mint",
    label: "Mint",
    base: "#e2eee7",
    ink: "#04291d",
    chip: "rgba(4, 41, 29, 0.12)",
    swatch: "#c6dfd0",
  },
  {
    key: "ink",
    label: "Ink",
    base: "#24272b",
    ink: "#f6f6f3",
    chip: "rgba(255, 255, 255, 0.14)",
    swatch: "#191920",
  },
];

export function getAccent(key: string | null | undefined): Accent {
  return ACCENTS.find((accent) => accent.key === key) ?? ACCENTS[0];
}
