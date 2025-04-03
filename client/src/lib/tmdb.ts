// API endpoints for TMDB
// These are called server-side to protect the API key

// Base URL for TMDB images
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

export const TMDB_ENDPOINTS = {
  // Movies
  trendingMovies: '/api/movies/trending',
  discoverMovies: '/api/discover/movie',
  movieDetails: (id: number | string) => `/api/movie/${id}`,
  
  // TV Shows
  trendingTVShows: '/api/series/trending',
  discoverTVShows: '/api/discover/tv',
  tvDetails: (id: number | string) => `/api/tv/${id}`,
  
  // Search
  search: (query: string) => `/api/search/multi?query=${encodeURIComponent(query)}`,
  
  // Genres
  movieGenres: '/api/genres/movie',
  tvGenres: '/api/genres/tv',
  
  // AI Recommendations
  recommendations: '/api/recommendations',
  
  // User data
  favorites: '/api/favorites',
};

// Streaming platforms mapping
export const STREAMING_PLATFORMS = {
  8: { name: 'Netflix', icon: 'netflix' },
  9: { name: 'Amazon Prime Video', icon: 'amazon' },
  337: { name: 'Disney+', icon: 'disney' },
  15: { name: 'Hulu', icon: 'hulu' },
  1899: { name: 'Max', icon: 'hbo' },
  2: { name: 'Apple TV+', icon: 'apple' },
  // Add more platforms as needed
};
