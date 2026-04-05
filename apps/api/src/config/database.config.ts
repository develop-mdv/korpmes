import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'staffhub',
  autoLoadEntities: true,
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  extra: {
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
  cache: {
    duration: 5000, // 5s query cache for repeated lookups
  },
}));
