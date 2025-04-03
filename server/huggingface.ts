import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || "";
const HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn";

interface MovieRecommendation {
  title: string;
  id: number;
  description: string;
  reason: string;
  mediaType: 'movie' | 'tv';
  poster_path?: string;
}

export async function getHuggingFaceRecommendations(
  userDescription: string,
  moviesToSearch: any[]
): Promise<MovieRecommendation[]> {
  try {
    // Create a prompt for the Hugging Face model
    const prompt = `
    Based on this user description: "${userDescription}"
    
    Recommend 5 movies or TV shows that would match the user's description.
    
    CRITICAL INSTRUCTIONS:
    1. REGIONAL CINEMA: If the user mentions a specific region (like Bollywood, Korean, French, etc.), you MUST recommend actual films from that region, not Hollywood equivalents.
    2. For Bollywood requests: Recommend ONLY actual Bollywood films (Indian Hindi-language films), not Hollywood movies with similar themes.
    3. For genre requests: Match the genre accurately and prioritize films that best represent that genre.
    4. For actor/director mentions: Prioritize their work, especially from the region mentioned.
    
    For each recommendation, provide:
    1. The exact title of the movie or TV show
    2. A brief description of the content
    3. A detailed explanation of why it matches the user's description
    4. Whether it's a movie or TV show
    
    Format your response as a JSON array with objects containing:
    - title: The exact title
    - description: Brief description
    - reason: Why it matches
    - mediaType: "movie" or "tv"
    `;

    // Call the Hugging Face API
    const response = await axios.post(
      HUGGINGFACE_API_URL,
      { inputs: prompt },
      {
        headers: {
          "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    // Extract the generated text from the response
    const generatedText = response.data[0]?.generated_text || "";
    
    // Try to parse the JSON from the generated text
    try {
      // Find JSON array in the text
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const recommendations = JSON.parse(jsonStr);
        
        // Now search for each recommended movie in the TMDB database
        const searchResults = await Promise.all(
          recommendations.map(async (rec: any) => {
            try {
              // Search for the movie in TMDB
              const searchResponse = await axios.get(
                `https://api.themoviedb.org/3/search/${rec.mediaType}?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(rec.title)}`
              );
              
              // Find the best match
              const results = searchResponse.data.results;
              if (results && results.length > 0) {
                // Get the first result (most relevant match)
                const match = results[0];
                
                // Get more details about the movie
                const detailsResponse = await axios.get(
                  `https://api.themoviedb.org/3/${rec.mediaType}/${match.id}?api_key=${process.env.TMDB_API_KEY}`
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
      } else {
        // If no JSON array found, try to extract movie titles from the text
        console.log("[DEBUG] No JSON array found in Hugging Face response, trying to extract movie titles");
        
        // Extract movie titles from the text
        const movieTitleMatches = generatedText.match(/(?:movie|film|show):\s*"([^"]+)"/gi) || 
                                 generatedText.match(/(?:title|name):\s*"([^"]+)"/gi) ||
                                 generatedText.match(/(?:recommend|suggest|watch)\s+(?:the\s+)?(?:movie|film|show)\s+"([^"]+)"/gi);
        
        if (movieTitleMatches && movieTitleMatches.length > 0) {
          console.log(`[DEBUG] Found ${movieTitleMatches.length} movie titles in the text`);
          
          // Extract the titles
          const titles = movieTitleMatches.map((match: string) => {
            const titleMatch = match.match(/"([^"]+)"/);
            return titleMatch ? titleMatch[1] : null;
          }).filter(Boolean);
          
          console.log(`[DEBUG] Extracted titles: ${titles.join(', ')}`);
          
          // Search for each title in TMDB
          const searchResults = await Promise.all(
            titles.map(async (title: string) => {
              try {
                // Search for the movie in TMDB
                const searchResponse = await axios.get(
                  `https://api.themoviedb.org/3/search/multi?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(title)}`
                );
                
                // Find the best match
                const results = searchResponse.data.results;
                if (results && results.length > 0) {
                  // Get the first result (most relevant match)
                  const match = results[0];
                  
                  // Get more details about the movie
                  const detailsResponse = await axios.get(
                    `https://api.themoviedb.org/3/${match.media_type}/${match.id}?api_key=${process.env.TMDB_API_KEY}`
                  );
                  
                  return {
                    id: match.id,
                    title: match.title || match.name,
                    description: detailsResponse.data.overview || `A ${match.media_type} that matches your search for "${userDescription}"`,
                    reason: `Based on your search for "${userDescription}"`,
                    mediaType: match.media_type,
                    poster_path: match.poster_path
                  };
                }
                
                // If no match found, return null
                return null;
              } catch (error) {
                console.error(`Error searching for movie "${title}":`, error);
                return null;
              }
            })
          );
          
          // Filter out null results
          return searchResults.filter(Boolean);
        }
      }
    } catch (parseError) {
      console.error("Error parsing Hugging Face response:", parseError);
    }
    
    // If we couldn't parse the response, fall back to keyword-based recommendations
    console.log("Falling back to keyword-based recommendations from Hugging Face");
    return keywordBasedRecommendations(userDescription, moviesToSearch);
  } catch (error) {
    console.error("Error getting Hugging Face recommendations:", error);
    // Fall back to keyword-based recommendations
    return keywordBasedRecommendations(userDescription, moviesToSearch);
  }
}

// Keyword-based recommendation function for Hugging Face fallback
function keywordBasedRecommendations(
  userDescription: string,
  moviesToSearch: any[]
): MovieRecommendation[] {
  // Convert user description to lowercase for case-insensitive matching
  const descriptionLower = userDescription.toLowerCase();
  
  // Check if the description mentions a specific region
  const regionMatch = descriptionLower.match(/(bollywood|korean|french|japanese|chinese|spanish|italian|german|british)/);
  const region = regionMatch ? regionMatch[1] : null;
  
  console.log(`[DEBUG] Keyword-based recommendation for: "${userDescription}"${region ? ` (Region detected: ${region})` : ''}`);
  
  // Extract keywords from the description
  const keywords = descriptionLower
    .split(/\s+/)
    .filter((word: string) => word.length > 3); // Filter out short words
  
  // Extract genre keywords
  const genreKeywords = keywords.filter((word: string) => 
    ['comedy', 'drama', 'action', 'romance', 'thriller', 'horror', 'sci-fi', 'documentary', 'animation', 'family', 'musical', 'western', 'war', 'crime', 'mystery', 'fantasy', 'adventure'].includes(word)
  );
  
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
    
    // Give extra points for genre matches
    if (genreKeywords.length > 0 && movie.genres) {
      movie.genres.forEach((genre: any) => {
        genreKeywords.forEach(genreKeyword => {
          if (genre.name && genre.name.toLowerCase().includes(genreKeyword)) {
            score += 4; // Higher weight for genre matches
          }
        });
      });
    }
    
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
    
    return {
      ...movie,
      score
    };
  });
  
  // Sort by score and take the top 5
  const topMovies = scoredMovies
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  
  console.log(`[DEBUG] Found ${topMovies.length} keyword-based recommendations`);
  
  // If we have no recommendations, return an empty array
  if (topMovies.length === 0) {
    console.log(`[DEBUG] No keyword-based recommendations found for "${userDescription}"`);
    return [];
  }
  
  // Format the recommendations
  return topMovies.map(movie => ({
    id: movie.id,
    title: movie.title || movie.name,
    description: movie.overview,
    reason: `Based on your search for "${userDescription}"${region ? ` and region "${region}"` : ''}`,
    mediaType: movie.media_type || (movie.first_air_date ? 'tv' : 'movie'),
    poster_path: movie.poster_path
  }));
} 