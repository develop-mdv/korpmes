import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SearchScope } from '@corp/shared-types';

interface SearchOptions {
  query: string;
  scope: SearchScope;
  orgId: string;
  chatId?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}

interface SearchResults {
  messages?: any[];
  users?: any[];
  files?: any[];
  tasks?: any[];
  total: number;
}

@Injectable()
export class SearchService {
  constructor(private readonly dataSource: DataSource) {}

  async search(options: SearchOptions): Promise<SearchResults> {
    const {
      query,
      scope,
      orgId,
      chatId,
      dateFrom,
      dateTo,
      cursor,
      limit = 20,
    } = options;

    const results: SearchResults = { total: 0 };

    if (scope === SearchScope.MESSAGES || scope === SearchScope.ALL) {
      results.messages = await this.searchMessages(
        query,
        orgId,
        chatId,
        dateFrom,
        dateTo,
        cursor,
        limit,
      );
      results.total += results.messages.length;
    }

    if (scope === SearchScope.USERS || scope === SearchScope.ALL) {
      results.users = await this.searchUsers(query, orgId, cursor, limit);
      results.total += results.users.length;
    }

    if (scope === SearchScope.FILES || scope === SearchScope.ALL) {
      results.files = await this.searchFiles(query, orgId, cursor, limit);
      results.total += results.files.length;
    }

    if (scope === SearchScope.TASKS || scope === SearchScope.ALL) {
      results.tasks = await this.searchTasks(query, orgId, cursor, limit);
      results.total += results.tasks.length;
    }

    return results;
  }

  private async searchMessages(
    query: string,
    orgId: string,
    chatId?: string,
    dateFrom?: string,
    dateTo?: string,
    cursor?: string,
    limit = 20,
  ): Promise<any[]> {
    let sql = `
      SELECT
        m.id,
        m.content,
        m.created_at AS "createdAt",
        m.sender_id AS "senderId",
        u.first_name AS "senderFirstName",
        u.last_name AS "senderLastName",
        c.id AS "chatId",
        c.name AS "chatName",
        ts_rank(m.search_vector, plainto_tsquery('english', $1)) AS rank
      FROM messages m
      INNER JOIN chats c ON c.id = m.chat_id
      INNER JOIN users u ON u.id = m.sender_id
      WHERE c.organization_id = $2
        AND m.search_vector @@ plainto_tsquery('english', $1)
    `;

    const params: any[] = [query, orgId];
    let paramIndex = 3;

    if (chatId) {
      sql += ` AND m.chat_id = $${paramIndex}`;
      params.push(chatId);
      paramIndex++;
    }

    if (dateFrom) {
      sql += ` AND m.created_at >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      sql += ` AND m.created_at <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    if (cursor) {
      sql += ` AND m.created_at < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    sql += ` ORDER BY rank DESC, m.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    return this.dataSource.query(sql, params);
  }

  private async searchUsers(
    query: string,
    orgId: string,
    cursor?: string,
    limit = 20,
  ): Promise<any[]> {
    const likeQuery = `%${query}%`;

    let sql = `
      SELECT
        u.id,
        u.first_name AS "firstName",
        u.last_name AS "lastName",
        u.email,
        u.avatar_url AS "avatarUrl"
      FROM users u
      INNER JOIN organization_members om ON om.user_id = u.id
      WHERE om.organization_id = $1
        AND (
          u.first_name ILIKE $2
          OR u.last_name ILIKE $2
          OR u.email ILIKE $2
        )
    `;

    const params: any[] = [orgId, likeQuery];
    let paramIndex = 3;

    if (cursor) {
      sql += ` AND u.created_at < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    sql += ` ORDER BY u.first_name ASC, u.last_name ASC LIMIT $${paramIndex}`;
    params.push(limit);

    return this.dataSource.query(sql, params);
  }

  private async searchFiles(
    query: string,
    orgId: string,
    cursor?: string,
    limit = 20,
  ): Promise<any[]> {
    const likeQuery = `%${query}%`;

    let sql = `
      SELECT
        f.id,
        f.original_name AS "originalName",
        f.mime_type AS "mimeType",
        f.size_bytes AS "sizeBytes",
        f.created_at AS "createdAt",
        f.uploader_id AS "uploaderId"
      FROM files f
      WHERE f.organization_id = $1
        AND f.original_name ILIKE $2
    `;

    const params: any[] = [orgId, likeQuery];
    let paramIndex = 3;

    if (cursor) {
      sql += ` AND f.created_at < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    sql += ` ORDER BY f.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    return this.dataSource.query(sql, params);
  }

  private async searchTasks(
    query: string,
    orgId: string,
    cursor?: string,
    limit = 20,
  ): Promise<any[]> {
    const likeQuery = `%${query}%`;

    let sql = `
      SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.created_at AS "createdAt",
        t.assigned_to AS "assignedTo",
        t.created_by AS "createdBy"
      FROM tasks t
      WHERE t.organization_id = $1
        AND (
          t.title ILIKE $2
          OR t.description ILIKE $2
        )
    `;

    const params: any[] = [orgId, likeQuery];
    let paramIndex = 3;

    if (cursor) {
      sql += ` AND t.created_at < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    sql += ` ORDER BY t.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    return this.dataSource.query(sql, params);
  }
}
