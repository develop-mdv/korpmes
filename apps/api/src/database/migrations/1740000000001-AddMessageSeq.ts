import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageSeq1740000000001 implements MigrationInterface {
  name = 'AddMessageSeq1740000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE messages ADD COLUMN seq BIGINT`);
    await queryRunner.query(`
      UPDATE messages SET seq = sub.rn FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn FROM messages
      ) sub WHERE messages.id = sub.id
    `);
    await queryRunner.query(`ALTER TABLE messages ALTER COLUMN seq SET NOT NULL`);
    await queryRunner.query(`CREATE SEQUENCE messages_seq_seq OWNED BY messages.seq`);
    await queryRunner.query(`
      SELECT setval('messages_seq_seq', COALESCE((SELECT MAX(seq) FROM messages), 0) + 1, false)
    `);
    await queryRunner.query(`
      ALTER TABLE messages ALTER COLUMN seq SET DEFAULT nextval('messages_seq_seq')
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX idx_messages_seq ON messages(seq)`);
    await queryRunner.query(`CREATE INDEX idx_messages_chat_seq ON messages(chat_id, seq)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_messages_chat_seq`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_messages_seq`);
    await queryRunner.query(`ALTER TABLE messages ALTER COLUMN seq DROP DEFAULT`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS messages_seq_seq`);
    await queryRunner.query(`ALTER TABLE messages DROP COLUMN seq`);
  }
}
