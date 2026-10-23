/**
 * Tappd's "who do I know that…" search.
 *
 * It is a deterministic ranking model, not an LLM call: the query is normalized,
 * expanded with role synonyms, then scored against weighted contact fields so
 * "designer in berlin" finds a Product Designer based in Berlin even if the
 * word "designer" only appears as the tag "design".
 */

export type SearchableConnection = {
  id: string;
  name: string;
  headline: string | null;
  company: string | null;
  location: string | null;
  tags: string[];
  notes: string | null;
  email: string | null;
  website: string | null;
  bio?: string | null;
  favorite: boolean;
  updatedAt: Date | string;
  source: string;
};

export type MatchField = {
  field: "name" | "headline" | "company" | "location" | "tags" | "notes" | "bio" | "email" | "website";
  label: string;
  term: string;
};

export type RankedConnection<T extends SearchableConnection> = {
  item: T;
  score: number;
  matchedTerms: string[];
  matches: MatchField[];
  reason: string;
};

const STOPWORDS = new Set([
  "a", "an", "and", "any", "are", "as", "at", "be", "can", "do", "does", "for", "from", "get",
  "got", "had", "has", "have", "he", "her", "him", "his", "how", "i", "in", "into", "is", "it",
  "its", "know", "me", "met", "my", "need", "of", "on", "or", "our", "out", "she", "so", "some",
  "someone", "something", "that", "the", "their", "them", "then", "there", "they", "this", "to",
  "us", "was", "we", "were", "what", "when", "where", "which", "who", "whom", "why", "will",
  "with", "would", "you", "your", "looking", "find", "help", "please", "around", "near", "based",
  "works", "working", "work", "guy", "person", "people", "contact", "connect", "introduce",
]);

const SYNONYM_GROUPS: string[][] = [
  ["design", "designer", "designing", "ux", "ui", "creative", "figma", "branding"],
  ["engineer", "engineering", "developer", "dev", "software", "programmer", "coder", "frontend", "backend", "fullstack", "react", "node", "swe"],
  ["product", "pm", "productmanager", "roadmap"],
  ["marketing", "marketer", "growth", "seo", "content", "social", "brand", "demandgen", "cmo"],
  ["sales", "businessdevelopment", "bd", "account", "revenue", "partnerships"],
  ["founder", "cofounder", "ceo", "entrepreneur", "startup", "owner"],
  ["investor", "vc", "venture", "fund", "angel", "capital"],
  ["finance", "cfo", "accountant", "accounting", "bookkeeper", "tax"],
  ["legal", "lawyer", "attorney", "counsel", "law", "paralegal"],
  ["recruiter", "recruiting", "talent", "hr", "hiring", "people", "sourcer"],
  ["operations", "ops", "chiefofstaff", "logistics", "admin"],
  ["data", "analyst", "analytics", "scientist", "ml", "ai", "insights"],
  ["photographer", "photography", "photo", "videographer", "video", "editor"],
  ["writer", "writing", "copywriter", "journalist", "author", "editor", "contentwriter"],
  ["doctor", "physician", "dentist", "nurse", "health", "medical", "therapist"],
  ["realestate", "property", "broker", "realtor", "agent", "landlord"],
  ["teacher", "professor", "educator", "tutor", "academic", "researcher"],
  ["architect", "architecture", "interior", "builder", "construction"],
  ["music", "musician", "producer", "dj", "composer", "audio"],
  ["consultant", "consulting", "advisor", "strategy", "freelance", "freelancer"],
];

const SYNONYMS = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) SYNONYMS.set(word, group);
}

const FIELD_WEIGHTS: Array<{
  field: MatchField["field"];
  label: string;
  weight: number;
  value: (connection: SearchableConnection) => string;
}> = [
  { field: "name", label: "Name", weight: 10, value: (c) => c.name },
  { field: "tags", label: "Tag", weight: 8, value: (c) => (c.tags ?? []).join(" ") },
  { field: "headline", label: "Role", weight: 6.5, value: (c) => c.headline ?? "" },
  { field: "company", label: "Company", weight: 5.5, value: (c) => c.company ?? "" },
  { field: "location", label: "Location", weight: 5, value: (c) => c.location ?? "" },
  { field: "notes", label: "Note", weight: 3, value: (c) => c.notes ?? "" },
  { field: "bio", label: "Bio", weight: 2.5, value: (c) => c.bio ?? "" },
  { field: "email", label: "Email", weight: 2, value: (c) => c.email ?? "" },
  { field: "website", label: "Website", weight: 2, value: (c) => c.website ?? "" },
];

