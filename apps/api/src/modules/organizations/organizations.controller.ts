import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AUDIT_ACTIONS } from '@corp/shared-constants';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';
import { AuditService } from '../audit/audit.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  async create(@CurrentUser() user: any, @Body() dto: CreateOrganizationDto) {
    const org = await this.organizationsService.create(user.id, dto);
    this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      organizationId: org.id,
      action: AUDIT_ACTIONS.ORG_CREATE,
      entityType: 'organization',
      entityId: org.id,
      metadata: { name: org.name, slug: org.slug },
    });
    return org;
  }

  @Get()
  @ApiOperation({ summary: "List current user's organizations" })
  findAll(@CurrentUser() user: any) {
    return this.organizationsService.findUserOrganizations(user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search organizations by name. Empty query returns top 5 by member count.' })
  search(@Query('q') query?: string) {
    return this.organizationsService.search(query?.trim() || '');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization' })
  async update(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    const updated = await this.organizationsService.update(id, dto);
    this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      organizationId: id,
      action: AUDIT_ACTIONS.ORG_UPDATE,
      entityType: 'organization',
      entityId: id,
      metadata: { changes: dto as Record<string, unknown> },
    });
    return updated;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete organization' })
  async remove(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    await this.organizationsService.remove(id);
    this.auditService.log({
      userId: user.id,
      userEmail: user.email,
      organizationId: id,
      action: AUDIT_ACTIONS.ORG_DELETE,
      entityType: 'organization',
      entityId: id,
    });
  }
}
