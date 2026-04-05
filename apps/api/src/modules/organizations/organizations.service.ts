import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationMember } from './entities/organization-member.entity';
import { Invite } from './entities/invite.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly memberRepo: Repository<OrganizationMember>,
    @InjectRepository(Invite)
    private readonly inviteRepo: Repository<Invite>,
  ) {}

  async create(userId: string, dto: CreateOrganizationDto): Promise<Organization> {
    const org = this.organizationRepo.create({
      ...dto,
      createdBy: userId,
    });
    const savedOrg = await this.organizationRepo.save(org);

    const ownerMember = this.memberRepo.create({
      organizationId: savedOrg.id,
      userId,
      role: 'OWNER',
      joinedAt: new Date(),
    });
    await this.memberRepo.save(ownerMember);

    return savedOrg;
  }

  async findById(id: string): Promise<Organization> {
    const org = await this.organizationRepo.findOne({
      where: { id },
      relations: ['members', 'departments'],
    });
    if (!org) {
      throw new NotFoundException(`Organization with ID "${id}" not found`);
    }
    return org;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.organizationRepo.findOne({ where: { slug } });
  }

  async findUserOrganizations(userId: string): Promise<Organization[]> {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['organization'],
    });
    return memberships.map((m) => m.organization);
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<Organization> {
    await this.findById(id);
    await this.organizationRepo.update(id, dto);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.organizationRepo.softDelete(id);
  }

  async getSettings(id: string): Promise<Record<string, any>> {
    const org = await this.findById(id);
    return org.settings;
  }

  async search(query: string): Promise<(Organization & { memberCount: number })[]> {
    const qb = this.organizationRepo
      .createQueryBuilder('org')
      .loadRelationCountAndMap('org.memberCount', 'org.members')
      .where('org.deletedAt IS NULL')
      .limit(query ? 20 : 5);

    if (query) {
      qb.andWhere('org.name ILIKE :query', { query: `%${query}%` });
    }

    const orgs = await qb.getMany();

    // Sort by memberCount descending
    return (orgs as (Organization & { memberCount: number })[]).sort(
      (a, b) => (b.memberCount || 0) - (a.memberCount || 0),
    );
  }

  async requestJoin(orgId: string, userId: string): Promise<void> {
    await this.findById(orgId);

    const existing = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId },
    });
    if (existing) return;

    const member = this.memberRepo.create({
      organizationId: orgId,
      userId,
      role: 'MEMBER',
      joinedAt: new Date(),
    });
    await this.memberRepo.save(member);
  }
}
