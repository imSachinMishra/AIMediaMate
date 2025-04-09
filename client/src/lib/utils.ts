import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Movie } from "@/types/movie"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date for display
export function formatDate(dateString?: string): string {
  if (!dateString) return "Release date unknown";
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return "Invalid date";
  }
}

// Format genres for display
export function formatGenres(genres?: { id: number; name: string }[]): string[] {
  if (!genres || genres.length === 0) return [];
  
  return genres.map(genre => genre.name);
}

// Format rating for display
export function formatRating(rating?: number): string {
  if (rating === undefined || rating === null) return "N/A";
  
  return rating.toFixed(1) + "/10";
}

// Map genre names to appropriate images
export function getGenreImages(genreName: string): string {
  const genreImageMap: Record<string, string> = {
    "Action": "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?w=500&h=300&fit=crop",
    "Adventure": "https://images.unsplash.com/photo-1520116468816-95b69f847357?w=500&h=300&fit=crop",
    "Animation": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&h=300&fit=crop",
    "Comedy": "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=500&h=300&fit=crop",
    "Crime": "https://images.unsplash.com/photo-1453873531674-2151bcd01707?w=500&h=300&fit=crop",
    "Documentary": "https://images.unsplash.com/photo-1492724724894-7464c27d0ceb?w=500&h=300&fit=crop",
    "Drama": "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&h=300&fit=crop",
    "Family": "https://images.unsplash.com/photo-1536640712-4d4c36ff0e4e?w=500&h=300&fit=crop",
    "Fantasy": "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=500&h=300&fit=crop",
    "History": "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=500&h=300&fit=crop",
    "Horror": "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=500&h=300&fit=crop",
    "Music": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=300&fit=crop",
    "Mystery": "https://images.unsplash.com/photo-1519822472072-ec86d5ab6f5c?w=500&h=300&fit=crop",
    "Romance": "https://images.unsplash.com/photo-1518599807935-37015b9cefcb?w=500&h=300&fit=crop",
    "Science Fiction": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&h=300&fit=crop",
    "TV Movie": "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=500&h=300&fit=crop",
    "Thriller": "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=500&h=300&fit=crop",
    "War": "https://images.unsplash.com/photo-1514862203905-2b3bb16a79a3?w=500&h=300&fit=crop",
    "Western": "https://images.unsplash.com/photo-1533167649158-6d508895b680?w=500&h=300&fit=crop",
  };
  
  return genreImageMap[genreName] || "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&h=300&fit=crop";
}

// Map API movie data to our Movie type
export function mapMovieData(
  item: any, 
  favorites: any[] | undefined, 
  mediaType: 'movie' | 'tv',
  genreMap?: Record<number, string>
): Movie {
  // Check if this movie is in user's favorites
  const isFavorite = Array.isArray(favorites) && favorites.length > 0 
    ? favorites.some(
        (fav) => fav.tmdbId === item.id && fav.mediaType === mediaType
      )
    : false;
  
  // Map providers if available
  const providers = item['watch/providers']?.results?.US?.flatrate || [];
  
  // Map genres properly if we have genre IDs and a genre map
  let genres = item.genres || [];
  if (item.genre_ids && genreMap) {
    genres = item.genre_ids
      .map((id: number) => {
        const name = genreMap[id];
        return name ? { id, name } : null;
      })
      .filter((genre: any) => genre !== null); // Remove any null entries
  }
  
  // For watch options, look in multiple places
  const watchOptions = [
    ...(item['watch/providers']?.results?.US?.flatrate || []),
    ...(item['watch/providers']?.results?.US?.rent || []),
    ...(item['watch/providers']?.results?.US?.buy || [])
  ];
  
  // Remove duplicate providers
  const uniqueProviders: any[] = [];
  const providerIds = new Set();
  
  watchOptions.forEach((provider: any) => {
    if (!providerIds.has(provider.provider_id)) {
      providerIds.add(provider.provider_id);
      uniqueProviders.push(provider);
    }
  });
  
  return {
    id: item.id,
    title: mediaType === 'movie' ? item.title : item.name, // Use name as fallback for movies
    name: mediaType === 'tv' ? item.name : item.title, // Use title as fallback for TV shows
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    overview: item.overview,
    vote_average: item.vote_average,
    release_date: item.release_date || item.first_air_date, // Use first_air_date as fallback
    first_air_date: item.first_air_date || item.release_date, // Use release_date as fallback
    genres: genres.length > 0 ? genres : undefined,
    mediaType,
    isFavorite,
    providers: uniqueProviders,
  };
}
