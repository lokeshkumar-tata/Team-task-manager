/**
 * Express 5 types route params as `string | string[]`. Collapse to a single string for Prisma / IDs.
 */
export function routeParam(value: string | string[] | undefined): string {
  if (value === undefined) return "";
  return Array.isArray(value) ? String(value[0] ?? "") : value;
}
