const SPECIALTY_WORDS: Array<{ match: RegExp; suggestions: string[] }> = [
  {
    match: /design|ux|ui|research|creative/,
    suggestions: ["user research", "design systems", "prototyping", "onboarding", "accessibility", "service design"],
  },
  {
    match: /product|founder|startup/,
    suggestions: ["product discovery", "early-stage products", "product strategy", "roadmapping", "launch planning"],
  },
  {
    match: /engineer|engineering|developer|software|data|technology/,
    suggestions: ["developer tools", "platform work", "data products", "accessible interfaces", "technical strategy"],
  },
  {
    match: /growth|marketing|sales|brand|content/,
    suggestions: ["customer research", "go-to-market planning", "brand positioning", "content strategy", "partnerships"],
  },
  {
    match: /recruit|talent|people|human resources/,
    suggestions: ["candidate experience", "team building", "career conversations", "hiring strategy"],
  },
  {
    match: /consult|coach|advisor|strategy/,
    suggestions: ["clear next steps", "team workshops", "operating strategy", "change management"],
  },
];

export const BIO_STARTERS = [
  "I help [people] with [a challenge they face].",
  "My approach is [how you like to work] with [what matters to you] in mind.",
  "Ask me about [a topic or project you enjoy talking through].",
];

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[-_]+/g, " ");
}

export function specialtySuggestions(role: string, selected: string[], limit = 6): string[] {
  const context = normalize([role, ...selected].join(" "));
  const chosen = new Set(selected.map(normalize));
  const matches = SPECIALTY_WORDS
    .filter(({ match }) => match.test(context))
    .flatMap(({ suggestions }) => suggestions);

  return [...new Set(matches.map((item) => item.trim()))]
    .filter((item) => !chosen.has(normalize(item)))
    .slice(0, limit);
}

export function appendBioStarter(bio: string, starter: string): string {
  const current = bio.trimEnd();
  return current ? `${current}\n${starter}` : starter;
}

export function formatSpecialty(value: string): string {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => (word.toLowerCase() === "ux" || word.toLowerCase() === "ui"
      ? word.toUpperCase()
      : `${word[0].toUpperCase()}${word.slice(1)}`))
    .join(" ");
}
