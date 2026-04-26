import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJoinRequestsAndInviteLinks1750000000001 implements MigrationInterface {
  name = 'AddJoinRequestsAndInviteLinks1750000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // organization_join_requests
    await queryRunner.query(`
      CREATE TABLE organization_join_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        message TEXT,
        responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        responded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Only one active PENDING request per (org,user)
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_join_requests_unique_pending
        ON organization_join_requests(organization_id, user_id)
        WHERE status = 'PENDING'
    `);

    await queryRunner.query(`
      CREATE INDEX idx_join_requests_org_status
        ON organization_join_requests(organization_id, status)
    `);

    // Extend invites table for LINK type
    await queryRunner.query(`
      ALTER TABLE invites ADD COLUMN type VARCHAR(10) NOT NULL DEFAULT 'EMAIL'
    `);
    await queryRunner.query(`
      ALTER TABLE invites ALTER COLUMN expires_at DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE invites ADD COLUMN revoked_at TIMESTAMP
    `);

    // Only one active LINK per organization
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_invites_active_link_per_org
        ON invites(organization_id)
        WHERE type = 'LINK' AND revoked_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invites_active_link_per_org`);
    await queryRunner.query(`ALTER TABLE invites DROP COLUMN IF EXISTS revoked_at`);
    await queryRunner.query(`ALTER TABLE invites ALTER COLUMN expires_at SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE invites DROP COLUMN IF EXISTS type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_join_requests_org_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_join_requests_unique_pending`);
    await queryRunner.query(`DROP TABLE IF EXISTS organization_join_requests`);
  }
}
