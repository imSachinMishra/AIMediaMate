export interface Movie {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genres?: { id: number; name: string }[];
  mediaType: 'movie' | 'tv';
  isFavorite?: boolean;
  providers?: {
    provider_id: number;
    provider_name: string;
    logo_path?: string;
  }[];
}
