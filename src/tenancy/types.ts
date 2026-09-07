import {
  MembershipStatus,
  TenantRole,
  TenantStatus,
  UserStatus,
} from "@/auth/types";
export interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
  provisioning?: TenantProvisioningSummary | null;
}
export interface TenantProvisioningSummary {
  baselineComplete: boolean;
  createdWebVoiceChannel: boolean;
  webVoiceChannelId: string;
  webVoiceChannelStatus: "ACTIVE" | "INACTIVE";
  readiness: {
    state:
      | "CLINIC_SETUP_INCOMPLETE"
      | "VOICE_CONFIGURATION_INCOMPLETE"
      | "READY_TO_ACTIVATE"
      | "ACTIVE";
    required: Array<{ key: string; complete: boolean; label: string }>;
    recommended: Array<{ key: string; complete: boolean; label: string }>;
  };
}
export interface PaginatedTenants {
  data: PlatformTenant[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
}
export interface PlatformMembership {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantRole;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
  user: SafeUser;
}
