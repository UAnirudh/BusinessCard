export const SITE = {
  name: "Tappd",
  tagline: "Tap phones. Swap cards. Never lose a good contact again.",
  description:
    "Tappd turns your phone into a digital business card. Share with a tap, a QR code or a link, and keep everyone you meet in one searchable wallet.",
};

export type Accent = {
  key: string;
  label: string;
  base: string;
  glow: string;
  ink: string;
  chip: string;
  swatch: string;
};

export const ACCENTS: Accent[] = [
  {
    key: "lime",
    label: "Electric lime",
    base: "linear-gradient(160deg, #e8ff86 0%, #c9ff3d 45%, #a8e021 100%)",
    glow: "rgba(201, 255, 61, 0.45)",
    ink: "#151a05",
    chip: "rgba(21, 26, 5, 0.12)",
    swatch: "#c9ff3d",
  },
  {
    key: "violet",
    label: "Ultra violet",
    base: "linear-gradient(160deg, #c8b6ff 0%, #9b7bff 50%, #6d4df5 100%)",
    glow: "rgba(139, 108, 255, 0.4)",
    ink: "#140b2e",
    chip: "rgba(20, 11, 46, 0.14)",
    swatch: "#9b7bff",
  },
  {
    key: "sky",
    label: "Coastal sky",
    base: "linear-gradient(160deg, #b9ecff 0%, #71d0ff 45%, #2aa7e0 100%)",
    glow: "rgba(113, 208, 255, 0.4)",
    ink: "#062330",
    chip: "rgba(6, 35, 48, 0.12)",
    swatch: "#71d0ff",
  },
  {
    key: "coral",
    label: "Sunset coral",
    base: "linear-gradient(160deg, #ffd2bd 0%, #ff9d7a 45%, #f06b4f 100%)",
    glow: "rgba(255, 157, 122, 0.4)",
    ink: "#33130a",
    chip: "rgba(51, 19, 10, 0.12)",
    swatch: "#ff9d7a",
  },
  {
    key: "mint",
    label: "Quiet mint",
    base: "linear-gradient(160deg, #c6f7e2 0%, #86e6c0 50%, #43c79b 100%)",
    glow: "rgba(134, 230, 192, 0.4)",
    ink: "#04291d",
    chip: "rgba(4, 41, 29, 0.12)",
    swatch: "#86e6c0",
  },
  {
    key: "ink",
    label: "Midnight ink",
    base: "linear-gradient(160deg, #3a3a44 0%, #191920 55%, #0a0a0c 100%)",
    glow: "rgba(120, 120, 140, 0.35)",
    ink: "#f6f6f3",
    chip: "rgba(255, 255, 255, 0.14)",
    swatch: "#191920",
  },
];

export function getAccent(key: string | null | undefined): Accent {
  return ACCENTS.find((accent) => accent.key === key) ?? ACCENTS[0];
}
