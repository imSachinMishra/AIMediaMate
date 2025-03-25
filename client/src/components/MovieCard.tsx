import { Link } from "wouter";
import { Movie } from "../types/movie";
import PlatformBadge from "./PlatformBadge";
import { ExternalLink, Heart, Plus, Star } from "lucide-react";
import { Button } from "./ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface MovieCardProps {
  movie: Movie;
  isTrending?: boolean;
}

export default function MovieCard({ movie, isTrending = false }: MovieCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
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
    <div className="movie-card rounded-xl overflow-hidden bg-[rgba(26,32,55,0.8)] backdrop-blur-md border border-[rgba(255,255,255,0.05)] transition-all duration-300 hover:translate-y-[-5px] hover:shadow-[0_8px_26px_rgba(0,0,0,0.4)]">
      <div className="relative aspect-[2/3]">
        <img 
          src={movie.poster_path 
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : `https://via.placeholder.com/500x750?text=No+Poster`
          } 
          alt={movie.title || movie.name} 
          className="w-full h-full object-cover"
        />
        
        {providers.length > 0 && (
          <div className="absolute top-2 right-2 platform-badges flex space-x-1">
            {providers.map((provider, idx) => (
              <PlatformBadge key={idx} provider={provider} />
            ))}
          </div>
        )}
        
        {isTrending && (
          <div className="absolute top-2 left-2">
            <span className="bg-primary text-white text-xs px-2 py-1 rounded-md font-medium">Trending</span>
          </div>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[#0f1535] to-transparent">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Star className="w-4 h-4 text-yellow-400 mr-1" />
              <span className="text-white text-sm font-medium">
                {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
              </span>
            </div>
            <div className="text-xs text-white bg-[rgba(15,21,53,0.6)] px-2 py-1 rounded">
              {movie.release_date 
                ? new Date(movie.release_date).getFullYear() 
                : movie.first_air_date 
                  ? new Date(movie.first_air_date).getFullYear()
                  : 'N/A'
              }
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="text-white font-semibold text-lg mb-1 truncate">
          {movie.title || movie.name}
        </h3>
        <p className="text-[#A0AEC0] text-sm mb-3 truncate">
          {movie.genres?.map(g => g.name).join(', ') || 'Unknown genre'}
        </p>
        
        <div className="flex justify-between items-center">
          <Link 
            href={`/${movie.mediaType}/${movie.id}`}
            className="text-primary hover:text-blue-400 text-sm font-medium flex items-center"
          >
            <ExternalLink className="w-4 h-4 mr-1" /> Details
          </Link>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="text-[#A0AEC0] hover:text-white text-sm p-0"
            onClick={() => toggleFavorite.mutate()}
            disabled={!user || toggleFavorite.isPending}
          >
            <Heart className={`w-4 h-4 mr-1 ${movie.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            {movie.isFavorite ? 'Saved' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
