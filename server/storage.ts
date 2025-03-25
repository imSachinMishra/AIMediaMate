import { users, favorites, type User, type InsertUser, type Favorite, type InsertFavorite } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getFavorites(userId: number): Promise<Favorite[]>;
  getFavorite(userId: number, tmdbId: number): Promise<Favorite | undefined>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, tmdbId: number): Promise<void>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getFavorites(userId: number): Promise<Favorite[]> {
    return await db.select().from(favorites).where(eq(favorites.userId, userId));
  }

  async getFavorite(userId: number, tmdbId: number): Promise<Favorite | undefined> {
    const [favorite] = await db.select().from(favorites).where(
      and(
        eq(favorites.userId, userId),
        eq(favorites.tmdbId, tmdbId)
      )
    );
    return favorite;
  }

  async addFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    const [favorite] = await db.insert(favorites).values(insertFavorite).returning();
    return favorite;
  }

  async removeFavorite(userId: number, tmdbId: number): Promise<void> {
    await db.delete(favorites).where(
      and(
        eq(favorites.userId, userId),
        eq(favorites.tmdbId, tmdbId)
      )
    );
  }
}

export const storage = new DatabaseStorage();
