export interface ParsedDeckClipboard {
  code: string;
  name?: string;
  className?: string;
  format?: string;
  isAnnotated: boolean;
}

/**
 * Hearthstone and HSReplay copy a human-readable deck list around one
 * base64 deck-string line. Keep parsing deliberately conservative: the
 * backend remains the authority that validates and decodes the code.
 */
export function parseDeckClipboard(text: string): ParsedDeckClipboard | null {
  const codeMatch = text.match(/^\s*([A-Za-z0-9+/]{20,}={0,2})\s*$/m);
  if (!codeMatch) return null;

  const value = (pattern: RegExp) => text.match(pattern)?.[1]?.trim() || undefined;
  const name = value(/^###\s+(.+?)\s*$/m);
  const className = value(/^#\s*Class\s*:\s*(.+?)\s*$/mi);
  const format = value(/^#\s*Format\s*:\s*(.+?)\s*$/mi);

  return {
    code: codeMatch[1],
    name,
    className,
    format,
    isAnnotated: Boolean(name || className || format),
  };
}
