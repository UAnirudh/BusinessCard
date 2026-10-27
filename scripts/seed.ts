/**
 * Seeds a demo workspace.
 *
 *   npm run db:seed
 *
 * Runs only against a local database: DATABASE_URL must point to loopback,
 * otherwise the embedded PGlite database in .data/ is used. Production mode
 * and remote database hosts are refused.
 */
import { eq } from "drizzle-orm";
import { databaseUrl, getDb } from "../db";
import { cardViews, cards, connections, users } from "../db/schema";
import { hashPassword } from "../lib/password";

const DEMO_EMAIL = "maya.chen@tappd.app";
const DEMO_PASSWORD = "tappd-demo";

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

type Member = {
  key: string;
  name: string;
  email: string;
  slug: string;
  headline: string;
  company: string;
  location: string;
  bio: string;
  tags: string[];
  accent: string;
  phone: string;
  website: string;
  links?: { label: string; url: string }[];
};

const MEMBERS: Member[] = [
  {
    key: "maya",
    name: "Maya Chen",
    email: DEMO_EMAIL,
    slug: "maya-chen",
    headline: "Product Designer",
    company: "Northwind Studio",
    location: "Berlin, Germany",
    bio: "I design products people actually finish using. Currently building design systems at Northwind. Ask me about onboarding flows.",
    tags: ["design", "design-systems", "ux", "saaS"],
    accent: "lime",
    phone: "+49 151 2244 8890",
    website: "northwind.studio",
    links: [{ label: "Portfolio", url: "maya.studio" }],
  },
  {
    key: "daniel",
    name: "Daniel Roth",
    email: "daniel.roth@meridian.vc",
    slug: "daniel-roth",
    headline: "Partner",
    company: "Meridian Capital",
    location: "New York, United States",
    bio: "Early-stage investor in fintech and vertical SaaS. Writing first cheques between $250k and $2M.",
    tags: ["investor", "fintech", "saas", "new-york"],
    accent: "ink",
    phone: "+1 212 555 0148",
    website: "meridian.vc",
  },
  {
    key: "priya",
    name: "Priya Anand",
    email: "priya.anand@angel.co",
    slug: "priya-anand",
    headline: "Angel investor",
    company: "ex-Stripe",
    location: "San Francisco, United States",
    bio: "Angel investing in payments and developer tools. Former payments PM at Stripe. Happy to review pitch decks.",
    tags: ["investor", "payments", "early-stage", "san-francisco"],
    accent: "violet",
    phone: "+1 415 555 0192",
    website: "priya.anand.co",
  },
  {
    key: "marcus",
    name: "Marcus Webb",
    email: "marcus.webb@fjord.vc",
    slug: "marcus-webb",
    headline: "VC Associate",
    company: "Fjord Ventures",
    location: "New York, United States",
    bio: "Climate and industrial software at Fjord. Always looking for founders with an unfair insight.",
    tags: ["investor", "climate", "new-york"],
    accent: "sky",
    phone: "+1 917 555 0104",
    website: "fjord.vc",
  },
  {
    key: "sofia",
    name: "Sofia Reyes",
    email: "sofia.reyes@lumen.io",
    slug: "sofia-reyes",
    headline: "Growth Lead",
    company: "Lumen Analytics",
    location: "Berlin, Germany",
    bio: "B2B growth, lifecycle and pricing experiments. I like boring funnels that compound.",
    tags: ["growth", "marketing", "b2b", "berlin"],
    accent: "coral",
    phone: "+49 176 8800 2145",
    website: "lumen.io",
  },
  {
    key: "james",
    name: "James Okafor",
    email: "james.okafor@stripe.com",
    slug: "james-okafor",
    headline: "Full-stack Engineer",
    company: "Stripe",
    location: "London, United Kingdom",
    bio: "React, Node, payments infrastructure. Building side projects at night, usually around dev tools.",
    tags: ["engineering", "react", "node", "payments"],
    accent: "mint",
    phone: "+44 7700 900432",
    website: "jamesokafor.dev",
  },
];

