import OpenAI from "openai";
import dotenv from "dotenv";
import axios from "axios";
import { getHuggingFaceRecommendations } from "./huggingface";

dotenv.config();

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TMDB_API_KEY = process.env.TMDB_API_KEY || "";
const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";

interface MovieRecommendation {
  title: string;
  id: number;
  description: string;
  reason: string;
  mediaType: 'movie' | 'tv';
  poster_path?: string;
}

interface AIMovieRecommendations {
  recommendations: MovieRecommendation[];
}

export async function getMovieRecommendations(
  userDescription: string,
  moviesToSearch: any[]
): Promise<MovieRecommendation[]> {
  try {
    // First, generate movie recommendations based on the description
    const prompt = `
    You are an expert movie and TV show recommendation system specializing in understanding human emotions and entertainment preferences. Your task is to recommend movies and TV shows based on this user description:
    "${userDescription}"
    
    CRITICAL INSTRUCTIONS:
    1. EMOTIONAL CONTEXT: If the user describes their mood or emotional state (e.g., "lighten my mind", "feel good", "cheer me up"), prioritize movies that match that emotional need.
    2. MOOD MAPPING:
       - For "lighten mood" or "feel good": Recommend uplifting comedies, heartwarming dramas, or inspiring stories
       - For "cheer up": Focus on comedy, adventure, or feel-good movies
       - For "relax": Suggest light-hearted, low-stress movies or comforting stories
    3. REGIONAL CINEMA: If mentioned, recommend actual films from that region
    4. QUALITY FOCUS: Prioritize well-received, highly-rated movies that are known to achieve the requested emotional effect
    
    Analyze the user's request to understand:
    1. Their current emotional state or desired mood
    2. The type of experience they're looking for
    3. Any specific genres or themes they might enjoy
    4. Cultural or regional preferences if mentioned
    
    Based on this analysis, recommend 5 movies or TV shows that would best help achieve their desired emotional state.
    For each recommendation, explain specifically how it will help with their request.
    
    Return ONLY a JSON object in this format:
    {
      "recommendations": [
        {
          "title": [exact movie/show title],
          "description": [brief content description],
          "reason": [detailed explanation of how this will help their emotional state],
          "mediaType": [either "movie" or "tv"]
        },
        ...
      ]
    }
    
    Focus on movies that are genuinely effective at achieving the user's emotional goals, not just popular titles.
    `;

    // Call the OpenAI API to generate recommendations
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      messages: [{ role: "user", content: String(prompt) }],
      response_format: { type: "json_object" },
      temperature: 0.7, // Add some creativity to the recommendations
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      console.log("OpenAI returned empty content, falling back to Hugging Face");
      return getHuggingFaceRecommendations(userDescription, moviesToSearch);
    }

    const parsedResponse = JSON.parse(content) as AIMovieRecommendations;
    
    // Now search for each recommended movie in the TMDB database
    const searchResults = await Promise.all(
      parsedResponse.recommendations.map(async (rec) => {
        try {
          // Search for the movie in TMDB
          const searchResponse = await axios.get(
            `${TMDB_API_BASE_URL}/search/${rec.mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(rec.title)}`
          );
          
          // Find the best match
          const results = searchResponse.data.results;
          if (results && results.length > 0) {
            // Get the first result (most relevant match)
            const match = results[0];
            
            // Get more details about the movie
            const detailsResponse = await axios.get(
              `${TMDB_API_BASE_URL}/${rec.mediaType}/${match.id}?api_key=${TMDB_API_KEY}`
            );
            
            return {
              id: match.id,
              title: match.title || match.name,
              description: detailsResponse.data.overview || rec.description,
              reason: rec.reason,
              mediaType: rec.mediaType,
              poster_path: match.poster_path
            };
          }
          
          // If no match found, return the original recommendation with a placeholder ID
          return {
            id: -1, // Placeholder ID
            title: rec.title,
            description: rec.description,
            reason: rec.reason,
            mediaType: rec.mediaType,
            poster_path: undefined
          };
        } catch (error) {
          console.error(`Error searching for movie "${rec.title}":`, error);
          // Return the original recommendation with a placeholder ID
          return {
            id: -1, // Placeholder ID
            title: rec.title,
            description: rec.description,
            reason: rec.reason,
            mediaType: rec.mediaType,
            poster_path: undefined
          };
        }
      })
    );
    
    // Filter out recommendations with placeholder IDs
    return searchResults.filter(rec => rec.id !== -1);
  } catch (error) {
    console.error("Error getting AI movie recommendations:", error);
    
    // Check if it's a quota error
    if (error instanceof Error && error.message.includes('quota')) {
      console.log("OpenAI API quota exceeded. Using a different model or approach.");
      
      // Try with a different model that might have available quota
      try {
        console.log('[DEBUG] Attempting OpenAI recommendations with a different model...');
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo-1106", // Try with a different model
          messages: [{ role: "user", content: String(prompt) }],
          temperature: 0.7,
        });
        
        // Parse the response
        const content = response.choices[0].message.content;
        if (!content) {
          console.log("OpenAI returned empty content with alternative model, falling back to Hugging Face");
          return getHuggingFaceRecommendations(userDescription, moviesToSearch);
        }
        
        const parsedResponse = JSON.parse(content) as AIMovieRecommendations;
        
        // Now search for each recommended movie in the TMDB database
        const searchResults = await Promise.all(
          parsedResponse.recommendations.map(async (rec) => {
            try {
              // Search for the movie in TMDB
              const searchResponse = await axios.get(
                `${TMDB_API_BASE_URL}/search/${rec.mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(rec.title)}`
              );
              
              // Find the best match
              const results = searchResponse.data.results;
              if (results && results.length > 0) {
                // Get the first result (most relevant match)
                const match = results[0];
                
                // Get more details about the movie
                const detailsResponse = await axios.get(
                  `${TMDB_API_BASE_URL}/${rec.mediaType}/${match.id}?api_key=${TMDB_API_KEY}`
                );
                
                return {
                  id: match.id,
                  title: match.title || match.name,
                  description: detailsResponse.data.overview || rec.description,
                  reason: rec.reason,
                  mediaType: rec.mediaType,
                  poster_path: match.poster_path
                };
              }
              
              // If no match found, return the original recommendation with a placeholder ID
              return {
                id: -1, // Placeholder ID
                title: rec.title,
                description: rec.description,
                reason: rec.reason,
                mediaType: rec.mediaType,
                poster_path: undefined
              };
            } catch (error) {
              console.error(`Error searching for movie "${rec.title}":`, error);
              // Return the original recommendation with a placeholder ID
              return {
                id: -1, // Placeholder ID
                title: rec.title,
                description: rec.description,
                reason: rec.reason,
                mediaType: rec.mediaType,
                poster_path: undefined
              };
            }
          })
        );
        
        // Filter out recommendations with placeholder IDs
        return searchResults.filter(rec => rec.id !== -1);
      } catch (altModelError) {
        console.error("Error with alternative OpenAI model:", altModelError);
        console.log("Falling back to Hugging Face recommendations");
        return getHuggingFaceRecommendations(userDescription, moviesToSearch);
      }
    }
    
    console.log("Falling back to Hugging Face recommendations");
    return getHuggingFaceRecommendations(userDescription, moviesToSearch);
  }
}

