import { Module, Global } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { RbacService } from './rbac.service';
import { RbacGuard } from './rbac.guard';

@Global()
@Module({
  imports: [OrganizationsModule],
  providers: [RbacService, RbacGuard],
  exports: [RbacService],
})
export class RbacModule {}
