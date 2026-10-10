/** Up to two initials for an avatar, e.g. "Priya Nair" → "PN". */
export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'V'
  );
}
