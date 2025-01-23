import { DataSource } from 'typeorm';
import 'reflect-metadata';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.NS_MARIADB_HOSTNAME,
  port: parseInt(process.env.NS_MARIADB_PORT || '3306'),
  username: process.env.NS_MARIADB_USER,
  password: process.env.NS_MARIADB_PASSWORD,
  database: process.env.NS_MARIADB_NAME,
  synchronize: true,
  logging: false,
  entities: ['src/entities/*.ts'],
  migrations: ['src/migrations/*.ts'],
  subscribers: [],
});