async function main() {
  const configuredDatabaseUrl = databaseUrl();
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo seed data is disabled when NODE_ENV=production.");
  }
  if (configuredDatabaseUrl) {
    let hostname: string;
    try {
      hostname = new URL(configuredDatabaseUrl).hostname.replace(/^\[|\]$/g, "").toLowerCase();
    } catch {
      throw new Error("Cannot verify the database host. Demo seed data is allowed only for a local database.");
    }
    if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
      throw new Error("Demo seed data is allowed only for a local database; refusing to write to a remote database.");
    }
  }

  const db = await getDb();

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  if (existing.length > 0) {
    console.log(`[seed] Demo account already exists (${DEMO_EMAIL}). Nothing to do.`);
    return;
  }

  const passwordHash = hashPassword(DEMO_PASSWORD);
  const ids: Record<string, { userId: string; cardId: string }> = {};

  for (const member of MEMBERS) {
    const [user] = await db
      .insert(users)
      .values({ name: member.name, email: member.email, passwordHash })
      .returning({ id: users.id });

    const [card] = await db
      .insert(cards)
      .values({
        userId: user.id,
        slug: member.slug,
        displayName: member.name,
        headline: member.headline,
        company: member.company,
        location: member.location,
        bio: member.bio,
        email: member.email,
        phone: member.phone,
        website: member.website,
        accent: member.accent,
        tags: member.tags,
        links: member.links ?? [],
        isPublic: true,
        collectLeads: true,
      })
      .returning({ id: cards.id });

    ids[member.key] = { userId: user.id, cardId: card.id };
  }

  const maya = ids.maya;

  const wallet = [
    {
      id: "daniel",
      source: "exchange",
      days: 2,
      favorite: true,
      notes: "Met at Slush. Asked for the fintech deck — follow up with the metrics slide and a June update.",
    },
    {
      id: "sofia",
      source: "exchange",
      days: 4,
      favorite: false,
      notes: "Coffee at The Barn. Wants to co-host a growth dinner in Berlin in July.",
    },
    {
      id: "priya",
      source: "exchange",
      days: 9,
      favorite: false,
      notes: "Intro’d by Daniel. Reviewed the deck on a call — said re-approach at $40k MRR.",
    },
    {
      id: "james",
      source: "exchange",
      days: 13,
      favorite: true,
      notes: "Design systems + React meetup. Offered to review our component library.",
    },
    {
      id: "marcus",
      source: "exchange",
      days: 21,
      favorite: false,
      notes: "Slush afterparty. Climate fund but knows everybody in NYC fintech.",
    },
  ] as const;

  for (const entry of wallet) {
    const member = MEMBERS.find((item) => item.key === entry.id);
    const target = ids[entry.id];
    if (!member || !target) continue;
    await db.insert(connections).values({
      ownerId: maya.userId,
      cardId: target.cardId,
      connectionUserId: target.userId,
      name: member.name,
      headline: member.headline,
      company: member.company,
      email: member.email,
      phone: member.phone,
      website: member.website,
      location: member.location,
      bio: member.bio,
      tags: member.tags,
      notes: entry.notes,
      favorite: entry.favorite,
      source: entry.source,
      metAt: daysAgo(entry.days),
      createdAt: daysAgo(entry.days),
      updatedAt: daysAgo(entry.days - 1),
    });
  }

  await db.insert(connections).values([
    {
      ownerId: maya.userId,
      name: "Lena Fischer",
      headline: "Brand Photographer",
      company: "Studio Lena",
      location: "Berlin, Germany",
      email: "lena@studiolena.de",
      phone: "+49 30 5557 2100",
      website: "studiolena.de",
      tags: ["photography", "branding"],
      notes: "Shot the Northwind rebrand. Good person for founder portraits.",
      source: "lead",
      metAt: daysAgo(6),
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    },
    {
      ownerId: maya.userId,
      name: "Tom Becker",
      headline: "Founder",
      company: "Craftly",
      location: "Munich, Germany",
      email: "tom@craftly.app",
      tags: ["founder", "saas"],
      notes: "Met on the train to Munich. Building procurement software for mid-size manufacturers.",
      source: "manual",
      metAt: daysAgo(31),
      createdAt: daysAgo(31),
      updatedAt: daysAgo(30),
    },
  ]);

  // Reciprocal connections so the demo works from both sides.
  await db.insert(connections).values({
    ownerId: ids.daniel.userId,
    cardId: maya.cardId,
    connectionUserId: maya.userId,
    name: "Maya Chen",
    headline: "Product Designer",
    company: "Northwind Studio",
    email: DEMO_EMAIL,
    phone: "+49 151 2244 8890",
    website: "northwind.studio",
    location: "Berlin, Germany",
    tags: ["design", "design-systems", "ux"],
    notes: "Follow up about the fintech deck in June.",
    source: "exchange",
    metAt: daysAgo(2),
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  });

  // Card views across the last week for the dashboard chart.
  const viewSources = ["qr", "nfc", "link", "share"];
  const views = Array.from({ length: 27 }, (_, index) => {
    const day = index % 7;
    const createdAt = daysAgo(day);
    createdAt.setHours(9 + (index % 9), (index * 7) % 60, 0, 0);
    return { cardId: maya.cardId, source: viewSources[index % viewSources.length], createdAt };
  });
  await db.insert(cardViews).values(views);

  console.log("[seed] Demo workspace ready.");
  console.log(`[seed] Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log("[seed] Demo cards: /c/maya-chen, /c/daniel-roth, /c/sofia-reyes");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exit(1);
  });
