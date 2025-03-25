import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import axios from "axios";
import { z } from "zod";
import { insertFavoriteSchema } from "@shared/schema";
import { getMovieRecommendations } from "./openai";

const TMDB_API_KEY = process.env.TMDB_API_KEY || "";
const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // TMDB API Proxy routes
  // This helps us not expose our API key on the frontend
  app.get("/api/movies/trending", async (req, res) => {
    try {
      const response = await axios.get(
        `${TMDB_API_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching trending movies:", error);
      res.status(500).json({ message: "Failed to fetch trending movies" });
    }
  });

  app.get("/api/series/trending", async (req, res) => {
    try {
      const response = await axios.get(
        `${TMDB_API_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}`
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching trending series:", error);
      res.status(500).json({ message: "Failed to fetch trending series" });
    }
  });

  app.get("/api/genres/movie", async (req, res) => {
    try {
      const response = await axios.get(
        `${TMDB_API_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching movie genres:", error);
      res.status(500).json({ message: "Failed to fetch movie genres" });
    }
  });

  app.get("/api/genres/tv", async (req, res) => {
    try {
      const response = await axios.get(
        `${TMDB_API_BASE_URL}/genre/tv/list?api_key=${TMDB_API_KEY}`
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching TV genres:", error);
      res.status(500).json({ message: "Failed to fetch TV genres" });
    }
  });

  app.get("/api/discover/movie", async (req, res) => {
    try {
      const genreQuery = req.query.with_genres ? `&with_genres=${req.query.with_genres}` : "";
      const response = await axios.get(
        `${TMDB_API_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}${genreQuery}`
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error discovering movies:", error);
      res.status(500).json({ message: "Failed to discover movies" });
    }
  });

  app.get("/api/discover/tv", async (req, res) => {
    try {
      const genreQuery = req.query.with_genres ? `&with_genres=${req.query.with_genres}` : "";
      const response = await axios.get(
        `${TMDB_API_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}${genreQuery}`
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error discovering TV shows:", error);
      res.status(500).json({ message: "Failed to discover TV shows" });
    }
  });

  app.get("/api/search/multi", async (req, res) => {
    try {
      const query = req.query.query;
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }
      
      const response = await axios.get(
        `${TMDB_API_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${query}`
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error searching:", error);
      res.status(500).json({ message: "Failed to search" });
    }
  });

  app.get("/api/movie/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const response = await axios.get(
        `${TMDB_API_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&append_to_response=watch/providers`
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching movie details:", error);
      res.status(500).json({ message: "Failed to fetch movie details" });
    }
  });
  
  app.get("/api/movie/:id/similar", async (req, res) => {
    try {
      const id = req.params.id;
      const response = await axios.get(
        `${TMDB_API_BASE_URL}/movie/${id}/similar?api_key=${TMDB_API_KEY}`
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching similar movies:", error);
      res.status(500).json({ message: "Failed to fetch similar movies" });
    }
  });

  app.get("/api/tv/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const response = await axios.get(
        `${TMDB_API_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&append_to_response=watch/providers`
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching TV details:", error);
      res.status(500).json({ message: "Failed to fetch TV details" });
    }
  });
  
  app.get("/api/tv/:id/similar", async (req, res) => {
    try {
      const id = req.params.id;
      const response = await axios.get(
        `${TMDB_API_BASE_URL}/tv/${id}/similar?api_key=${TMDB_API_KEY}`
      );
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching similar TV shows:", error);
      res.status(500).json({ message: "Failed to fetch similar TV shows" });
    }
  });

  app.get("/api/recommendations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Get user's favorites
      const userId = (req.user as any).id;
      const favorites = await storage.getFavorites(userId);
      
      if (favorites.length === 0) {
        // If user has no favorites, return trending
        const response = await axios.get(
          `${TMDB_API_BASE_URL}/trending/all/week?api_key=${TMDB_API_KEY}`
        );
        return res.json(response.data);
      }
      
      // Get a random favorite to base recommendations on
      const randomFavorite = favorites[Math.floor(Math.random() * favorites.length)];
      
      // Get recommendations based on a random favorite
      const response = await axios.get(
        `${TMDB_API_BASE_URL}/${randomFavorite.mediaType}/${randomFavorite.tmdbId}/recommendations?api_key=${TMDB_API_KEY}`
      );
      
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });
  
  // AI-powered recommendations based on user description
  app.post("/api/ai-recommendations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { description } = req.body;
      
      if (!description || typeof description !== 'string') {
        return res.status(400).json({ message: "Description is required" });
      }
      
      // Get popular movies and TV shows to search through
      const [moviesResponse, tvResponse] = await Promise.all([
        axios.get(`${TMDB_API_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=1`),
        axios.get(`${TMDB_API_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&page=1`)
      ]);
      
      const movies = moviesResponse.data.results.map((movie: any) => ({
        ...movie,
        mediaType: 'movie'
      }));
      
      const tvShows = tvResponse.data.results.map((show: any) => ({
        ...show,
        mediaType: 'tv'
      }));
      
      // Combine movies and TV shows
      const allContent = [...movies, ...tvShows];
      
      // Get AI recommendations
      const aiRecommendations = await getMovieRecommendations(description, allContent);
      
      // Format recommendations for the frontend
      const formattedRecommendations = {
        page: 1,
        results: aiRecommendations.map(rec => {
          const originalItem = allContent.find(item => item.id === rec.id);
          if (!originalItem) return null;
          
          return {
            ...originalItem,
            ai_reason: rec.reason
          };
        }).filter(Boolean)
      };
      
      res.json(formattedRecommendations);
    } catch (error) {
      console.error("Error getting AI recommendations:", error);
      res.status(500).json({ message: "Failed to get AI recommendations" });
    }
  });

  // Favorites routes
  app.get("/api/favorites", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = (req.user as any).id;
      const favorites = await storage.getFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.get("/api/favorites/details", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = (req.user as any).id;
      const favorites = await storage.getFavorites(userId);
      
      if (favorites.length === 0) {
        return res.json([]);
      }

      // Fetch details for each favorite
      const detailedFavorites = await Promise.all(
        favorites.map(async (fav) => {
          try {
            const response = await axios.get(
              `${TMDB_API_BASE_URL}/${fav.mediaType}/${fav.tmdbId}?api_key=${TMDB_API_KEY}`
            );
            return {
              ...response.data,
              mediaType: fav.mediaType,
              isFavorite: true
            };
          } catch (err) {
            console.error(`Error fetching details for ${fav.mediaType}/${fav.tmdbId}:`, err);
            // Return basic info if detailed fetch fails
            return {
              id: fav.tmdbId,
              mediaType: fav.mediaType,
              title: fav.mediaType === 'movie' ? 'Movie' : 'TV Show',
              name: fav.mediaType === 'tv' ? 'TV Show' : undefined,
              isFavorite: true
            };
          }
        })
      );
      
      res.json(detailedFavorites);
    } catch (error) {
      console.error("Error fetching favorite details:", error);
      res.status(500).json({ message: "Failed to fetch favorite details" });
    }
  });

  app.post("/api/favorites", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = (req.user as any).id;
      const favoriteData = insertFavoriteSchema.parse({
        ...req.body,
        userId,
      });
      
      // Check if already in favorites
      const existing = await storage.getFavorite(userId, favoriteData.tmdbId);
      if (existing) {
        return res.status(400).json({ message: "Already in favorites" });
      }
      
      const favorite = await storage.addFavorite(favoriteData);
      res.status(201).json(favorite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  app.delete("/api/favorites/:tmdbId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const userId = (req.user as any).id;
      const tmdbId = parseInt(req.params.tmdbId);
      
      if (isNaN(tmdbId)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      await storage.removeFavorite(userId, tmdbId);
      res.status(200).json({ message: "Favorite removed successfully" });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
