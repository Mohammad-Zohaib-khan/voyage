/** Only allow same-site relative return paths, never absolute or protocol-relative URLs. */
export function safeNextPath(value: string | null, fallback = '/app'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}
