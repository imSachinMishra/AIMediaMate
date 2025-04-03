import { Movie } from "../types/movie";

interface DefaultPosterProps {
  movie: Movie;
}

export default function DefaultPoster({ movie }: DefaultPosterProps) {
  // Get the first genre name or use "Movie" as fallback
  const genre = movie.genres?.[0]?.name || "Movie";
  
  // Get the first letter of the title for the avatar
  const firstLetter = movie.title?.[0]?.toUpperCase() || "M";
  
  // Generate a consistent background color based on the title
  const getBackgroundColor = () => {
    const colors = [
      "bg-blue-600",
      "bg-purple-600",
      "bg-red-600",
      "bg-green-600",
      "bg-yellow-600",
      "bg-pink-600",
      "bg-indigo-600",
      "bg-teal-600",
    ];
    
    // Use the title to generate a consistent index
    const index = movie.title
      ? movie.title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
      : 0;
    
    return colors[index];
  };

  return (
    <div className={`relative w-full h-full ${getBackgroundColor()} flex flex-col items-center justify-center p-4 text-white`}>
      <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4">
        <span className="text-2xl font-bold">{firstLetter}</span>
      </div>
      <h3 className="text-lg font-semibold text-center mb-2 line-clamp-2">
        {movie.title}
      </h3>
      <span className="text-sm text-white/80">
        {genre}
      </span>
    </div>
  );
} 