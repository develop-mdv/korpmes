import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from monorepo root
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '..', '.env') });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'staffhub',
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  entities: [path.join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
});
