import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import FeaturedSection from "@/components/FeaturedSection";
import MovieCard from "@/components/MovieCard";
import GenreCard, { GenreCardSkeleton } from "@/components/GenreCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getGenreImages } from "@/lib/utils";
import { Movie } from "@/types/movie";
import { ChevronRight } from "lucide-react";
import { mapMovieData } from "@/lib/utils";

export default function HomePage() {
  // Fetch trending movies
  const { data: trendingMoviesData, isLoading: isLoadingTrending } = useQuery<{ results: any[] }>({
    queryKey: ['/api/movies/trending'],
  });

  // Fetch recommended movies (based on user's preferences)
  const { data: recommendedData, isLoading: isLoadingRecommended } = useQuery<{ results: any[] }>({
    queryKey: ['/api/recommendations'],
  });

  // Fetch movie genres
  const { data: genresData, isLoading: isLoadingGenres } = useQuery<{ genres: any[] }>({
    queryKey: ['/api/genres/movie'],
  });

  // Fetch user favorites to mark favorite movies
  const { data: favorites } = useQuery<any[]>({
    queryKey: ['/api/favorites'],
  });

  // Create a genre map for quick lookups
  const genreMap: Record<number, string> = {};
  if (genresData?.genres) {
    genresData.genres.forEach(genre => {
      genreMap[genre.id] = genre.name;
    });
  }

  // Map trending movies data to our Movie type
  const trendingMovies: Movie[] = trendingMoviesData?.results
    ? trendingMoviesData.results.slice(0, 4).map(movie => 
        mapMovieData(movie, favorites, 'movie', genreMap)
      )
    : [];

  // Map recommended movies data to our Movie type
  const recommendedMovies: Movie[] = recommendedData?.results
    ? recommendedData.results.slice(0, 4).map(movie => 
        mapMovieData(movie, favorites, movie.media_type || 'movie', genreMap)
      )
    : [];

  // Prepare genre cards data
  const genreCards = genresData?.genres
    ? genresData.genres.slice(0, 4).map(genre => ({
        id: genre.id,
        name: genre.name,
        // Simulate count based on genre id
        count: 50 + Math.floor(Math.random() * 150),
        imageUrl: getGenreImages(genre.name),
        mediaType: 'movie' as const,
      }))
    : [];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0f1535]">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-8">
        <Header 
          title="Dashboard" 
          subtitle="Discover movies and shows tailored to your taste" 
        />
        
        <FeaturedSection />
        
        {/* Recommended Section */}
        <section className="mb-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Recommended For You</h2>
            <Link href="/recommendations" className="text-primary hover:text-blue-400 flex items-center text-sm font-medium">
              View All <ChevronRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {isLoadingRecommended
              ? Array(4).fill(null).map((_, i) => (
                  <MovieCardSkeleton key={i} />
                ))
              : recommendedMovies.length > 0
                ? recommendedMovies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))
                : trendingMovies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))
            }
          </div>
        </section>
        
        {/* Popular Genres Section */}
        <section className="mb-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Popular Genres</h2>
            <Link href="/genres" className="text-primary hover:text-blue-400 flex items-center text-sm font-medium">
              Browse All <ChevronRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isLoadingGenres
              ? Array(4).fill(null).map((_, i) => (
                  <GenreCardSkeleton key={i} />
                ))
              : genreCards.map((genre) => (
                  <GenreCard
                    key={genre.id}
                    id={genre.id}
                    name={genre.name}
                    count={genre.count}
                    imageUrl={genre.imageUrl}
                    mediaType={genre.mediaType}
                  />
                ))
            }
          </div>
        </section>
        
        {/* Trending Section */}
        <section className="mb-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Trending Now</h2>
            <Link href="/trending" className="text-primary hover:text-blue-400 flex items-center text-sm font-medium">
              View All <ChevronRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {isLoadingTrending
              ? Array(4).fill(null).map((_, i) => (
                  <MovieCardSkeleton key={i} />
                ))
              : trendingMovies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} isTrending={true} />
                ))
            }
          </div>
        </section>
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
