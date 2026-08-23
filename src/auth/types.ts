export type PlatformRole = "SUPER_ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";
export interface AuthUser { id: string; email: string; firstName: string; lastName: string; platformRole: PlatformRole | null; status: UserStatus; }
export const hasPlatformRole = (user: AuthUser | null, ...roles: PlatformRole[]) => Boolean(user?.platformRole && roles.includes(user.platformRole));
export const platformRoleLabel = (role: PlatformRole | null) => role === "SUPER_ADMIN" ? "Super Admin" : "User";
