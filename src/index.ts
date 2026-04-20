import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export const enVars = {
   REDIS_HOST: process.env.REDIS_HOST,
   REDIS_PORT: process.env.REDIS_PORT,
   REDIS_PASSWORD: process.env.REDIS_PASSWORD
}