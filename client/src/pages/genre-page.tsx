import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MovieCard from "@/components/MovieCard";
import { Skeleton } from "@/components/ui/skeleton";
import { mapMovieData } from "@/lib/utils";
import { Movie } from "@/types/movie";

export default function GenrePage() {
  // Get genre ID and media type from URL
  const [match, params] = useRoute('/genre/:id');
  const genreId = params?.id;
  const searchParams = new URLSearchParams(window.location.search);
  const mediaType = searchParams.get('mediaType') || 'movie';
  
  // Fetch genre details
  const { data: genresData } = useQuery<{ genres: any[] }>({
    queryKey: [`/api/genres/${mediaType}`],
  });
  
  // Find the current genre
  const currentGenre = genresData?.genres?.find(g => g.id.toString() === genreId);
  
  // Fetch movies/shows of this genre
  const { data: discoverData, isLoading } = useQuery<{ results: any[] }>({
    queryKey: [`/api/discover/${mediaType}`, { with_genres: genreId }],
  });
  
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
              : movies.length > 0 
                ? `Found ${movies.length} titles in this category` 
                : 'No titles found in this category'
            }
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {isLoading ? (
            // Show skeletons while loading
            Array(12).fill(null).map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))
          ) : movies.length > 0 ? (
            // Show movies if available
            movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
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
