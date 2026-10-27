import { z } from "zod";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null));

const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .nullish()
  .transform((value) => (value && value.length > 0 ? value.toLowerCase() : null))
  .refine((value) => value === null || z.string().email().safeParse(value).success, {
    message: "Enter a valid email address",
  });

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters")
  .max(42)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes only");

export const linkSchema = z.object({
  label: z.string().trim().min(1).max(40),
  url: z.string().trim().min(1).max(400),
});

export const cardUpdateSchema = z.object({
  displayName: z.string().trim().min(2, "Add your name").max(80),
  headline: text(120),
  company: text(120),
  bio: text(500),
  location: text(120),
  email: optionalEmail,
  phone: text(40),
  website: text(300),
  linkedin: text(300),
  twitter: text(300),
  github: text(300),
  instagram: text(300),
  accent: z.string().trim().max(24).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
  links: z.array(linkSchema).max(8).optional(),
  isPublic: z.boolean().optional(),
  collectLeads: z.boolean().optional(),
  slug: slugSchema.optional(),
});

export const connectionCreateSchema = z.object({
  name: z.string().trim().min(1, "Add a name").max(120),
  headline: text(120),
  company: text(120),
  email: optionalEmail,
  phone: text(40),
  website: text(300),
  location: text(120),
  bio: text(1000),
  notes: text(2000),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
  metAt: z.string().trim().max(40).nullish(),
});

export const connectionUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  headline: text(120).optional(),
  company: text(120).optional(),
  email: optionalEmail.optional(),
  phone: text(40).optional(),
  website: text(300).optional(),
  location: text(120).optional(),
  bio: text(1000).optional(),
  notes: text(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
  favorite: z.boolean().optional(),
  followUpDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date")
    .refine((value) => {
      const [year, month, day] = value.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    }, "Choose a valid date")
    .nullable()
    .optional(),
});

/** A visitor handing their details back after opening someone's card. */
export const exchangeSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1, "Add your name").max(120),
  email: optionalEmail,
  phone: text(40),
  company: text(120),
  headline: text(120),
  note: text(500),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
});

export const accountUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().min(8, "Use at least 8 characters").max(200).optional(),
  agreedToDelete: z.literal(true).optional(),
});

export const accountEmailChangeRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
  currentPassword: z.string().min(1, "Enter your current password").max(200),
});

export const accountEmailChangeConfirmSchema = z.object({
  token: z.string().min(20).max(200),
});

export const viewSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  source: z.enum(["link", "qr", "nfc", "share", "direct"]).optional(),
});

export type CardUpdateInput = z.infer<typeof cardUpdateSchema>;
export type ConnectionCreateInput = z.infer<typeof connectionCreateSchema>;
