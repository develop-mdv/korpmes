import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationMember } from './entities/organization-member.entity';
import { Department } from './entities/department.entity';
import { Invite } from './entities/invite.entity';
import { JoinRequest } from './entities/join-request.entity';
import { UsersModule } from '../users/users.module';
import { ChatsModule } from '../chats/chats.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsService } from './organizations.service';
import { MembersService } from './members.service';
import { DepartmentsService } from './departments.service';
import { JoinRequestsService } from './join-requests.service';
import { OrganizationsController } from './organizations.controller';
import { MembersController } from './members.controller';
import { DepartmentsController } from './departments.controller';
import { JoinRequestsController } from './join-requests.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationMember,
      Department,
      Invite,
      JoinRequest,
    ]),
    UsersModule,
    forwardRef(() => ChatsModule),
    NotificationsModule,
  ],
  controllers: [
    OrganizationsController,
    MembersController,
    DepartmentsController,
    JoinRequestsController,
  ],
  providers: [
    OrganizationsService,
    MembersService,
    DepartmentsService,
    JoinRequestsService,
  ],
  exports: [OrganizationsService, MembersService],
})
export class OrganizationsModule {}
