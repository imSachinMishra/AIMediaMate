import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Button } from './ui/button';
import { 
  Home, Compass, Heart, Video, Brain,
  Sword, Skull, Drama, Laugh, Rocket,
  Flame, Ghost, Music, Globe, Glasses,
  Film, Wand2, LucideIcon
} from 'lucide-react';
import { Skeleton } from './ui/skeleton';

// Function to get appropriate icon for each genre
const getGenreIcon = (genreName: string): LucideIcon => {
  const icons: { [key: string]: LucideIcon } = {
    'Action': Sword,
    'Adventure': Compass,
    'Animation': Wand2,
    'Comedy': Laugh,
    'Crime': Skull,
    'Drama': Drama,
    'Horror': Ghost,
    'Romance': Heart,
    'Science Fiction': Rocket,
    'Thriller': Flame,
    'Music': Music,
    'Fantasy': Wand2,
    'Mystery': Glasses,
    'Western': Globe,
  };
  
  return icons[genreName] || Film;
};

export default function Sidebar() {
  const [location] = useLocation();
  
  const { data: movieGenres, isLoading: isLoadingMovieGenres } = useQuery<{ genres: { id: number, name: string }[] }>({
    queryKey: ['/api/genres/movie'],
    queryFn: async () => {
      const response = await fetch('/api/genres/movie');
      if (!response.ok) {
        throw new Error('Failed to fetch genres');
      }
      return response.json();
    }
  });
  
  // Function to determine if a link is active
  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <aside className="w-full md:w-64 md:min-h-screen p-4 overflow-hidden z-20 md:sticky md:top-0 md:h-screen bg-[rgba(26,32,55,0.8)] backdrop-blur-md border-r border-[rgba(255,255,255,0.05)]">
      <div className="flex items-center justify-center md:justify-start mb-8 py-2">
        <div className="w-10 h-10 bg-gradient-to-r from-primary to-blue-400 rounded-lg flex items-center justify-center">
          <Video className="text-white" />
        </div>
        <h1 className="text-white text-xl font-bold ml-3">CineSync<span className="text-primary">AI</span></h1>
      </div>
      
      <nav className="space-y-1">
        <p className="text-xs text-[#A0AEC0] uppercase font-semibold px-3 mb-2">General</p>
        
        <Button 
          variant="ghost" 
          className={`w-full justify-start px-3 py-3 rounded-lg group transition-all ${
            isActive('/') 
              ? 'bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary text-white' 
              : 'text-[#A0AEC0] hover:bg-[#1A2037]'
          }`}
          asChild
        >
          <Link href="/">
            <Home className="w-5 h-5 mr-3" />
            <span>Dashboard</span>
          </Link>
        </Button>
        
        <Button 
          variant="ghost" 
          className={`w-full justify-start px-3 py-3 rounded-lg group transition-all ${
            isActive('/discover') 
              ? 'bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary text-white' 
              : 'text-[#A0AEC0] hover:bg-[#1A2037]'
          }`}
          asChild
        >
          <Link href="/discover">
            <Compass className="w-5 h-5 mr-3" />
            <span>Discover</span>
          </Link>
        </Button>
        
        <Button 
          variant="ghost" 
          className={`w-full justify-start px-3 py-3 rounded-lg group transition-all ${
            isActive('/favorites') 
              ? 'bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary text-white' 
              : 'text-[#A0AEC0] hover:bg-[#1A2037]'
          }`}
          asChild
        >
          <Link href="/favorites">
            <Heart className="w-5 h-5 mr-3" />
            <span>Favorites</span>
          </Link>
        </Button>

        <p className="text-xs text-[#A0AEC0] uppercase font-semibold px-3 mt-6 mb-2">Categories</p>
        
        {isLoadingMovieGenres ? (
          // Skeleton loaders for genres
          Array(15).fill(null).map((_, i) => (
            <div key={i} className="flex items-center px-3 py-3">
              <Skeleton className="w-5 h-5 mr-3" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))
        ) : (
          // Actual genre links
          movieGenres?.genres.slice(0, 15).map((genre) => {
            const GenreIcon = getGenreIcon(genre.name);
            return (
              <Button 
                key={genre.id}
                variant="ghost" 
                className={`w-full justify-start px-3 py-3 rounded-lg group transition-all ${
                  isActive(`/genre/${genre.id}`) 
                    ? 'bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary text-white' 
                    : 'text-[#A0AEC0] hover:bg-[#1A2037]'
                }`}
                asChild
              >
                <Link href={`/genre/${genre.id}`}>
                  <GenreIcon className="w-5 h-5 mr-3" />
                  <span>{genre.name}</span>
                </Link>
              </Button>
            );
          })
        )}
      </nav>
      
      <div className="mt-10">
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/20 to-blue-500/20 border border-primary/20">
          <h3 className="text-white font-semibold mb-2">AI-Powered Recommendations</h3>
          <p className="text-sm text-[#A0AEC0] mb-3">Get personalized movie suggestions based on your preferences.</p>
          <Link href="/recommendations">
            <Button className="w-full">
              <Brain className="w-4 h-4 mr-2" /> Find My Match
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
