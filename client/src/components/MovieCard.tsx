import { Link } from "wouter";
import { Movie } from "../types/movie";
import PlatformBadge from "./PlatformBadge";
import { ExternalLink, Heart, Plus, Star, Calendar, HeartOff } from "lucide-react";
import { Button } from "./ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { TMDB_IMAGE_BASE_URL } from "@/lib/tmdb";
import { formatDate, formatGenres, formatRating } from "@/lib/utils";
import DefaultPoster from "./DefaultPoster";

interface MovieCardProps {
  movie: Movie;
  isTrending?: boolean;
  timestamp?: string;
}

export default function MovieCard({ movie, isTrending = false, timestamp }: MovieCardProps) {
  const { toast: useToastToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [imageError, setImageError] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Reset image error state when movie changes
  useEffect(() => {
    setImageError(false);
    if (imageRef.current) {
      imageRef.current.src = movie.poster_path 
        ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
        : '';
    }
  }, [movie.id, movie.mediaType, movie.poster_path]);
  
  const formattedDate = formatDate(movie.release_date);
  const formattedGenres = formatGenres(movie.genres);
  const formattedRating = formatRating(movie.vote_average);
  
  const addToFavoritesMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/favorites", { 
        tmdbId: Number(movie.id),
        mediaType: movie.mediaType
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast.success("Added to favorites", {
        description: "Movie added to your favorites",
      });
    },
    onError: () => {
      toast.error("Error", {
        description: "Failed to add to favorites",
      });
    },
  });

  const removeFromFavoritesMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/favorites/${movie.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites/details"] });
      toast.success("Removed from favorites", {
        description: "Movie removed from your favorites",
      });
    },
    onError: () => {
      toast.error("Error", {
        description: "Failed to remove from favorites",
      });
    },
  });

  const handleToggleFavorite = () => {
    if (movie.isFavorite) {
      removeFromFavoritesMutation.mutate();
    } else {
      addToFavoritesMutation.mutate();
    }
  };

  // Map providers to their icons
  const providers = movie.providers || [];
  
  return (
    <div className="group relative overflow-hidden rounded-lg bg-card transition-all hover:shadow-lg">
      <Link to={`/${movie.mediaType}/${movie.id}`} className="block">
        <div className="aspect-[2/3] w-full overflow-hidden">
          {movie.poster_path && !imageError ? (
            <img 
              ref={imageRef}
              src={`${TMDB_IMAGE_BASE_URL}${movie.poster_path}`}
              alt={movie.title} 
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="eager"
              decoding="async"
              onError={() => setImageError(true)}
            />
          ) : (
            <DefaultPoster movie={movie} />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-lg font-semibold text-white">{movie.title}</h3>
            <p className="mt-1 text-sm text-gray-300 line-clamp-2">
              {movie.overview}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {formattedGenres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full bg-primary/20 px-2 py-1 text-xs text-primary"
                >
                  {genre}
                </span>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-gray-300">{formattedDate}</span>
              <span className="rounded-full bg-primary/20 px-2 py-1 text-xs text-primary">
                {formattedRating}
              </span>
            </div>
          </div>
        </div>
      </Link>
      <button
        onClick={handleToggleFavorite}
        className="absolute right-2 top-2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
      >
        {movie.isFavorite ? (
          <HeartOff className="h-5 w-5 text-red-500" />
        ) : (
          <Heart className="h-5 w-5" />
        )}
      </button>
      {movie.isFavorite && (
        <div className="absolute left-2 top-2 rounded-full bg-primary px-2 py-1 text-xs text-white">
          Favorite
        </div>
      )}
    </div>
  );
}
