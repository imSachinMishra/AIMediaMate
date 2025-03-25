import { users, favorites, type User, type InsertUser, type Favorite, type InsertFavorite } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getFavorites(userId: number): Promise<Favorite[]>;
  getFavorite(userId: number, tmdbId: number): Promise<Favorite | undefined>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, tmdbId: number): Promise<void>;
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private favorites: Map<number, Favorite>;
  sessionStore: session.SessionStore;
  currentUserId: number;
  currentFavoriteId: number;

  constructor() {
    this.users = new Map();
    this.favorites = new Map();
    this.currentUserId = 1;
    this.currentFavoriteId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }

  async getFavorites(userId: number): Promise<Favorite[]> {
    return Array.from(this.favorites.values()).filter(
      (favorite) => favorite.userId === userId,
    );
  }

  async getFavorite(userId: number, tmdbId: number): Promise<Favorite | undefined> {
    return Array.from(this.favorites.values()).find(
      (favorite) => favorite.userId === userId && favorite.tmdbId === tmdbId,
    );
  }

  async addFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    const id = this.currentFavoriteId++;
    const now = new Date();
    const favorite: Favorite = {
      ...insertFavorite,
      id,
      createdAt: now
    };
    this.favorites.set(id, favorite);
    return favorite;
  }

  async removeFavorite(userId: number, tmdbId: number): Promise<void> {
    const favorite = await this.getFavorite(userId, tmdbId);
    if (favorite) {
      this.favorites.delete(favorite.id);
    }
  }
}

export const storage = new MemStorage();
