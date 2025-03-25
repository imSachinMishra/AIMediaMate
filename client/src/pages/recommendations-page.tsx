import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import MovieCard from "@/components/MovieCard";
import { Movie } from "@/types/movie";
import { Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

export default function RecommendationsPage() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Movie[]>([]);

  // Fetch recommendations
  const { data: recommendedMovies, isLoading } = useQuery({
    queryKey: ["/api/recommendations"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  useEffect(() => {
    if (recommendedMovies) {
      setRecommendations(recommendedMovies);
    }
  }, [recommendedMovies]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container px-4 py-6 md:px-6 md:py-8">
          <Header 
            title="AI-Powered Recommendations" 
            subtitle="Personalized content based on your viewing preferences"
          />

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
              <h3 className="text-2xl font-semibold mb-2">Building your recommendations</h3>
              <p className="text-muted-foreground mb-6">
                Keep exploring and favoriting content to improve your recommendations
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