// Fallback function that uses keyword matching when OpenAI API is unavailable
export function fallbackRecommendations(
  userDescription: string,
  moviesToSearch: any[]
): MovieRecommendation[] {
  // Convert user description to lowercase for case-insensitive matching
  const descriptionLower = userDescription.toLowerCase();
  
  // Check if the description mentions a specific region
  const regionMatch = descriptionLower.match(/(bollywood|korean|french|japanese|chinese|spanish|italian|german|british)/);
  const region = regionMatch ? regionMatch[1] : null;
  
  console.log(`[DEBUG] OpenAI fallback recommendation for: "${userDescription}"${region ? ` (Region detected: ${region})` : ''}`);
  
  // Extract keywords from the description
  const keywords = descriptionLower
    .split(/\s+/)
    .filter(word => word.length > 3); // Filter out short words
  
  // If we have a region keyword, add it to the keywords list with higher weight
  if (region) {
    // Remove the region from the keywords list if it's there (to avoid double counting)
    const regionIndex = keywords.indexOf(region);
    if (regionIndex !== -1) {
      keywords.splice(regionIndex, 1);
    }
  }
  
  // Score each movie based on keyword matches
  const scoredMovies = moviesToSearch.map(movie => {
    let score = 0;
    const title = (movie.title || movie.name || '').toLowerCase();
    const overview = (movie.overview || '').toLowerCase();
    
    // Check for keyword matches in title and overview
    keywords.forEach(keyword => {
      if (title.includes(keyword)) score += 3;
      if (overview.includes(keyword)) score += 2;
      
      // Check genre names if available
      if (movie.genres) {
        movie.genres.forEach((genre: any) => {
          if (genre.name && genre.name.toLowerCase().includes(keyword)) {
            score += 2;
          }
        });
      }
    });
    
    // If we have a region, give higher score to movies from that region
    if (region) {
      // Check if the movie is from the specified region
      if (title.includes(region)) score += 5;
      if (overview.includes(region)) score += 3;
      
      // For Bollywood, check for common Bollywood actors or directors
      if (region === 'bollywood') {
        const bollywoodKeywords = ['shah rukh khan', 'amitabh bachchan', 'aamir khan', 'salman khan', 'priyanka chopra', 'deepika padukone', 'karan johar', 'yash raj', 'raj kapoor'];
        bollywoodKeywords.forEach(keyword => {
          if (title.includes(keyword)) score += 4;
          if (overview.includes(keyword)) score += 3;
        });
      }
    }
    
    return { movie, score };
  });
  
  // Sort by score and take top 5
  const topMovies = scoredMovies
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.movie);
  
  console.log(`[DEBUG] Found ${topMovies.length} OpenAI fallback recommendations`);
  
  // Format recommendations
  return topMovies.map(movie => ({
    id: movie.id,
    title: movie.title || movie.name,
    description: movie.overview || 'No description available',
    reason: `This ${region ? `${region} ` : ''}movie matches your search based on keyword matching. It has a high relevance score for your query.`,
    mediaType: movie.mediaType || (movie.first_air_date ? 'tv' : 'movie')
  }));
}