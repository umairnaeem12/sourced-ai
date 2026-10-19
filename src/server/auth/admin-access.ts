// Spec 005 amendment B31: the owner can open the whole dashboard to demo visitors.
// No imports, so the edge middleware can use it too.
export function isAdminPublic(env: Record<string, string | undefined> = process.env): boolean {
  const value = env.ADMIN_PUBLIC?.trim().toLowerCase();
  return value === "true" || value === "1";
}
