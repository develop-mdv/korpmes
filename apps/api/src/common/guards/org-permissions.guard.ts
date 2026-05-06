import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DEFAULT_ROLE_PERMISSIONS } from '@corp/shared-constants';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { MembersService } from '../../modules/organizations/members.service';

@Injectable()
export class OrgPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly membersService: MembersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user?.id) throw new ForbiddenException('Unauthorized');

    const orgId =
      req.query?.orgId ??
      req.params?.orgId ??
      req.body?.orgId ??
      req.params?.id;
    if (!orgId) throw new BadRequestException('orgId is required');

    const role = await this.membersService.getUserRole(orgId, user.id);
    if (!role) throw new ForbiddenException('Not a member of this organization');

    req.orgRole = role;

    const granted =
      DEFAULT_ROLE_PERMISSIONS[role as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
    const ok = required.every((p) => (granted as string[]).includes(p));
    if (!ok) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
