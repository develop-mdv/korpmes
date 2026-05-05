import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditAndTaskChecklist1760000000001 implements MigrationInterface {
  name = 'AddAuditAndTaskChecklist1760000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        user_email VARCHAR(255),
        organization_id UUID,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(100),
        metadata JSONB,
        ip_address VARCHAR(64),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_org_created
        ON audit_logs(organization_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_user
        ON audit_logs(user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_action
        ON audit_logs(action)
    `);

    await queryRunner.query(`
      CREATE TABLE task_checklist_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        is_done BOOLEAN NOT NULL DEFAULT false,
        position INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_task_checklist_task
        ON task_checklist_items(task_id, position)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_files_task_id
        ON files(task_id)
        WHERE task_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_files_task_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_task_checklist_task`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_checklist_items`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_logs_action`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_logs_user`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_logs_org_created`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
  }
}
