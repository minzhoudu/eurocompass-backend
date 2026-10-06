export const USER_ROLES = ['owner', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Vlasnik',
  admin: 'Administrator',
};
