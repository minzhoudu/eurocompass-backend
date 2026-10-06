import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'src/user/user-role';

export const ROLES_KEY = 'roles';

// Limits a route (or controller) to these roles. Use together with AuthGuard,
// listed first: @UseGuards(AuthGuard, RolesGuard).
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
