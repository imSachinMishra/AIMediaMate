import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import axios from "axios";
import { z } from "zod";
import { insertFavoriteSchema } from "@shared/schema";
import { getMovieRecommendations, fallbackRecommendations } from "./openai";
import { getHuggingFaceRecommendations } from "./huggingface";

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

  // Define specific genre routes first
  app.get("/api/genres/movie", async (req, res) => {
    try {
      console.log("[DEBUG] [/api/genres/movie] Fetching movie genres");
      const response = await axios.get(
        `${TMDB_API_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`
      );
      console.log(`[DEBUG] [/api/genres/movie] Found ${response.data.genres?.length || 0} genres`);
      console.log("[DEBUG] [/api/genres/movie] First few genres:", response.data.genres?.slice(0, 3));
      res.json(response.data);
    } catch (error) {
      console.error("[ERROR] Error fetching movie genres:", error);
      res.status(500).json({ message: "Failed to fetch movie genres" });
    }
  });

  app.get("/api/genres/tv", async (req, res) => {
    try {
      console.log("[/api/genres/tv] Fetching TV genres");
      const response = await axios.get(
        `${TMDB_API_BASE_URL}/genre/tv/list?api_key=${TMDB_API_KEY}`
      );
      console.log(`[/api/genres/tv] Found ${response.data.genres?.length || 0} genres`);
      res.json(response.data);
    } catch (error) {
      console.error("Error fetching TV genres:", error);
      res.status(500).json({ message: "Failed to fetch TV genres" });
    }
  });

  // Then define the parameterized genre route
  app.get("/api/genres/:id", async (req, res) => {
    try {
      const genreId = req.params.id;
      console.log(`[DEBUG] [/api/genres/:id] Fetching details for genre ID: ${genreId}`);
      
      // First get all genres
      const response = await axios.get(
        `${TMDB_API_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`
      );
      
      // Find the specific genre
      const genre = response.data.genres.find((g: any) => g.id === parseInt(genreId));
      
      if (!genre) {
        console.log(`[DEBUG] [/api/genres/:id] Genre not found for ID: ${genreId}`);
        return res.status(404).json({ message: "Genre not found" });
      }
      
      console.log(`[DEBUG] [/api/genres/:id] Found genre:`, genre);
      res.json(genre);
    } catch (error) {
      console.error(`[ERROR] Error fetching genre details for ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch genre details" });
    }
  });

  app.get("/api/discover/movie", async (req, res) => {
    try {
      // Ensure with_genres is a valid number
      const genreId = req.query.with_genres ? parseInt(req.query.with_genres as string) : null;
      const genreQuery = genreId && !isNaN(genreId) ? `&with_genres=${genreId}` : "";
      const page = parseInt(req.query.page as string) || 1;
      const requestId = req.query.requestId || 'no-request-id';
      const timestamp = req.query.v || 'no-timestamp';
      
      console.log(`[DEBUG] [/api/discover/movie] Request params:`, {
        genreId,
        genreQuery,
        page,
        requestId,
        timestamp
      });
      
      // Add cache control headers to prevent browser caching
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      // According to TMDB API docs, page parameter should be between 1 and 1000
      const validPage = Math.max(1, Math.min(1000, page));
      
      // Add a unique identifier to the URL to prevent caching
      const url = `${TMDB_API_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}${genreQuery}&page=${validPage}&sort_by=popularity.desc&_t=${Date.now()}`;
      console.log(`[DEBUG] [/api/discover/movie] TMDB API URL: ${url.replace(TMDB_API_KEY, 'API_KEY_HIDDEN')}`);
      
      // Log the full URL for debugging (be careful with this in production)
      console.log(`[DEBUG] [/api/discover/movie] Full TMDB API URL: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log(`[DEBUG] [/api/discover/movie] Response:`, {
        totalResults: response.data.total_results,
        totalPages: response.data.total_pages,
        currentPage: response.data.page,
        resultsCount: response.data.results.length
      });
      
      if (response.data.results.length > 0) {
        console.log(`[DEBUG] [/api/discover/movie] First movie:`, response.data.results[0]);
      } else {
        console.log(`[DEBUG] [/api/discover/movie] No movies found for genre ID: ${genreId}`);
      }
      
      // Add the requestId and timestamp to the response for debugging
      response.data.requestId = requestId;
      response.data.timestamp = timestamp;
      
      res.json(response.data);
    } catch (error) {
      console.error("[ERROR] Error discovering movies:", error);
      if (axios.isAxiosError(error)) {
        console.error("[ERROR] Axios error details:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
      res.status(500).json({ message: "Failed to discover movies" });
    }
  });

  app.get("/api/discover/tv", async (req, res) => {
    try {
      const genreQuery = req.query.with_genres ? `&with_genres=${req.query.with_genres}` : "";
      const page = parseInt(req.query.page as string) || 1;
      const requestId = req.query.requestId || 'no-request-id';
      const timestamp = req.query.v || 'no-timestamp';
      
      console.log(`[${new Date().toISOString()}] Fetching TV shows page ${page} with requestId ${requestId} and timestamp ${timestamp}${genreQuery ? ` with genres ${req.query.with_genres}` : ''}`);
      
      // Add cache control headers to prevent browser caching
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      // According to TMDB API docs, page parameter should be between 1 and 1000
      const validPage = Math.max(1, Math.min(1000, page));
      
      // Add a unique identifier to the URL to prevent caching
      const url = `${TMDB_API_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}${genreQuery}&page=${validPage}&sort_by=popularity.desc&_t=${Date.now()}`;
      console.log(`TMDB API URL: ${url.replace(TMDB_API_KEY, 'API_KEY_HIDDEN')}`);
      
      const response = await axios.get(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log(`[${new Date().toISOString()}] Received ${response.data.results.length} TV shows for page ${validPage} with requestId ${requestId}`);
      console.log(`Total pages: ${response.data.total_pages}, Current page: ${response.data.page}`);
      
      // Log the first few TV show IDs to verify they're different
      if (response.data.results.length > 0) {
        console.log(`First 3 TV show IDs: ${response.data.results.slice(0, 3).map((m: any) => m.id).join(', ')}`);
      }
      
      // Add the requestId and timestamp to the response for debugging
      response.data.requestId = requestId;
      response.data.timestamp = timestamp;
      
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
      
      console.log(`[DEBUG] Searching for: "${query}"`);
      
      const response = await axios.get(
        `${TMDB_API_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query as string)}`
      );
      
      console.log(`[DEBUG] Found ${response.data.results?.length || 0} results`);
      
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
    try {
      const { description } = req.body;
      
      if (!description) {
        return res.status(400).json({ error: 'Description is required' });
      }
      
      // Check if the description mentions a specific region
      const regionMatch = description.toLowerCase().match(/(bollywood|korean|french|japanese|chinese|spanish|italian|german|british)/);
      const region = regionMatch ? regionMatch[1] : null;
      
      console.log(`[DEBUG] AI recommendation request for: "${description}"${region ? ` (Region detected: ${region})` : ''}`);
      
      // First try OpenAI
      try {
        console.log('[DEBUG] Attempting OpenAI recommendations...');
        const aiRecommendations = await getMovieRecommendations(description, []);
        
        if (aiRecommendations && aiRecommendations.length > 0) {
          console.log(`[DEBUG] OpenAI returned ${aiRecommendations.length} recommendations`);
          
          // Fetch detailed movie information from TMDB for each recommendation
          const detailedRecommendations = await Promise.all(
            aiRecommendations.map(async (rec) => {
              try {
                // Search for the movie in TMDB
                const searchResponse = await axios.get(
                  `${TMDB_API_BASE_URL}/search/${rec.mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(rec.title)}`
                );
                
                if (searchResponse.data.results && searchResponse.data.results.length > 0) {
                  const match = searchResponse.data.results[0];
                  
                  // Get more details about the movie
                  const detailsResponse = await axios.get(
                    `${TMDB_API_BASE_URL}/${rec.mediaType}/${match.id}?api_key=${TMDB_API_KEY}`
                  );
                  
                  return {
                    id: match.id,
                    title: match.title || match.name,
                    overview: detailsResponse.data.overview || rec.description,
                    media_type: rec.mediaType,
                    ai_reason: rec.reason,
                    is_ai_generated: true,
                    fallback: false,
                    poster_path: match.poster_path,
                    release_date: match.release_date || match.first_air_date,
                    vote_average: match.vote_average
                  };
                }
                
                return {
                  id: rec.id || Math.random().toString(36).substring(2, 9),
                  title: rec.title,
                  overview: rec.description,
                  media_type: rec.mediaType,
                  ai_reason: rec.reason,
                  is_ai_generated: true,
                  fallback: false,
                  poster_path: null
                };
              } catch (error) {
                console.error(`Error fetching details for "${rec.title}":`, error);
                return {
                  id: rec.id || Math.random().toString(36).substring(2, 9),
                  title: rec.title,
                  overview: rec.description,
                  media_type: rec.mediaType,
                  ai_reason: rec.reason,
                  is_ai_generated: true,
                  fallback: false,
                  poster_path: null
                };
              }
            })
          );
          
          return res.json({ 
            results: detailedRecommendations,
            fallback: false
          });
        }
      } catch (error) {
        console.error('[ERROR] OpenAI recommendation error:', error);
        
        // Try Hugging Face as fallback
        try {
          console.log('[DEBUG] Attempting Hugging Face recommendations...');
          const hfRecommendations = await getHuggingFaceRecommendations(description, []);
          
          if (hfRecommendations && hfRecommendations.length > 0) {
            console.log(`[DEBUG] Hugging Face returned ${hfRecommendations.length} recommendations`);
            
            // Fetch detailed movie information from TMDB for each recommendation
            const detailedRecommendations = await Promise.all(
              hfRecommendations.map(async (rec) => {
                try {
                  // Search for the movie in TMDB
                  const searchResponse = await axios.get(
                    `${TMDB_API_BASE_URL}/search/${rec.mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(rec.title)}`
                  );
                  
                  if (searchResponse.data.results && searchResponse.data.results.length > 0) {
                    const match = searchResponse.data.results[0];
                    
                    // Get more details about the movie
                    const detailsResponse = await axios.get(
                      `${TMDB_API_BASE_URL}/${rec.mediaType}/${match.id}?api_key=${TMDB_API_KEY}`
                    );
                    
                    return {
                      id: match.id,
                      title: match.title || match.name,
                      overview: detailsResponse.data.overview || rec.description,
                      media_type: rec.mediaType,
                      ai_reason: rec.reason,
                      is_ai_generated: true,
                      fallback: true,
                      fallbackSource: 'huggingface',
                      poster_path: match.poster_path,
                      release_date: match.release_date || match.first_air_date,
                      vote_average: match.vote_average
                    };
                  }
                  
                  return {
                    id: rec.id || Math.random().toString(36).substring(2, 9),
                    title: rec.title,
                    overview: rec.description,
                    media_type: rec.mediaType,
                    ai_reason: rec.reason,
                    is_ai_generated: true,
                    fallback: true,
                    fallbackSource: 'huggingface',
                    poster_path: null
                  };
                } catch (error) {
                  console.error(`Error fetching details for "${rec.title}":`, error);
                  return {
                    id: rec.id || Math.random().toString(36).substring(2, 9),
                    title: rec.title,
                    overview: rec.description,
                    media_type: rec.mediaType,
                    ai_reason: rec.reason,
                    is_ai_generated: true,
                    fallback: true,
                    fallbackSource: 'huggingface',
                    poster_path: null
                  };
                }
              })
            );
            
            return res.json({ 
              results: detailedRecommendations,
              fallback: true,
              fallbackSource: 'huggingface'
            });
          }
        } catch (hfError) {
          console.error('[ERROR] Hugging Face recommendation error:', hfError);
        }
      }
      
      // If both AI services fail, fall back to keyword-based recommendations
      console.log('[DEBUG] Falling back to keyword-based recommendations');
      
      // Extract mood keywords and map them to search terms
      const moodKeywords = {
        'lighten': ['feel good', 'uplifting', 'heartwarming', 'comedy'],
        'happy': ['comedy', 'feel good', 'uplifting'],
        'cheer': ['comedy', 'feel good', 'uplifting'],
        'relax': ['light hearted', 'comedy', 'heartwarming'],
        'feel good': ['uplifting', 'heartwarming', 'comedy'],
        'mind': ['comedy', 'uplifting', 'heartwarming']
      };
      
      // Find matching mood keywords in the description
      const userWords = description.toLowerCase().split(/\s+/);
      let searchTerms = new Set<string>();
      
      for (const word of userWords) {
        for (const [mood, terms] of Object.entries(moodKeywords)) {
          if (word.includes(mood)) {
            terms.forEach(term => searchTerms.add(term));
          }
        }
      }
      
      // If no mood keywords found, use the original description
      const searchQueries = searchTerms.size > 0 
        ? Array.from(searchTerms)
        : [description];
      
      // For regional cinema, use region-specific search
      let searchResults = [];
      
      // Try each search term until we find results
      for (const query of searchQueries) {
        if (searchResults.length > 0) break;
        
        try {
          console.log(`[DEBUG] Searching with query: "${query}"`);
          const results = await axios.get(
            `${TMDB_API_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
          );
          
          if (results?.data?.results?.length > 0) {
            // Filter for movies with positive vote average
            searchResults = results.data.results.filter((item: any) => 
              item.vote_average >= 7.0 || item.popularity > 50
            );
            
            if (searchResults.length > 0) {
              console.log(`[DEBUG] Found ${searchResults.length} results for "${query}" with good ratings`);
              break;
            }
          }
        } catch (error) {
          console.error(`[ERROR] Error searching with query "${query}":`, error);
        }
      }
      
      // If still no results, try a general search
      if (searchResults.length === 0) {
        console.log(`[DEBUG] No results found with mood keywords, trying general search`);
        try {
          const generalResults = await axios.get(
            `${TMDB_API_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=feel%20good%20comedy`
          );
          if (generalResults?.data?.results) {
            searchResults = generalResults.data.results.filter((item: any) => 
              item.vote_average >= 7.0 || item.popularity > 50
            );
            console.log(`[DEBUG] Found ${searchResults.length} general results`);
          }
        } catch (error) {
          console.error(`[ERROR] Error performing general search:`, error);
        }
      }
      
      // Format the response for the frontend
      const formattedResults = searchResults.map((item: any) => ({
        id: item.id,
        title: item.title || item.name,
        overview: item.overview,
        media_type: item.media_type,
        ai_reason: `This ${item.vote_average >= 7.0 ? 'highly-rated' : 'popular'} ${
          item.media_type === 'movie' ? 'movie' : 'show'
        } is known for its uplifting and entertaining content, perfect for lightening your mood.`,
        is_ai_generated: false,
        fallback: true,
        fallbackSource: 'keyword',
        poster_path: item.poster_path,
        release_date: item.release_date || item.first_air_date,
        vote_average: item.vote_average
      }));
      
      console.log(`[DEBUG] Returning ${formattedResults.length} keyword-based recommendations`);
      
      return res.json({ 
        results: formattedResults,
        fallback: true,
        fallbackSource: 'keyword'
      });
      
    } catch (error) {
      console.error('[ERROR] Error in AI recommendations:', error);
      res.status(500).json({ error: 'Failed to get recommendations' });
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
