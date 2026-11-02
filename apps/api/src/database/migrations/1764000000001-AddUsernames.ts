import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsernames1764000000001 implements MigrationInterface {
  name = 'AddUsernames1764000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE users ADD COLUMN username varchar(32)');
    // Encoding the whole UUID in base 36 is injective and fits in 30 characters
    // including the prefix. No truncation collisions or email disclosure.
    const users: { id: string }[] = await queryRunner.query('SELECT id FROM users');
    for (let start = 0; start < users.length; start += 500) {
      const batch = users.slice(start, start + 500);
      const params = batch.flatMap(({ id }) => [id, `user_${BigInt(`0x${id.replace(/-/g, '')}`).toString(36)}`]);
      const rows = batch.map((_, index) => `($${index * 2 + 1}::uuid, $${index * 2 + 2}::varchar)`).join(',');
      await queryRunner.query(`UPDATE users u SET username = v.username FROM (VALUES ${rows}) AS v(id, username) WHERE u.id = v.id`, params);
    }
    await queryRunner.query('ALTER TABLE users ALTER COLUMN username SET NOT NULL');
    await queryRunner.query("ALTER TABLE users ADD CONSTRAINT chk_users_username CHECK (username ~ '^[a-z][a-z0-9_]{2,31}$')");
    await queryRunner.query('CREATE UNIQUE INDEX uq_users_username ON users (LOWER(username))');
    await queryRunner.query('CREATE INDEX idx_users_username_prefix ON users (username varchar_pattern_ops)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX idx_users_username_prefix');
    await queryRunner.query('DROP INDEX uq_users_username');
    await queryRunner.query('ALTER TABLE users DROP CONSTRAINT chk_users_username');
    await queryRunner.query('ALTER TABLE users DROP COLUMN username');
  }
}
