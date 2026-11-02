import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In, IsNull } from 'typeorm';
import { OrganizationMember } from '../../modules/organizations/entities/organization-member.entity';
import { ChatMember } from '../../modules/chats/entities/chat-member.entity';
import { User } from '../../modules/users/entities/user.entity';

@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly dataSource: DataSource) {}

  async assertOrganizationMember(organizationId: string, userId: string): Promise<void> {
    const member = await this.dataSource.getRepository(OrganizationMember).findOne({ where: { organizationId, userId }, relations: ['organization'] });
    if (!member?.organization || member.organization.deletedAt) throw new ForbiddenException('You are not a member of this organization');
  }

  async assertParticipants(userIds: string[], organizationId: string | null): Promise<void> {
    const ids = [...new Set(userIds)];
    const count = await this.dataSource.getRepository(User).countBy({ id: In(ids) });
    if (count !== ids.length) throw new NotFoundException('One or more users do not exist');
    if (organizationId) {
      const members = await this.dataSource.getRepository(OrganizationMember).countBy({ organizationId, userId: In(ids) });
      if (members !== ids.length) throw new BadRequestException('All chat participants must belong to the organization');
    }
  }

  async assertChatMember(chatId: string, userId: string): Promise<void> {
    const member = await this.dataSource.getRepository(ChatMember).findOne({
      where: { chatId, userId, leftAt: IsNull() },
      relations: ['chat'],
    });
    if (!member?.chat || member.chat.deletedAt) throw new ForbiddenException('You are not a member of this chat');
    if (member.chat.organizationId) await this.assertOrganizationMember(member.chat.organizationId, userId);
  }
}
