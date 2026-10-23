import 'dotenv/config';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import pool from './config/db.js';

const sql = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../schema.sql'), 'utf8');
await pool.query(sql);
console.log('Database schema applied.');
await pool.end();
