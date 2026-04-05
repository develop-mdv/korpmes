import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710000000001 implements MigrationInterface {
  name = 'InitialSchema1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // users
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        avatar_url VARCHAR(500),
        status VARCHAR(20) DEFAULT 'OFFLINE',
        custom_status_text VARCHAR(100),
        position VARCHAR(100),
        is_email_verified BOOLEAN DEFAULT FALSE,
        is_phone_verified BOOLEAN DEFAULT FALSE,
        two_factor_secret VARCHAR(255),
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        last_seen_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);

    // organizations
    await queryRunner.query(`
      CREATE TABLE organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(50) UNIQUE NOT NULL,
        description VARCHAR(500),
        logo_url VARCHAR(500),
        settings JSONB DEFAULT '{}',
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);

    // departments
    await queryRunner.query(`
      CREATE TABLE departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(500),
        parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // organization_members
    await queryRunner.query(`
      CREATE TABLE organization_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE',
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        invited_by UUID REFERENCES users(id),
        joined_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(organization_id, user_id)
      )
    `);

    // invites
    await queryRunner.query(`
      CREATE TABLE invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email VARCHAR(255),
        phone VARCHAR(20),
        role VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE',
        token VARCHAR(255) UNIQUE NOT NULL,
        invited_by UUID NOT NULL REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'PENDING',
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // chats
    await queryRunner.query(`
      CREATE TABLE chats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        name VARCHAR(100),
        description VARCHAR(500),
        avatar_url VARCHAR(500),
        is_private BOOLEAN DEFAULT TRUE,
        created_by UUID NOT NULL REFERENCES users(id),
        settings JSONB DEFAULT '{"allowThreads":true,"allowReactions":true,"allowFileUpload":true,"readOnly":false}',
        last_message_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);

    // chat_members
    await queryRunner.query(`
      CREATE TABLE chat_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) DEFAULT 'MEMBER',
        muted_until TIMESTAMP,
        last_read_message_id UUID,
        joined_at TIMESTAMP DEFAULT NOW(),
        left_at TIMESTAMP,
        UNIQUE(chat_id, user_id)
      )
    `);

    // messages
    await queryRunner.query(`
      CREATE TABLE messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id),
        type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
        content TEXT,
        parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
        is_edited BOOLEAN DEFAULT FALSE,
        edited_at TIMESTAMP,
        is_pinned BOOLEAN DEFAULT FALSE,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_messages_sender ON messages(sender_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_messages_parent ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL
    `);

    // message_statuses
    await queryRunner.query(`
      CREATE TABLE message_statuses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(message_id, user_id)
      )
    `);

    // reactions
    await queryRunner.query(`
      CREATE TABLE reactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(message_id, user_id, emoji)
      )
    `);

    // files
    await queryRunner.query(`
      CREATE TABLE files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        uploader_id UUID NOT NULL REFERENCES users(id),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
        task_id UUID,
        original_name VARCHAR(255) NOT NULL,
        storage_key VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size_bytes BIGINT NOT NULL,
        width INT,
        height INT,
        thumbnail_key VARCHAR(500),
        checksum VARCHAR(64),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // calls
    await queryRunner.query(`
      CREATE TABLE calls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        initiated_by UUID NOT NULL REFERENCES users(id),
        type VARCHAR(10) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'RINGING',
        started_at TIMESTAMP,
        ended_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // call_participants
    await queryRunner.query(`
      CREATE TABLE call_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT NOW(),
        left_at TIMESTAMP,
        is_muted BOOLEAN DEFAULT FALSE,
        is_video_off BOOLEAN DEFAULT FALSE,
        UNIQUE(call_id, user_id)
      )
    `);

    // tasks
    await queryRunner.query(`
      CREATE TABLE tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
        message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'NEW',
        priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        created_by UUID NOT NULL REFERENCES users(id),
        assigned_to UUID REFERENCES users(id),
        due_date TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_tasks_org ON tasks(organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_tasks_assigned ON tasks(assigned_to) WHERE assigned_to IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_tasks_status ON tasks(status)
    `);

    // task_watchers
    await queryRunner.query(`
      CREATE TABLE task_watchers (
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY(task_id, user_id)
      )
    `);

    // task_comments
    await queryRunner.query(`
      CREATE TABLE task_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // notifications
    await queryRunner.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(30) NOT NULL,
        title VARCHAR(200) NOT NULL,
        body TEXT,
        data JSONB DEFAULT '{}',
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE
    `);

    // push_tokens
    await queryRunner.query(`
      CREATE TABLE push_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) NOT NULL,
        platform VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, token)
      )
    `);

    // refresh_tokens
    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        device_info VARCHAR(500),
        ip_address VARCHAR(45),
        expires_at TIMESTAMP NOT NULL,
        revoked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash)
    `);

    // Full-text search for messages
    await queryRunner.query(`
      ALTER TABLE messages ADD COLUMN search_vector tsvector
    `);

    await queryRunner.query(`
      CREATE INDEX idx_messages_search ON messages USING GIN(search_vector)
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION messages_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector := to_tsvector('russian', COALESCE(NEW.content, ''));
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER messages_search_vector_trigger
        BEFORE INSERT OR UPDATE OF content ON messages
        FOR EACH ROW EXECUTE FUNCTION messages_search_vector_update()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS messages_search_vector_trigger ON messages`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS messages_search_vector_update`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS push_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_comments`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_watchers`);
    await queryRunner.query(`DROP TABLE IF EXISTS tasks`);
    await queryRunner.query(`DROP TABLE IF EXISTS call_participants`);
    await queryRunner.query(`DROP TABLE IF EXISTS calls`);
    await queryRunner.query(`DROP TABLE IF EXISTS files`);
    await queryRunner.query(`DROP TABLE IF EXISTS reactions`);
    await queryRunner.query(`DROP TABLE IF EXISTS message_statuses`);
    await queryRunner.query(`DROP TABLE IF EXISTS messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS chat_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS chats`);
    await queryRunner.query(`DROP TABLE IF EXISTS invites`);
    await queryRunner.query(`DROP TABLE IF EXISTS organization_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS departments`);
    await queryRunner.query(`DROP TABLE IF EXISTS organizations`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}
