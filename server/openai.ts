import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface MovieRecommendation {
  title: string;
  id: number;
  description: string;
  reason: string;
}

interface AIMovieRecommendations {
  recommendations: MovieRecommendation[];
}

export async function getMovieRecommendations(
  userDescription: string,
  moviesToSearch: any[]
): Promise<MovieRecommendation[]> {
  try {
    // Format the movie data for the AI to search through
    const movieData = moviesToSearch.map((movie) => ({
      id: movie.id,
      title: movie.title || movie.name,
      overview: movie.overview,
      genres: movie.genre_ids || movie.genres?.map((g: any) => g.id) || [],
      release_date: movie.release_date || movie.first_air_date,
      popularity: movie.popularity,
      vote_average: movie.vote_average,
    }));

    // Create a prompt for the AI
    const prompt = `
    As a movie recommendation system, your task is to find movies that match this user description:
    "${userDescription}"
    
    Based on this description, select up to 5 of the most relevant movies from the following list.
    For each selected movie, explain why it matches the user's description.
    
    Available movies:
    ${JSON.stringify(movieData, null, 2)}
    
    Return ONLY a JSON object in this format:
    {
      "recommendations": [
        {
          "id": [movie id number],
          "title": [movie title],
          "description": [brief movie description],
          "reason": [reason why this movie matches the user's description]
        },
        ...
      ]
    }
    `;

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      return [];
    }

    const parsedResponse = JSON.parse(content) as AIMovieRecommendations;
    return parsedResponse.recommendations;
  } catch (error) {
    console.error("Error getting AI movie recommendations:", error);
    return [];
  }
}