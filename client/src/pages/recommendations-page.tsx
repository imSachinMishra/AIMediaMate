import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import MovieCard from "@/components/MovieCard";
import { Movie } from "@/types/movie";
import { Info, Loader2, SearchIcon, Sparkles, X } from "lucide-react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mapMovieData } from "@/lib/utils";

export default function RecommendationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<(Movie & { ai_reason?: string })[]>([]);
  const [description, setDescription] = useState("");
  const [activeTab, setActiveTab] = useState("ai");  // Start with AI tab active
  const [isSearching, setIsSearching] = useState(false);

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

  // Fetch algorithm-based recommendations
  const { data: recommendedMovies, isLoading } = useQuery<any>({
    queryKey: ["/api/recommendations"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  // Fetch user favorites to mark favorite movies
  const { data: favorites } = useQuery<any[]>({
    queryKey: ['/api/favorites'],
  });

  // AI recommendation mutation
  const aiRecommendMutation = useMutation({
    mutationFn: async (description: string) => {
      const response = await apiRequest("POST", "/api/ai-recommendations", { description });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.results && data.results.length > 0) {
        // Process AI recommendations with proper genre mapping
        const movies = data.results.map((movie: any) => {
          const mediaType = movie.media_type || (movie.first_air_date ? 'tv' : 'movie');
          const mappedMovie = mapMovieData(movie, favorites, mediaType, genreMap);
          return {
            ...mappedMovie,
            ai_reason: movie.ai_reason
          };
        });
        setAiRecommendations(movies);
        setActiveTab("ai");
        setIsSearching(false);
        
        toast({
          title: "AI Recommendations Ready",
          description: `Found ${movies.length} movies matching your description`,
        });
      } else {
        toast({
          title: "No recommendations found",
          description: "Try a different description or be more specific",
          variant: "destructive",
        });
        setIsSearching(false);
      }
    },
    onError: (error) => {
      console.error("Error getting AI recommendations:", error);
      toast({
        title: "Error",
        description: "Failed to get AI recommendations. Please check if the OpenAI API key is valid.",
        variant: "destructive",
      });
      setIsSearching(false);
    }
  });

  // Handle AI recommendation search
  const handleAiSearch = () => {
    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please enter a description of what you're looking for",
        variant: "destructive",
      });
      return;
    }
    
    setIsSearching(true);
    aiRecommendMutation.mutate(description);
  };

  useEffect(() => {
    if (recommendedMovies && recommendedMovies.results) {
      const movies = recommendedMovies.results.map((movie: any) => {
        const mediaType = movie.media_type || (movie.first_air_date ? 'tv' : 'movie');
        return mapMovieData(movie, favorites, mediaType, genreMap);
      });
      setRecommendations(movies);
    }
  }, [recommendedMovies, favorites, genreMap]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container px-4 py-6 md:px-6 md:py-8">
          <Header 
            title="AI-Powered Recommendations" 
            subtitle="Discover content based on your preferences or AI descriptions"
          />

          <div className="mb-8 mt-6">
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="algo">Algorithm-based</TabsTrigger>
                <TabsTrigger value="ai">AI-powered</TabsTrigger>
              </TabsList>

              <TabsContent value="algo" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Algorithm Recommendations</CardTitle>
                    <CardDescription>
                      Based on your favorites and viewing history
                    </CardDescription>
                  </CardHeader>
                </Card>

                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-8">
                    {[...Array(10)].map((_, i) => (
                      <MovieCardSkeleton key={i} />
                    ))}
                  </div>
                ) : recommendations && recommendations.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-8">
                    {recommendations.map((movie) => (
                      <MovieCard key={movie.id} movie={movie} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-2xl font-semibold mb-2">Building your recommendations</h3>
                    <p className="text-muted-foreground mb-6">
                      Keep exploring and favoriting content to improve your recommendations
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ai" className="space-y-4">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle>AI Recommendations</CardTitle>
                    <CardDescription>
                      Describe what you're looking for and our AI will find matches
                    </CardDescription>
                    
                    <div className="flex gap-2 mt-4">
                      <div className="relative flex-1">
                        <Input
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="e.g., Science fiction movies with time travel themes..."
                          className="pr-8"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAiSearch();
                            }
                          }}
                        />
                        {description && (
                          <button 
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setDescription('')}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <Button 
                        onClick={handleAiSearch} 
                        disabled={isSearching || !description.trim()}
                      >
                        {isSearching ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Find Matches
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                {isSearching ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-8">
                    {[...Array(5)].map((_, i) => (
                      <MovieCardSkeleton key={i} />
                    ))}
                  </div>
                ) : aiRecommendations && aiRecommendations.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
                    {aiRecommendations.map((movie) => (
                      <div key={movie.id} className="flex flex-col h-full">
                        <MovieCard movie={movie} />
                        {movie.ai_reason && (
                          <div className="mt-2 p-3 bg-[rgba(15,21,53,0.7)] backdrop-blur-sm rounded-md text-sm">
                            <p className="text-white"><span className="font-semibold">Why:</span> {movie.ai_reason}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Describe what you're looking for</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Enter a description of your ideal movie or TV show, and our AI will find the best matches for you.
                      <br /><br />
                      Try describing genres, themes, plot elements, or the mood you're looking for.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
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