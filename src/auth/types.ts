export type PlatformRole = "SUPER_ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";
export type TenantStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";
export type TenantRole = "CLINIC_OWNER" | "CLINIC_ADMIN" | "RECEPTIONIST";
export type MembershipStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";
export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
}
export interface TenantMembership {
  role: TenantRole;
  status: MembershipStatus;
  tenant: TenantSummary;
}
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  platformRole: PlatformRole | null;
  status: UserStatus;
  tenantMemberships?: TenantMembership[];
}
export const hasPlatformRole = (
  user: AuthUser | null,
  ...roles: PlatformRole[]
) => Boolean(user?.platformRole && roles.includes(user.platformRole));
export const platformRoleLabel = (role: PlatformRole | null) =>
  role === "SUPER_ADMIN" ? "Super Admin" : "User";
export const tenantRoleLabel = (role: TenantRole) =>
  ({
    CLINIC_OWNER: "Clinic Owner",
    CLINIC_ADMIN: "Clinic Admin",
    RECEPTIONIST: "Receptionist",
  })[role];
