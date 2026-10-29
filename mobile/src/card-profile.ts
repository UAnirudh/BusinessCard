export type CardProfileDraft = {
  displayName: string;
  headline: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  location: string;
  bio: string;
};

export type CardProfilePatch = {
  displayName: string;
  headline: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  location: string | null;
  bio: string | null;
};

export function cardProfilePatch(draft: CardProfileDraft): CardProfilePatch {
  const optional = (value: string) => value.trim() || null;
  return {
    displayName: draft.displayName.trim(),
    headline: optional(draft.headline),
    company: optional(draft.company),
    email: optional(draft.email),
    phone: optional(draft.phone),
    website: optional(draft.website),
    location: optional(draft.location),
    bio: optional(draft.bio),
  };
}

export function cardProfileIssue(profile: CardProfilePatch): string | null {
  if (profile.displayName.length < 2) return "Add your name using at least 2 characters.";
  if (profile.displayName.length > 80) return "Your name must be 80 characters or fewer.";
  if (profile.headline && profile.headline.length > 120) return "Your role must be 120 characters or fewer.";
  if (profile.company && profile.company.length > 120) return "Your company must be 120 characters or fewer.";
  if (profile.bio && profile.bio.length > 500) return "Your introduction must be 500 characters or fewer.";
  if (profile.location && profile.location.length > 120) return "Your location must be 120 characters or fewer.";
  if (profile.email && (profile.email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))) {
    return "Enter a valid email address.";
  }
  if (profile.phone && profile.phone.length > 40) return "Your phone number must be 40 characters or fewer.";
  if (profile.website && profile.website.length > 300) return "Your website must be 300 characters or fewer.";
  return null;
}
