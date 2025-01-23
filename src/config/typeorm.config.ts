import { DataSource } from 'typeorm';
import 'reflect-metadata';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.NS_MARIADB_HOSTNAME || '127.0.0.1',
  port: parseInt(process.env.NS_MARIADB_PORT || '3006'),
  username: process.env.NS_MARIADB_USER || 'root',
  password: process.env.NS_MARIADB_PASSWORD || 'password',
  database: process.env.NS_MARIADB_DATABASE || 'discord',
  synchronize: false,
  logging: false,
  entities: ["dist/**/*.entity.js"],
  migrations: ['src/migrations/*.ts'],
  subscribers: [],
});
