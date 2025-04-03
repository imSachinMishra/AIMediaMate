import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MovieCard from "@/components/MovieCard";
import MovieCardSkeleton from "@/components/MovieCardSkeleton";
import { apiRequest } from "@/lib/queryClient";
import { Movie } from "@/types/movie";
import { mapMovieData } from "@/lib/utils";

interface DiscoverResponse {
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

export default function DiscoverPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [timestamp, setTimestamp] = useState(generateRandomString());
  const [requestId, setRequestId] = useState(generateRandomString());
  const [discoverData, setDiscoverData] = useState<DiscoverResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch genres for mapping
  const { data: genresData } = useQuery({
    queryKey: ["genres"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/genres/movie");
      return response.data;
    },
  });

  // Create a map of genre IDs to names for quick lookup
  const genreMap = genresData?.genres?.reduce((acc: Record<number, string>, genre: any) => {
    acc[genre.id] = genre.name;
    return acc;
  }, {}) || {};

  // Fetch movies based on current page
  useEffect(() => {
    const fetchMovies = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log(`Fetching movies for page ${currentPage} with requestId ${requestId} and timestamp ${timestamp}`);
        
        const response = await apiRequest("GET", `/api/discover/movie?page=${currentPage}&requestId=${requestId}&v=${timestamp}`);
        const data = response.data;
        
        console.log(`Received ${data.results.length} movies for page ${currentPage}`);
        console.log(`Total pages: ${data.total_pages}, Current page: ${data.page}`);
        
        // Log the first few movie IDs to verify they're different
        if (data.results.length > 0) {
          console.log(`First 3 movie IDs: ${data.results.slice(0, 3).map((m: any) => m.id).join(', ')}`);
        }
        
        setDiscoverData(data);
      } catch (err) {
        console.error("Error fetching movies:", err);
        setError("Failed to load movies. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, [currentPage, requestId, timestamp]);

  // Fetch user favorites to mark favorite movies
  const { data: favorites } = useQuery({
    queryKey: ["/api/favorites"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/favorites");
      return response.data.favorites || [];
    },
  });

  // Map the movie data to include genre names and favorite status
  const movies = discoverData?.results.map((movie: any) => {
    const mappedMovie = mapMovieData(movie, favorites, 'movie', genreMap);
    return mappedMovie;
  }) || [];

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      setTimestamp(generateRandomString());
      setRequestId(generateRandomString());
    }
  };

  const handleNextPage = () => {
    if (discoverData && currentPage < discoverData.total_pages) {
      setCurrentPage(prev => prev + 1);
      setTimestamp(generateRandomString());
      setRequestId(generateRandomString());
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title="Discover Movies" subtitle="Explore our collection of movies" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto">
            <h1 className="text-3xl font-bold mb-6">Discover Movies</h1>
            
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
                    Page {currentPage} of {discoverData?.total_pages || 1}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={!discoverData || currentPage >= discoverData.total_pages}
                    className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
} 