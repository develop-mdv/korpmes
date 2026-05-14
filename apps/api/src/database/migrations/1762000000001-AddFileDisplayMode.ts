import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFileDisplayMode1762000000001 implements MigrationInterface {
  name = 'AddFileDisplayMode1762000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE files
        ADD COLUMN IF NOT EXISTS display_mode VARCHAR(16) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE files DROP COLUMN IF EXISTS display_mode
    `);
  }
}
