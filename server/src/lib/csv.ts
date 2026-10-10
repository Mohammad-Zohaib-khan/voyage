/**
 * CSV helpers with spreadsheet formula-injection mitigation (OWASP CSV Injection).
 * Any cell beginning with =, +, -, @, tab or carriage return is prefixed with a single
 * quote so spreadsheet software treats it as text. Every cell is quoted and embedded
 * quotes are doubled.
 */

const DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (DANGEROUS_PREFIX.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>): string {
  // CRLF line endings per RFC 4180; a UTF-8 BOM helps spreadsheet apps detect encoding.
  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}\r\n`;
}

/** A conservative filename: letters, digits, dashes only. */
export function safeFilename(base: string, extension: string): string {
  const slug = base
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .slice(0, 60);
  return `${slug || 'voyage-trip'}.${extension}`;
}
