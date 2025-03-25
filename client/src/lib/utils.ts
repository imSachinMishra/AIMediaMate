import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Movie } from "@/types/movie"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Map genre names to appropriate images
export function getGenreImages(genreName: string): string {
  const genreImageMap: Record<string, string> = {
    "Action": "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "Adventure": "https://images.unsplash.com/photo-1604537466573-5e94508fd243?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "Animation": "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "Comedy": "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "Crime": "https://images.unsplash.com/photo-1605806616950-13781e9f5033?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "Documentary": "https://images.unsplash.com/photo-1616432043562-3e119c44bff1?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "Drama": "https://images.unsplash.com/photo-1611523552729-91f96c63fc3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "Family": "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "Fantasy": "https://images.unsplash.com/photo-1578674473215-9e07ee2e577d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "History": "https://images.unsplash.com/photo-1461360370896-922624d12aa1?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "Horror": "https://images.unsplash.com/photo-1604248233487-899429b9e031?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "Music": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "Mystery": "https://images.unsplash.com/photo-1606819717115-9159c900370b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "Romance": "https://images.unsplash.com/photo-1517230878791-4d28214057c2?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "Science Fiction": "https://images.unsplash.com/photo-1605806616950-13781e9f5033?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "Sci-Fi": "https://images.unsplash.com/photo-1605806616950-13781e9f5033?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "TV Movie": "https://images.unsplash.com/photo-1616530940355-351fabd9524b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "Thriller": "https://images.unsplash.com/photo-1513384312027-9fa69a360337?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "War": "https://images.unsplash.com/photo-1562651139-de5f505894b1?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
    "Western": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
  };
  
  return genreImageMap[genreName] || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80";
}

// Map API movie data to our Movie type
export function mapMovieData(
  item: any, 
  favorites: any[] | undefined, 
  mediaType: 'movie' | 'tv',
  genreMap?: Record<number, string>
): Movie {
  // Check if this movie is in user's favorites
  const isFavorite = favorites?.some(
    (fav) => fav.tmdbId === item.id && fav.mediaType === mediaType
  );
  
  // Map providers if available
  const providers = item['watch/providers']?.results?.US?.flatrate || [];
  
  // Map genres properly if we have genre IDs and a genre map
  let genres = item.genres || [];
  if (item.genre_ids && genreMap) {
    genres = item.genre_ids.map((id: number) => ({ 
      id, 
      name: genreMap[id] || 'Unknown' 
    }));
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
    title: mediaType === 'movie' ? item.title : undefined,
    name: mediaType === 'tv' ? item.name : undefined,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    overview: item.overview,
    vote_average: item.vote_average,
    release_date: item.release_date,
    first_air_date: item.first_air_date,
    genres,
    mediaType,
    isFavorite,
    providers: uniqueProviders,
  };
}
