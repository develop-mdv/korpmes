import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonalWorkspaces1763000000001 implements MigrationInterface {
  name = 'AddPersonalWorkspaces1763000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Existing organization IDs are preserved. NULL explicitly means personal.
    await queryRunner.query('ALTER TABLE chats ALTER COLUMN organization_id DROP NOT NULL');
    await queryRunner.query('ALTER TABLE files ALTER COLUMN organization_id DROP NOT NULL');
    await queryRunner.query('CREATE INDEX idx_chats_personal ON chats (last_message_at DESC) WHERE organization_id IS NULL AND deleted_at IS NULL');
    await queryRunner.query('CREATE INDEX idx_files_personal ON files (uploader_id, created_at DESC) WHERE organization_id IS NULL');
    await queryRunner.query("ALTER TABLE chats ADD CONSTRAINT chk_personal_chat_type CHECK (organization_id IS NOT NULL OR type IN ('PERSONAL', 'GROUP'))");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Refuse a destructive rollback when personal data has already been created.
    const [row] = await queryRunner.query('SELECT EXISTS (SELECT 1 FROM chats WHERE organization_id IS NULL) OR EXISTS (SELECT 1 FROM files WHERE organization_id IS NULL) AS occupied');
    if (row.occupied) throw new Error('Cannot remove personal workspaces while personal chats or files exist');
    await queryRunner.query('ALTER TABLE chats DROP CONSTRAINT chk_personal_chat_type');
    await queryRunner.query('DROP INDEX idx_files_personal');
    await queryRunner.query('DROP INDEX idx_chats_personal');
    await queryRunner.query('ALTER TABLE files ALTER COLUMN organization_id SET NOT NULL');
    await queryRunner.query('ALTER TABLE chats ALTER COLUMN organization_id SET NOT NULL');
  }
}
