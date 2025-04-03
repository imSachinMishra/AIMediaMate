import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MovieCard from "@/components/MovieCard";
import MovieCardSkeleton from "@/components/MovieCardSkeleton";
import { apiRequest } from "@/lib/queryClient";
import { Movie } from "@/types/movie";
import { mapMovieData } from "@/lib/utils";

interface GenreResponse {
  page: number;
  results: any[];
  total_pages: number;
  total_results: number;
  requestId?: string;
  timestamp?: string;
}

// Function to generate a random string for cache busting
function generateRandomString(length = 10) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export default function GenrePage() {
  const params = useParams();
  const genreId = params?.id;
  
  const [currentPage, setCurrentPage] = useState(1);
  const [timestamp, setTimestamp] = useState(generateRandomString());
  const [requestId, setRequestId] = useState(generateRandomString());
  const [genreData, setGenreData] = useState<GenreResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch genre details
  const { data: genreDetails, error: genreDetailsError } = useQuery({
    queryKey: ["genre", genreId],
    queryFn: async () => {
      if (!genreId) {
        throw new Error("No genre ID provided");
      }
      
      const response = await fetch(`/api/genres/${genreId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch genre details: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    },
    enabled: !!genreId,
  });

  // Fetch genres for mapping
  const { data: genresData, error: genresError } = useQuery({
    queryKey: ["genres"],
    queryFn: async () => {
      const response = await fetch("/api/genres/movie");
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch genres: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    },
  });

  // Create a map of genre IDs to names for quick lookup
  const genreMap = genresData?.genres?.reduce((acc: Record<number, string>, genre: any) => {
    acc[genre.id] = genre.name;
    return acc;
  }, {}) || {};

  // Fetch movies based on current page and genre
  useEffect(() => {
    const fetchMovies = async () => {
      if (!genreId) {
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Make sure genreId is a number and properly formatted for the API
        const formattedGenreId = parseInt(genreId, 10);
        if (isNaN(formattedGenreId)) {
          throw new Error(`Invalid genre ID: ${genreId}`);
        }
        
        const apiUrl = `/api/discover/movie?with_genres=${formattedGenreId}&page=${currentPage}&requestId=${requestId}&v=${timestamp}`;
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch movies: ${response.statusText}`);
        }
        
        const data = await response.json();
        setGenreData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load movies. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, [genreId, currentPage, requestId, timestamp]);

  // Show errors from queries
  useEffect(() => {
    if (genreDetailsError) {
      setError("Failed to load genre details. Please try again later.");
    }
    if (genresError) {
      setError("Failed to load genres. Please try again later.");
    }
  }, [genreDetailsError, genresError]);

  // Fetch user favorites to mark favorite movies
  const { data: favorites } = useQuery({
    queryKey: ["/api/favorites"],
    queryFn: async () => {
      const response = await fetch("/api/favorites");
      if (!response.ok) {
        throw new Error('Failed to fetch favorites');
      }
      const data = await response.json();
      return data.favorites || [];
    },
  });

  // Map the movie data to include genre names and favorite status
  const movies = genreData?.results.map((movie: any) => {
    return mapMovieData(movie, favorites, 'movie', genreMap);
  }) || [];

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      setTimestamp(generateRandomString());
      setRequestId(generateRandomString());
    }
  };

  const handleNextPage = () => {
    if (genreData && currentPage < genreData.total_pages) {
      setCurrentPage(prev => prev + 1);
      setTimestamp(generateRandomString());
      setRequestId(generateRandomString());
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header 
          title={genreDetails?.name || "Genre"} 
          subtitle={`Movies in the ${genreDetails?.name || "selected"} genre`} 
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto">
            <h1 className="text-3xl font-bold mb-6">{genreDetails?.name || "Genre"} Movies</h1>
            
            {error && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">
                {error}
              </div>
            )}
            
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {Array.from({ length: 10 }).map((_, index) => (
                  <MovieCardSkeleton key={index} />
                ))}
              </div>
            ) : (
              <>
                {movies.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6" key={`movie-grid-${currentPage}-${timestamp}`}>
                      {movies.map((movie) => (
                        <MovieCard 
                          key={`${movie.id}-${timestamp}`} 
                          movie={movie} 
                          timestamp={timestamp}
                        />
                      ))}
                    </div>
                    
                    <div className="flex justify-center mt-8 gap-4">
                      <button
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-4 py-2 bg-card text-foreground rounded-md">
                        Page {currentPage} of {genreData?.total_pages || 1}
                      </span>
                      <button
                        onClick={handleNextPage}
                        disabled={!genreData || currentPage >= genreData.total_pages}
                        className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-lg text-muted-foreground">
                      No movies found in this genre.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
