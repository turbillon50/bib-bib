// Jerarquía de invitaciones por rol — Bib-Bib
// Cada quien invita su nivel o más abajo, NUNCA hacia arriba.
//
//   owner (admin nivel 1 / dueño = Luis)  -> admin, driver, passenger
//   admin (administrador)                 -> driver, passenger
//   driver (chofer)                       -> passenger
//   passenger (usuario)                   -> passenger

export type AppRole = 'owner' | 'admin' | 'driver' | 'passenger';

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: 'Dueño',
  admin: 'Administrador',
  driver: 'Chofer',
  passenger: 'Usuario',
};

export const ROLE_DASHBOARD: Record<AppRole, string> = {
  owner: '/admin',
  admin: '/admin',
  driver: '/driver',
  passenger: '/app',
};

// Roles que cada nivel puede invitar (de su nivel hacia abajo).
export const INVITABLE_ROLES: Record<AppRole, AppRole[]> = {
  owner: ['admin', 'driver', 'passenger'],
  admin: ['driver', 'passenger'],
  driver: ['passenger'],
  passenger: ['passenger'],
};

export function canInvite(inviter: AppRole, target: string): target is AppRole {
  return (INVITABLE_ROLES[inviter] ?? []).includes(target as AppRole);
}

export function allowedRolesFor(inviter: AppRole): AppRole[] {
  return INVITABLE_ROLES[inviter] ?? [];
}
