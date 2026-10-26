/** Minimal RFC-4180-ish CSV parser: quotes, escaped quotes, commas and newlines. */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const text = input.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field.trim());
      field = "";
    } else if (char === "\n") {
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

export function escapeCsv(value: unknown): string {
  const rawText = value === null || value === undefined ? "" : String(value);
  // CSV quoting alone does not stop spreadsheet software from evaluating a
  // cell as a formula. Prefix formula-like text with an apostrophe so exported
  // names, notes, tags, and other user-provided values stay inert when opened.
  const text = /^[\p{White_Space}\u0000-\u001F]*[=+\-@]/u.test(rawText)
    ? `'${rawText}`
    : rawText;
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) lines.push(row.map(escapeCsv).join(","));
  return `${lines.join("\n")}\n`;
}
