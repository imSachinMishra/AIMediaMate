import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Info, Play } from "lucide-react";
import { Movie } from "@/types";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface MovieCardProps {
  movie: Movie;
}

export function MovieCard({ movie }: MovieCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Function to determine if a movie is from a specific region
  const getRegionBadge = (title: string, overview: string) => {
    const text = (title + " " + overview).toLowerCase();
    
    if (text.includes("bollywood") || text.includes("india") || text.includes("hindi")) {
      return { label: "Bollywood", color: "bg-orange-500" };
    } else if (text.includes("korean") || text.includes("korea") || text.includes("k-drama")) {
      return { label: "Korean", color: "bg-blue-500" };
    } else if (text.includes("french") || text.includes("france")) {
      return { label: "French", color: "bg-red-500" };
    } else if (text.includes("japanese") || text.includes("japan") || text.includes("anime")) {
      return { label: "Japanese", color: "bg-red-600" };
    } else if (text.includes("chinese") || text.includes("china") || text.includes("mandarin")) {
      return { label: "Chinese", color: "bg-red-700" };
    } else if (text.includes("spanish") || text.includes("spain") || text.includes("mexico")) {
      return { label: "Spanish", color: "bg-yellow-500" };
    } else if (text.includes("italian") || text.includes("italy")) {
      return { label: "Italian", color: "bg-green-500" };
    } else if (text.includes("german") || text.includes("germany")) {
      return { label: "German", color: "bg-gray-500" };
    } else if (text.includes("british") || text.includes("uk") || text.includes("england")) {
      return { label: "British", color: "bg-blue-600" };
    }
    
    return null;
  };
  
  const regionBadge = getRegionBadge(movie.title, movie.overview);
  
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[2/3]">
        <img
          src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '/placeholder-movie.jpg'}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-lg font-semibold text-white">{movie.title}</h3>
          {regionBadge && (
            <Badge className={`${regionBadge.color} text-white mt-1`}>
              {regionBadge.label}
            </Badge>
          )}
        </div>
      </div>
      
      <CardContent className="p-4">
        <p className="text-sm text-gray-600 line-clamp-2">{movie.overview}</p>
        
        {movie.aiReason && (
          <div className="mt-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start text-left">
                  <Info className="h-4 w-4 mr-2" />
                  <span className="truncate">Why this recommendation?</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>AI Recommendation Reason</DialogTitle>
                  <DialogDescription>
                    {movie.aiReason}
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsFavorite(!isFavorite)}
          className={isFavorite ? "text-red-500" : ""}
        >
          <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
        </Button>
        
        <Button variant="default" size="sm">
          <Play className="h-4 w-4 mr-2" />
          Watch
        </Button>
      </CardFooter>
    </Card>
  );
} 