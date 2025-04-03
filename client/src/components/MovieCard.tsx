import { Link } from "wouter";
import { Movie } from "../types/movie";
import PlatformBadge from "./PlatformBadge";
import { ExternalLink, Heart, Plus, Star, Calendar } from "lucide-react";
import { Button } from "./ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";

interface MovieCardProps {
  movie: Movie;
  isTrending?: boolean;
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

export default function MovieCard({ movie, isTrending = false }: MovieCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [imageKey, setImageKey] = useState(generateRandomString());
  
  // Update imageKey when movie ID or poster path changes
  useEffect(() => {
    setImageKey(generateRandomString());
  }, [movie.id, movie.poster_path]);
  
  // Format release date
  const releaseDate = movie.release_date 
    ? new Date(movie.release_date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    : 'Release date unknown';
  
  // Format genres
  const genres = movie.genres?.join(', ') || 'Genre unknown';
  
  // Format rating
  const rating = movie.vote_average 
    ? movie.vote_average.toFixed(1) 
    : 'N/A';
  
  // Get poster URL with cache busting
  const posterUrl = movie.poster_path 
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}?v=${imageKey}`
    : '/placeholder-poster.jpg';
  
  // Map providers to their icons
  const providers = movie.providers || [];
  
  const toggleFavorite = useMutation({
    mutationFn: async () => {
      // Check if already in favorites (would require an API endpoint to check)
      try {
        await apiRequest("POST", "/api/favorites", { 
          tmdbId: movie.id,
          mediaType: movie.mediaType
        });
        return true;
      } catch (error) {
        if (error instanceof Error && error.message.includes("400")) {
          // If already in favorites, remove it
          await apiRequest("DELETE", `/api/favorites/${movie.id}`);
          return false;
        }
        throw error;
      }
    },
    onSuccess: (added) => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: added ? "Added to favorites" : "Removed from favorites",
        description: added ? "Movie added to your favorites" : "Movie removed from your favorites",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="rounded-xl overflow-hidden bg-[rgba(26,32,55,0.8)] backdrop-blur-md border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.2)] transition-all duration-300 group">
      <Link to={`/${movie.mediaType}/${movie.id}`} className="block">
        <div className="relative aspect-[2/3]">
          <img 
            src={posterUrl} 
            alt={movie.title} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="eager"
            decoding="async"
            key={`${movie.id}-${imageKey}`}
          />
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-white bg-[rgba(0,0,0,0.5)] px-2 py-1 rounded">
                {movie.mediaType === 'movie' ? 'Movie' : 'TV Show'}
              </span>
              {movie.isFavorite && (
                <span className="text-xs font-medium text-white bg-[rgba(0,0,0,0.5)] px-2 py-1 rounded flex items-center gap-1">
                  <Heart className="h-3 w-3 text-red-500" />
                  Favorite
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">{movie.title}</h3>
          <p className="text-sm text-[#A0AEC0] mb-3 line-clamp-2">{movie.overview}</p>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1 text-sm text-[#A0AEC0]">
              <Calendar className="h-4 w-4" />
              <span>{releaseDate}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-[#A0AEC0]">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>{rating}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
