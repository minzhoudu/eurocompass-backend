// What an entry is about. The admin list filters on this.
export const AUDIT_ENTITY_TYPES = [
  'auth',
  'user',
  'reservation',
  'notice',
  'blocked_date',
  'information',
  'audit',
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

// Who did it. `email` is null for automatic jobs.
export type Actor = {
  email: string | null;
  name: string | null;
  ip: string | null;
};

export const SYSTEM_ACTOR: Actor = { email: null, name: null, ip: null };

export type AuditEntry = {
  action: string;
  entityType: AuditEntityType;
  entityId?: number | string | null;
  summary: string;
  details?: Record<string, unknown> | null;
};
