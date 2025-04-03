import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MovieCard from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { mapMovieData } from "@/lib/utils";
import { Movie } from "@/types/movie";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Generate a random string for cache busting
function generateRandomString(length = 10) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export default function GenrePage() {
  // Get genre ID and media type from URL
  const [match, params] = useRoute('/genre/:id');
  const genreId = params?.id;
  const searchParams = new URLSearchParams(window.location.search);
  const mediaType = searchParams.get('mediaType') || 'movie';
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [timestamp, setTimestamp] = useState(generateRandomString());
  const [requestId, setRequestId] = useState(generateRandomString(20));
  
  // State for discover data
  const [discoverData, setDiscoverData] = useState<{ results: any[], total_pages: number, total_results: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch genre details
  const { data: genresData } = useQuery<{ genres: any[] }>({
    queryKey: [`/api/genres/${mediaType}`],
  });
  
  // Find the current genre
  const currentGenre = genresData?.genres?.find(g => g.id.toString() === genreId);
  
  // Fetch movies/shows of this genre directly with useEffect
  useEffect(() => {
    const fetchMovies = async () => {
      if (!genreId) return;
      
      setIsLoading(true);
      setError(null);
      try {
        console.log(`Fetching page ${currentPage} of ${mediaType} with genre ${genreId} and requestId ${requestId}`);
        // Add timestamp to prevent caching
        const url = `/api/discover/${mediaType}?with_genres=${genreId}&page=${currentPage}&v=${timestamp}&requestId=${requestId}`;
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
        console.log(`Received ${data.results.length} ${mediaType}s for page ${currentPage}`);
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
  }, [currentPage, mediaType, genreId, timestamp, requestId]);
  
  // Fetch user favorites to mark favorite movies
  const { data: favorites } = useQuery<any[]>({
    queryKey: ['/api/favorites'],
  });
  
  // Map movies data to our Movie type
  const movies: Movie[] = discoverData?.results
    ? discoverData.results.map(movie => 
        mapMovieData(movie, favorites, mediaType as 'movie' | 'tv')
      )
    : [];
  
  // Handle pagination
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      setTimestamp(generateRandomString()); // Update timestamp to force refresh
      setRequestId(generateRandomString(20)); // Generate a new request ID
    }
  };
  
  const handleNextPage = () => {
    if (discoverData && currentPage < discoverData.total_pages) {
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
          title={currentGenre?.name || 'Genre'} 
          subtitle={`Explore ${mediaType === 'movie' ? 'movies' : 'TV shows'} in this category`} 
        />
        
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-2">
            {currentGenre?.name || 'Loading...'} {mediaType === 'movie' ? 'Movies' : 'TV Shows'}
          </h2>
          <p className="text-[#A0AEC0]">
            {isLoading 
              ? 'Loading content...' 
              : error
                ? error
                : movies.length > 0 
                  ? `Found ${discoverData?.total_results || 0} titles in this category (Page ${currentPage} of ${discoverData?.total_pages || 1})` 
                  : 'No titles found in this category'
            }
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6" key={`genre-grid-${currentPage}-${timestamp}`}>
          {isLoading ? (
            // Show skeletons while loading
            Array(12).fill(null).map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))
          ) : error ? (
            // Show error state
            <div className="col-span-full py-12 text-center">
              <h3 className="text-xl font-medium text-white mb-2">Error loading titles</h3>
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
              <h3 className="text-xl font-medium text-white mb-2">No titles found</h3>
              <p className="text-[#A0AEC0]">
                We couldn't find any titles in this category. Try another genre or check back later.
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

function MovieCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-[rgba(26,32,55,0.8)] backdrop-blur-md border border-[rgba(255,255,255,0.05)]">
      <div className="relative aspect-[2/3]">
        <Skeleton className="w-full h-full" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-10" />
          </div>
        </div>
      </div>
      <div className="p-4">
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-4 w-2/3 mb-4" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
}
