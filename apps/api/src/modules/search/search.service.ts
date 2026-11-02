import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SearchScope } from '@corp/shared-types';
import { WorkspaceAccessService } from '../../common/workspace/workspace-access.service';
import { UsersService } from '../users/users.service';

interface SearchOptions {
  userId: string;
  query: string;
  scope: SearchScope;
  orgId?: string;
  chatId?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly usersService: UsersService,
  ) {}

  async search(options: SearchOptions) {
    const { userId, orgId, scope, chatId, dateFrom, dateTo, cursor } = options;
    const query = options.query.trim();
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    if (orgId) await this.workspaceAccess.assertOrganizationMember(orgId, userId);
    if (chatId) await this.workspaceAccess.assertChatMember(chatId, userId);
    const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
    const params = [userId, orgId ?? null, pattern, limit, cursor ?? null, dateFrom ?? null, dateTo ?? null, chatId ?? null];
    const messages = scope === SearchScope.MESSAGES || scope === SearchScope.ALL
      ? await this.dataSource.query(`
        SELECT m.id, m.content, m.created_at AS "createdAt", c.id AS "chatId", c.name AS "chatName",
          u.first_name AS "senderFirstName", u.last_name AS "senderLastName"
        FROM messages m JOIN chats c ON c.id = m.chat_id JOIN users u ON u.id = m.sender_id
        JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = $1 AND cm.left_at IS NULL
        WHERE c.organization_id IS NOT DISTINCT FROM $2::uuid AND c.deleted_at IS NULL AND m.deleted_at IS NULL
          AND m.content ILIKE $3 AND ($5::timestamp IS NULL OR m.created_at < $5::timestamp)
          AND ($6::timestamp IS NULL OR m.created_at >= $6::timestamp)
          AND ($7::timestamp IS NULL OR m.created_at <= $7::timestamp)
          AND ($8::uuid IS NULL OR c.id = $8::uuid)
        ORDER BY m.created_at DESC LIMIT $4`, params)
      : [];
    const users = scope === SearchScope.USERS || scope === SearchScope.ALL
      ? await this.usersService.search(query, orgId, userId) : [];
    const files = scope === SearchScope.FILES || scope === SearchScope.ALL
      ? await this.dataSource.query(`
        SELECT f.id, f.original_name AS "originalName", f.created_at AS "createdAt", f.mime_type AS "mimeType"
        FROM files f WHERE f.organization_id IS NOT DISTINCT FROM $2::uuid AND f.original_name ILIKE $3
          AND ((f.message_id IS NULL AND (f.uploader_id = $1 OR f.task_id IS NOT NULL)) OR EXISTS (
            SELECT 1 FROM messages m JOIN chats c ON c.id = m.chat_id
            JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = $1 AND cm.left_at IS NULL
            WHERE m.id = f.message_id AND m.deleted_at IS NULL AND c.deleted_at IS NULL))
          AND ($5::timestamp IS NULL OR f.created_at < $5::timestamp)
        ORDER BY f.created_at DESC LIMIT $4`, params.slice(0, 5))
      : [];
    const tasks = orgId && (scope === SearchScope.TASKS || scope === SearchScope.ALL)
      ? await this.dataSource.query(`
        SELECT t.id, t.title, t.description, t.created_at AS "createdAt" FROM tasks t
        WHERE t.organization_id = $2::uuid AND (t.title ILIKE $3 OR t.description ILIKE $3)
          AND ($5::timestamp IS NULL OR t.created_at < $5::timestamp)
          AND $1::uuid IS NOT NULL ORDER BY t.created_at DESC LIMIT $4`, params.slice(0, 5))
      : [];
    const results = [
      ...users.map((u: any) => ({ type: 'member', id: u.id, title: `${u.firstName} ${u.lastName}`, snippet: `@${u.username}`, metadata: { username: u.username }, createdAt: u.createdAt ?? new Date().toISOString() })),
      ...messages.map((m: any) => ({ type: 'message', id: m.id, title: m.chatName || `${m.senderFirstName} ${m.senderLastName}`, snippet: m.content, metadata: { chatId: m.chatId }, createdAt: m.createdAt })),
      ...files.map((f: any) => ({ type: 'file', id: f.id, title: f.originalName, snippet: f.mimeType, metadata: {}, createdAt: f.createdAt })),
      ...tasks.map((t: any) => ({ type: 'task', id: t.id, title: t.title, snippet: t.description, metadata: {}, createdAt: t.createdAt })),
    ];
    return { results, messages, users, files, tasks, total: results.length, hasMore: false };
  }
}
