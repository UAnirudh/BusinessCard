export const MAX_CONNECTION_NOTES_LENGTH = 2000;

export function connectionNotesValue(draft: string): string | null {
  return draft.trim() || null;
}

export function connectionNotesIssue(draft: string): string | null {
  if ((connectionNotesValue(draft)?.length ?? 0) > MAX_CONNECTION_NOTES_LENGTH) {
    return `Keep notes to ${MAX_CONNECTION_NOTES_LENGTH.toLocaleString()} characters or fewer.`;
  }
  return null;
}
