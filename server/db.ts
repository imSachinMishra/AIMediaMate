import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Use connection pooling by modifying the URL
const databaseUrl = process.env.DATABASE_URL.replace('.us-east-2', '-pooler.us-east-2');

// Configure the client with pool settings
const client = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

export const db = drizzle(client);