/** Tiny classname joiner (no clsx dependency — dependency-lean). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
