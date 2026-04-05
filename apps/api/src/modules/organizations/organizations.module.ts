import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationMember } from './entities/organization-member.entity';
import { Department } from './entities/department.entity';
import { Invite } from './entities/invite.entity';
import { UsersModule } from '../users/users.module';
import { OrganizationsService } from './organizations.service';
import { MembersService } from './members.service';
import { DepartmentsService } from './departments.service';
import { OrganizationsController } from './organizations.controller';
import { MembersController } from './members.controller';
import { DepartmentsController } from './departments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, OrganizationMember, Department, Invite]),
    UsersModule,
  ],
  controllers: [OrganizationsController, MembersController, DepartmentsController],
  providers: [OrganizationsService, MembersService, DepartmentsService],
  exports: [OrganizationsService, MembersService],
})
export class OrganizationsModule {}
