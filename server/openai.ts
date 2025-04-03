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
    You are an expert movie and TV show recommendation system specializing in global cinema. Your task is to recommend movies and TV shows based on this user description:
    "${userDescription}"
    
    CRITICAL INSTRUCTIONS:
    1. REGIONAL CINEMA: If the user mentions a specific region (like Bollywood, Korean, French, etc.), you MUST recommend actual films from that region, not Hollywood equivalents.
    2. For Bollywood requests: Recommend ONLY actual Bollywood films (Indian Hindi-language films), not Hollywood movies with similar themes.
    3. For genre requests: Match the genre accurately and prioritize films that best represent that genre.
    4. For actor/director mentions: Prioritize their work, especially from the region mentioned.
    
    Analyze the user's description to understand:
    1. The specific region of cinema they're interested in (if any)
    2. The genre or type of content they're looking for
    3. The themes, plot elements, or mood they're interested in
    4. Any specific actors, directors, or time periods mentioned
    
    Based on this analysis, recommend up to 5 movies or TV shows that would match the user's description.
    For each recommendation, provide a detailed explanation of why it matches the user's description.
    
    Return ONLY a JSON object in this format:
    {
      "recommendations": [
        {
          "title": [exact movie/show title],
          "description": [brief content description],
          "reason": [detailed reason why this content matches the user's description],
          "mediaType": [either "movie" or "tv"]
        },
        ...
      ]
    }
    
    Make sure your recommendations are truly relevant to the user's description, not just based on popularity.
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