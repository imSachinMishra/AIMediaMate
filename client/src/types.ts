export interface Movie {
  id: string | number;
  title: string;
  overview: string;
  poster_path?: string;
  mediaType: string;
  aiReason?: string;
  isAiGenerated?: boolean;
  isFallback?: boolean;
  fallbackSource?: string;
  first_air_date?: string;
  release_date?: string;
  vote_average?: number;
  genre_ids?: number[];
} 