import {Pool} from 'pg';
import {attachDatabasePool} from '@vercel/functions';
const g=globalThis as unknown as {pool?:Pool};
export const pool=g.pool??new Pool({connectionString:process.env.DATABASE_URL,max:5,idleTimeoutMillis:10000,connectionTimeoutMillis:12000});
if(!g.pool){attachDatabasePool(pool);g.pool=pool;}