export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9@.+#]+/)
    .map((token) => token.replace(/^[.@]+|[.@]+$/g, ""))
    .filter((token) => token.length > 1);
}

function singularize(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

type QueryTerm = { raw: string; variants: string[]; weight: number };

export function buildQuery(query: string): QueryTerm[] {
  const tokens = tokenize(query);
  const seen = new Set<string>();
  const terms: QueryTerm[] = [];

  for (const token of tokens) {
    const normalized = singularize(token);
    if (STOPWORDS.has(token) || STOPWORDS.has(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const group = SYNONYMS.get(normalized) ?? SYNONYMS.get(token);
    const variants = new Set<string>([normalized]);
    if (group) {
      for (const word of group) variants.add(singularize(word));
    }
    // A two-word role like "product designer" also counts as one concept.
    terms.push({ raw: token, variants: [...variants], weight: 1 });
  }

  // Multi-word phrases from the original query get a small boost on their own.
  const phrase = tokens.filter((t) => !STOPWORDS.has(t)).join(" ");
  if (phrase.includes(" ")) {
    terms.push({ raw: phrase, variants: [phrase], weight: 0.6 });
  }

  return terms;
}

function matchQuality(fieldTokens: string[], variants: string[]): number {
  let best = 0;
  for (const variant of variants) {
    for (const token of fieldTokens) {
      if (!token) continue;
      let quality = 0;
      if (token === variant) quality = 1;
      else if (variant.length >= 3 && token.startsWith(variant)) quality = 0.72;
      else if (variant.length >= 4 && token.includes(variant)) quality = 0.5;
      if (quality > best) best = quality;
      if (best === 1) return best;
    }
  }
  return best;
}

export function rankConnections<T extends SearchableConnection>(
  items: T[],
  query: string,
): RankedConnection<T>[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return items
      .slice()
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
      .map((item) => ({
        item,
        score: 0,
        matchedTerms: [],
        matches: [],
        reason: item.headline ?? (item.company ? `at ${item.company}` : "Saved contact"),
      }));
  }

  const terms = buildQuery(trimmed);
  if (terms.length === 0) return [];

  const normalizedPhrase = trimmed.toLowerCase();
  const results: RankedConnection<T>[] = [];

  for (const item of items) {
    const tokensByField = FIELD_WEIGHTS.map(({ value, ...rest }) => ({
      ...rest,
      tokens: tokenize(value(item)),
      text: value(item).toLowerCase(),
    }));

    let score = 0;
    let covered = 0;
    const matchedTerms = new Set<string>();
    const matches: MatchField[] = [];

    for (const term of terms) {
      let best = 0;
      let bestField: (typeof tokensByField)[number] | null = null;

      for (const field of tokensByField) {
        const quality = matchQuality(field.tokens, term.variants);
        const weighted = quality * field.weight;
        if (weighted > best) {
          best = weighted;
          bestField = field;
        }
      }

      if (bestField && best > 0) {
        score += best * term.weight;
        if (term.weight === 1) covered += 1;
        matchedTerms.add(term.raw);
        if (!matches.some((m) => m.field === bestField!.field)) {
          matches.push({ field: bestField.field, label: bestField.label, term: term.raw });
        }
      }
    }

    if (score === 0) continue;

    for (const field of tokensByField) {
      if (normalizedPhrase.length >= 4 && field.text.includes(normalizedPhrase)) {
        score += field.weight * 0.8;
      }
    }

    if (covered === terms.filter((t) => t.weight === 1).length) score += 4;
    if (item.favorite) score += 0.6;

    const reasonParts = matches
      .slice(0, 3)
      .map((match) => `${match.label.toLowerCase()} match “${match.term}”`);
    const descriptor = [item.headline, item.company, item.location].filter(Boolean).join(" · ");

    results.push({
      item,
      score: Math.round(score * 10) / 10,
      matchedTerms: [...matchedTerms],
      matches,
      reason: descriptor || reasonParts.join(" · ") || "Saved contact",
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
