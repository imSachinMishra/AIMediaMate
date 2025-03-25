
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
import MovieCardSkeleton from "@/components/MovieCardSkeleton";

export default function RecommendationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [activeTab, setActiveTab] = useState("ai");
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

  // Fetch user favorites
  const { data: favorites = [] } = useQuery<any[]>({
    queryKey: ['/api/favorites'],
  });

  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<(Movie & { ai_reason?: string })[]>([]);

  // AI recommendation mutation
  const aiRecommendMutation = useMutation({
    mutationFn: async (description: string) => {
      const response = await apiRequest("POST", "/api/ai-recommendations", { description });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.results && data.results.length > 0) {
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
        description: "Failed to get AI recommendations. Please try again.",
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
    if (recommendedMovies?.results && genreMap && favorites) {
      const movies = recommendedMovies.results.map((movie: any) => {
        const mediaType = movie.media_type || (movie.first_air_date ? 'tv' : 'movie');
        return mapMovieData(movie, favorites, mediaType, genreMap);
      });
      setRecommendations(movies);
    }
  }, [recommendedMovies?.results, favorites, genreMap]);

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
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="algo">Algorithm-based</TabsTrigger>
                <TabsTrigger value="ai">AI-powered</TabsTrigger>
              </TabsList>

              <TabsContent value="algo">
                <div className="flex flex-col space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personalized Recommendations</CardTitle>
                      <CardDescription>
                        Based on your viewing history and preferences
                      </CardDescription>
                    </CardHeader>
                  </Card>
                  
                  {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {[...Array(10)].map((_, i) => (
                        <MovieCardSkeleton key={i} />
                      ))}
                    </div>
                  ) : recommendations.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {recommendations.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No recommendations yet</h3>
                      <p className="text-muted-foreground">
                        Add some movies to your favorites to get personalized recommendations
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="ai">
                <div className="flex flex-col space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>AI Movie Finder</CardTitle>
                          <CardDescription>
                            Describe what you're looking for and let AI find matches
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Describe the type of movie you want..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="min-w-[300px]"
                            onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                          />
                          <Button onClick={handleAiSearch} disabled={isSearching}>
                            {isSearching ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Searching...
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Find Movies
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {isSearching ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
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
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
