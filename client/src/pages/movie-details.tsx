import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import PlatformBadge from "@/components/PlatformBadge";
import { Button } from "@/components/ui/button";
import { 
  Clock, ExternalLink, Heart, Info, Play, Plus, Star, Calendar 
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import MovieCard from "@/components/MovieCard";
import { mapMovieData } from "@/lib/utils";
import { Movie } from "@/types/movie";

interface MovieDetails {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  tagline?: string;
  genres?: Array<{ id: number; name: string }>;
  vote_average?: number;
  vote_count?: number;
  release_date?: string;
  first_air_date?: string;
  'watch/providers'?: {
    results?: {
      US?: {
        flatrate?: any[];
      };
    };
  };
  overview?: string;
  runtime?: number;
  homepage?: string;
}

interface SimilarResults {
  results: any[];
}

export default function MovieDetails() {
  // Get movie/tv ID from URL
  const [matchMovie, movieParams] = useRoute('/movie/:id');
  const [matchTV, tvParams] = useRoute('/tv/:id');
  
  const id = movieParams?.id || tvParams?.id;
  const mediaType = matchMovie ? 'movie' : 'tv';
  
  if (!id) {
    return <div>No ID provided</div>;
  }

  const numericId = parseInt(id);
  if (isNaN(numericId)) {
    return <div>Invalid ID provided</div>;
  }

  const { toast } = useToast();
  const { user } = useAuth();
  
  // Fetch movie/TV details
  const { data: details, isLoading } = useQuery<MovieDetails>({
    queryKey: [`/api/${mediaType}/${numericId}`] as const,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  
  // Fetch similar titles
  const { data: similarData, isLoading: isLoadingSimilar } = useQuery<SimilarResults>({
    queryKey: [`/api/${mediaType}/${numericId}/similar`] as const,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled: !!numericId,
  });
  
  // Fetch user favorites to check if this item is a favorite
  const { data: favorites } = useQuery<any[]>({
    queryKey: ['/api/favorites'] as const,
  });
  
  // Check if this movie/show is a favorite
  const isFavorite = favorites?.some(
    fav => fav.tmdbId === numericId && fav.mediaType === mediaType
  );
  
  // Get providers (streaming platforms)
  const providers = details?.['watch/providers']?.results?.US?.flatrate || [];
  
  // Toggle favorite status
  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        await apiRequest("DELETE", `/api/favorites/${numericId}`);
        return false;
      } else {
        await apiRequest("POST", "/api/favorites", { 
          tmdbId: numericId,
          mediaType
        });
        return true;
      }
    },
    onSuccess: (added) => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] as const });
      toast({
        title: added ? 'Added to favorites' : 'Removed from favorites',
        description: added 
          ? `${details?.title || details?.name} added to your favorites` 
          : `${details?.title || details?.name} removed from your favorites`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update favorites',
        variant: 'destructive',
      });
    },
  });
  
  // Map similar titles to our Movie type
  const similarTitles: Movie[] = similarData?.results
    ? similarData.results.slice(0, 4).map(item => 
        mapMovieData(item, favorites || [], mediaType as 'movie' | 'tv')
      )
    : [];
  
  // Handle watch now button click - would redirect to the streaming service
  const handleWatchNow = () => {
    if (providers && providers.length > 0) {
      // Get the first provider and open in new tab
      window.open(`https://www.google.com/search?q=Watch+${encodeURIComponent(details?.title || details?.name)}+on+${providers[0].provider_name}`, '_blank');
    } else {
      toast({
        title: 'No streaming services available',
        description: 'This title is not currently available on any streaming platform',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0f1535]">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-8">
        <Header 
          title={details?.title || details?.name || 'Loading...'}
          subtitle={details?.tagline || (mediaType === 'movie' ? 'Movie details' : 'TV Series details')}
        />
        
        {isLoading ? (
          <DetailsSkeleton />
        ) : (
          <>
            <div className="mb-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Poster */}
                <div className="md:col-span-1">
                  <div className="rounded-xl overflow-hidden">
                    <img 
                      src={details?.poster_path 
                        ? `https://image.tmdb.org/t/p/w500${details.poster_path}?v=${Date.now()}`
                        : `https://via.placeholder.com/500x750?text=No+Poster`
                      } 
                      alt={details?.title || details?.name}
                      className="w-full object-cover"
                      key={`${details?.id}-${Date.now()}`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (details?.poster_path) {
                          target.src = `https://image.tmdb.org/t/p/w500${details.poster_path}?v=${Date.now()}`;
                        }
                      }}
                    />
                  </div>
                </div>
                
                {/* Details */}
                <div className="md:col-span-2">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {details?.genres?.map((genre: any) => (
                      <span 
                        key={genre.id}
                        className="px-3 py-1 bg-[rgba(15,21,53,0.6)] text-white text-xs rounded-md"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                  
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                    {details?.title || details?.name}
                  </h1>
                  
                  {details?.tagline && (
                    <p className="text-[#A0AEC0] italic mb-4">{details.tagline}</p>
                  )}
                  
                  <div className="flex items-center gap-6 mb-6">
                    <div className="flex items-center">
                      <Star className="text-yellow-400 mr-1 w-5 h-5" />
                      <span className="text-white font-semibold">
                        {details?.vote_average?.toFixed(1)} 
                        <span className="text-[#A0AEC0] font-normal">
                          /10 ({details?.vote_count?.toLocaleString()} votes)
                        </span>
                      </span>
                    </div>
                    
                    <div className="flex items-center">
                      <Calendar className="text-[#A0AEC0] mr-1 w-5 h-5" />
                      <span className="text-white">
                        {details?.release_date 
                          ? new Date(details.release_date).getFullYear()
                          : details?.first_air_date
                            ? new Date(details.first_air_date).getFullYear()
                            : 'N/A'
                        }
                      </span>
                    </div>
                    
                    {mediaType === 'movie' && details?.runtime && (
                      <div className="flex items-center">
                        <Clock className="text-[#A0AEC0] mr-1 w-5 h-5" />
                        <span className="text-white">
                          {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-white mb-6">
                    {details?.overview || 'No overview available.'}
                  </p>
                  
                  {providers.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-white font-semibold mb-2">Available on:</h3>
                      <div className="flex gap-2">
                        {/* Filter out duplicate providers by ID */}
                        {providers
                          .filter((provider: any, index: number, self: any[]) => 
                            index === self.findIndex((p) => p.provider_id === provider.provider_id)
                          )
                          .map((provider: any, idx: number) => (
                            <PlatformBadge key={idx} provider={provider} />
                          ))
                        }
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-4">                    
                    <Button 
                      variant="secondary"
                      onClick={() => toggleFavorite.mutate()}
                      disabled={!user || toggleFavorite.isPending}
                    >
                      <Heart className={`mr-2 w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                      {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                    </Button>
                    
                    <Button 
                      variant="secondary"
                      onClick={() => {
                        toast({
                          title: "Coming Soon",
                          description: "Watchlist feature will be available in the next update",
                        });
                      }}
                    >
                      <Plus className="mr-2 w-4 h-4" /> Add to Watchlist
                    </Button>
                    
                    <Button 
                      variant="secondary"
                      onClick={() => details?.homepage && window.open(details.homepage, '_blank')}
                      disabled={!details?.homepage}
                    >
                      <ExternalLink className="mr-2 w-4 h-4" /> Visit Website
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Similar Titles Section */}
            <section className="mb-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">
                  {mediaType === 'movie' ? 'Similar Movies' : 'Similar Series'}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoadingSimilar ? (
                  Array(4).fill(null).map((_, i) => (
                    <MovieCardSkeleton key={i} />
                  ))
                ) : similarTitles.length > 0 ? (
                  similarTitles.map((item) => (
                    <MovieCard key={item.id} movie={item} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <Info className="mx-auto w-12 h-12 text-[#A0AEC0] mb-2" />
                    <h3 className="text-white font-medium mb-1">No similar titles found</h3>
                    <p className="text-[#A0AEC0]">We couldn't find any similar titles at the moment.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="mb-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Skeleton className="w-full aspect-[2/3] rounded-xl" />
        </div>
        
        <div className="md:col-span-2">
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
          
          <Skeleton className="h-10 w-3/4 mb-2" />
          <Skeleton className="h-6 w-1/2 mb-4" />
          
          <div className="flex gap-6 mb-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>
          
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-6" />
          
          <div className="mb-6">
            <Skeleton className="h-6 w-32 mb-2" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
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
