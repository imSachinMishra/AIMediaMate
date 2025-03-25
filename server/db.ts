import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Create a database client
const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client);