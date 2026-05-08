import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFileDuration1761000000001 implements MigrationInterface {
  name = 'AddFileDuration1761000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE files
        ADD COLUMN IF NOT EXISTS duration_ms INT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE files DROP COLUMN IF EXISTS duration_ms
    `);
  }
}
