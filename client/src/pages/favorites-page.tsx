import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import MovieCard from "@/components/MovieCard";
import { Movie } from "@/types/movie";
import { Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

export default function FavoritesPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Movie[]>([]);

  // Fetch favorites
  const { data: favoriteIds, isLoading: isLoadingFavorites } = useQuery<any[]>({
    queryKey: ["/api/favorites"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  // Fetch movie details for each favorite
  const { data: favoriteMovies, isLoading: isLoadingMovies } = useQuery<any[]>({
    queryKey: ["/api/favorites/details"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!favoriteIds && favoriteIds.length > 0,
  });

  useEffect(() => {
    if (favoriteMovies && Array.isArray(favoriteMovies)) {
      setFavorites(favoriteMovies);
    }
  }, [favoriteMovies]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container px-4 py-6 md:px-6 md:py-8">
          <Header title="My Favorites" subtitle="Your saved movies and TV shows" />

          {(isLoadingFavorites || isLoadingMovies) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-8">
              {[...Array(10)].map((_, i) => (
                <MovieCardSkeleton key={i} />
              ))}
            </div>
          ) : favorites && favorites.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-8">
              {favorites.map((movie) => (
                <MovieCard key={movie.id} movie={{...movie, isFavorite: true}} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <h3 className="text-2xl font-semibold mb-2">No favorites yet</h3>
              <p className="text-muted-foreground mb-6">
                Start adding movies and TV shows to your favorites list
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MovieCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg overflow-hidden bg-card animate-pulse">
      <div className="aspect-[2/3] bg-muted"></div>
      <div className="p-3 space-y-2">
        <div className="h-4 bg-muted rounded"></div>
        <div className="h-3 bg-muted rounded w-2/3"></div>
      </div>
    </div>
  );
}