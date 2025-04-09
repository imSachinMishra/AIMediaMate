import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MovieCard from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { mapMovieData } from "@/lib/utils";
import { Movie } from "@/types/movie";
import { Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";

export default function SearchPage() {
  // Get search query from URL
  const searchParams = new URLSearchParams(window.location.search);
  const query = searchParams.get('q') || '';
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  
  // Fetch search results
  const { data: searchData, isLoading, error } = useQuery<{ results: any[] }>({
    queryKey: [`/api/search/multi`, { query }],
    queryFn: async () => {
      if (!query) return { results: [] };
      console.log(`[DEBUG] Searching for: "${query}"`);
      try {
        const response = await apiRequest('GET', `/api/search/multi?query=${encodeURIComponent(query)}`);
        console.log(`[DEBUG] Search response:`, {
          status: response.status,
          statusText: response.statusText,
          totalResults: response.data.total_results,
          totalPages: response.data.total_pages,
          resultsCount: response.data.results?.length || 0
        });
        return response.data;
      } catch (error) {
        console.error('[ERROR] Search failed:', error);
        throw error;
      }
    },
    enabled: !!query,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
    gcTime: 0,
  });
  
  // Fetch user favorites to mark favorite movies
  const { data: favorites } = useQuery<any[]>({
    queryKey: ['/api/favorites'],
  });
  
  // Update search results when data changes
  useEffect(() => {
    if (searchData?.results) {
      const mappedResults = searchData.results.map(item => {
        const mediaType = item.media_type === 'movie' || item.media_type === 'tv' 
          ? item.media_type 
          : 'movie';
        return mapMovieData(item, favorites, mediaType);
      });
      setSearchResults(mappedResults);
    } else {
      setSearchResults([]);
    }
  }, [searchData, favorites]);
  
  // Show error message if search failed
  if (error) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row bg-[#0f1535]">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8">
          <Header 
            title="Search Error" 
            subtitle="An error occurred while searching" 
          />
          <div className="col-span-full text-center py-12">
            <Info className="mx-auto w-16 h-16 text-[#A0AEC0] mb-3" />
            <h3 className="text-xl text-white font-medium mb-2">Search Failed</h3>
            <p className="text-[#A0AEC0]">
              We encountered an error while searching for "{query}".<br />
              Please try again later.
            </p>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0f1535]">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-8">
        <Header 
          title="Search Results" 
          subtitle={query ? `Results for "${query}"` : "Enter a search term"} 
        />
        
        <div className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {isLoading ? (
              // Show skeletons while loading
              Array(8).fill(null).map((_, i) => (
                <MovieCardSkeleton key={i} />
              ))
            ) : searchResults.length > 0 ? (
              // Show search results
              searchResults.map(movie => (
                <MovieCard 
                  key={`${movie.id}-${movie.mediaType}`} 
                  movie={movie}
                />
              ))
            ) : query ? (
              // Show message if no results
              <div className="col-span-full text-center py-12">
                <Info className="mx-auto w-16 h-16 text-[#A0AEC0] mb-3" />
                <h3 className="text-xl text-white font-medium mb-2">No results found</h3>
                <p className="text-[#A0AEC0]">
                  We couldn't find any movies or TV shows matching "{query}".<br />
                  Try a different search term.
                </p>
              </div>
            ) : (
              // Show initial state
              <div className="col-span-full text-center py-12">
                <Info className="mx-auto w-16 h-16 text-[#A0AEC0] mb-3" />
                <h3 className="text-xl text-white font-medium mb-2">Search for movies and TV shows</h3>
                <p className="text-[#A0AEC0]">
                  Use the search bar to find your favorite movies and TV shows.
                </p>
              </div>
            )}
          </div>
        </div>
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