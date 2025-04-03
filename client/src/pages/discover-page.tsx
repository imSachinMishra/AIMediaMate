import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MovieCard from "@/components/MovieCard";
import MovieCardSkeleton from "@/components/MovieCardSkeleton";
import { mapMovieData } from "@/lib/utils";
import { Movie } from "@/types/movie";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DiscoverResponse {
  results: any[];
  total_pages: number;
  total_results: number;
}

// Generate a random string for cache busting
function generateRandomString(length = 10) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export default function DiscoverPage() {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const mediaType = 'movie'; // Default to movies
  
  // State for discover data
  const [discoverData, setDiscoverData] = useState<DiscoverResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState(generateRandomString());
  const [requestId, setRequestId] = useState(generateRandomString(20));
  
  // Fetch genre data for mapping
  const { data: genresData } = useQuery<{ genres: any[] }>({
    queryKey: ['/api/genres/movie'],
  });

  // Create a genre map for quick lookups
  const genreMap: Record<number, string> = {};
  if (genresData?.genres) {
    genresData.genres.forEach(genre => {
      genreMap[genre.id] = genre.name;
    });
  }
  
  // Fetch movies directly with useEffect
  useEffect(() => {
    const fetchMovies = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log(`Fetching page ${currentPage} of movies with requestId ${requestId}`);
        const url = `/api/discover/${mediaType}?page=${currentPage}&v=${timestamp}&requestId=${requestId}`;
        console.log(`Client fetch URL: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch movies');
        }
        
        const data = await response.json();
        console.log(`Received ${data.results.length} movies for page ${currentPage}`);
        console.log(`Total pages: ${data.total_pages}, Current page: ${data.page}`);
        
        // Log the first few movie IDs to verify they're different
        if (data.results.length > 0) {
          console.log(`First 3 movie IDs: ${data.results.slice(0, 3).map((m: any) => m.id).join(', ')}`);
        }
        
        // Verify that the page number in the response matches what we requested
        if (data.page !== currentPage) {
          console.warn(`Page mismatch: requested ${currentPage}, received ${data.page}`);
        }
        
        // Check if we received any results
        if (data.results.length === 0) {
          console.warn(`No results received for page ${currentPage}`);
        }
        
        setDiscoverData(data);
      } catch (err) {
        console.error('Error fetching movies:', err);
        setError('Failed to load movies. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMovies();
  }, [currentPage, mediaType, timestamp, requestId]);
  
  // Fetch user favorites to mark favorite movies
  const { data: favorites } = useQuery<any[]>({
    queryKey: ['/api/favorites'],
  });
  
  // Map movies data to our Movie type
  const movies: Movie[] = discoverData?.results
    ? discoverData.results.map((movie: any) => 
        mapMovieData(movie, favorites, mediaType as 'movie' | 'tv', genreMap)
      )
    : [];
  
  // Handle pagination
  const handlePrevPage = () => {
    if (currentPage > 1) {
      console.log(`Navigating to previous page ${currentPage - 1}`);
      setCurrentPage(prev => prev - 1);
      setTimestamp(generateRandomString()); // Update timestamp to force refresh
      setRequestId(generateRandomString(20)); // Generate a new request ID
    }
  };
  
  const handleNextPage = () => {
    if (discoverData && currentPage < discoverData.total_pages) {
      console.log(`Navigating to next page ${currentPage + 1}`);
      setCurrentPage(prev => prev + 1);
      setTimestamp(generateRandomString()); // Update timestamp to force refresh
      setRequestId(generateRandomString(20)); // Generate a new request ID
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0f1535]">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-8">
        <Header 
          title="Discover Movies" 
          subtitle="Explore our collection of movies" 
        />
        
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-2">
            All Movies
          </h2>
          <p className="text-[#A0AEC0]">
            {isLoading 
              ? 'Loading content...' 
              : error
                ? error
                : movies.length > 0 
                  ? `Found ${discoverData?.total_results || 0} movies (Page ${currentPage} of ${discoverData?.total_pages || 1})` 
                  : 'No movies found'
            }
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6" key={`movie-grid-${currentPage}-${timestamp}`}>
          {isLoading ? (
            // Show skeletons while loading
            Array(20).fill(null).map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))
          ) : error ? (
            // Show error state
            <div className="col-span-full py-12 text-center">
              <h3 className="text-xl font-medium text-white mb-2">Error loading movies</h3>
              <p className="text-[#A0AEC0]">
                {error}
              </p>
            </div>
          ) : movies.length > 0 ? (
            // Show movies if available
            movies.map((movie) => (
              <MovieCard key={`${movie.id}-${timestamp}`} movie={movie} />
            ))
          ) : (
            // Show empty state
            <div className="col-span-full py-12 text-center">
              <h3 className="text-xl font-medium text-white mb-2">No movies found</h3>
              <p className="text-[#A0AEC0]">
                We couldn't find any movies. Please check back later.
              </p>
            </div>
          )}
        </div>
        
        {/* Pagination controls */}
        {!isLoading && !error && discoverData && discoverData.total_pages > 1 && (
          <div className="flex justify-center items-center mt-8 gap-4">
            <Button 
              variant="outline" 
              onClick={handlePrevPage} 
              disabled={currentPage === 1}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            
            <span className="text-white">
              Page {currentPage} of {discoverData.total_pages}
            </span>
            
            <Button 
              variant="outline" 
              onClick={handleNextPage} 
              disabled={currentPage === discoverData.total_pages}
              className="flex items-center gap-1"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
} 