import { useQuery } from '@tanstack/react-query';
import { Movie } from '../types/movie';
import { Brain, ChartLine, Play, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Link } from 'wouter';
import { Card, CardContent } from './ui/card';
import { Skeleton } from './ui/skeleton';

export default function FeaturedSection() {
  const { data: trendingData, isLoading } = useQuery<{ results: any[] }>({
    queryKey: ['/api/movies/trending'],
  });
  
  // Select a random trending movie for the featured section
  const featuredMovie = trendingData?.results?.[0];
  
  if (isLoading) {
    return <FeaturedSectionSkeleton />;
  }
  
  if (!featuredMovie) {
    return (
      <div className="mb-10 p-8 rounded-xl bg-[rgba(26,32,55,0.8)] backdrop-blur-md border border-[rgba(255,255,255,0.05)]">
        <h2 className="text-xl font-bold text-white">No featured content available</h2>
        <p className="text-[#A0AEC0] mt-2">Try refreshing the page or check back later.</p>
      </div>
    );
  }

  // Process the movie data
  const movie: Movie = {
    id: featuredMovie.id,
    title: featuredMovie.title,
    poster_path: featuredMovie.poster_path,
    backdrop_path: featuredMovie.backdrop_path,
    overview: featuredMovie.overview,
    vote_average: featuredMovie.vote_average,
    release_date: featuredMovie.release_date,
    genres: featuredMovie.genre_ids?.map((id: number) => ({ id, name: 'Loading...' })) || [],
    mediaType: 'movie',
  };

  return (
    <section className="mb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Featured Movie Banner */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden relative h-80 group">
          <img 
            src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`} 
            alt={movie.title || ''} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1535] to-transparent"></div>
          <div className="absolute bottom-0 left-0 p-6">
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2 py-1 bg-primary/80 text-white text-xs rounded-md">AI Pick</span>
              {movie.genres?.slice(0, 2).map(genre => (
                <span key={genre.id} className="px-2 py-1 bg-[rgba(15,21,53,0.6)] text-white text-xs rounded-md">
                  {genre.name}
                </span>
              ))}
            </div>
            <h2 className="text-white text-2xl font-bold">{movie.title}</h2>
            <p className="text-[#A0AEC0] text-sm mt-2 max-w-xl line-clamp-2">{movie.overview}</p>
            <div className="flex items-center mt-4 space-x-4">
              <Link href={`/movie/${movie.id}`}>
                <Button>
                  <Play className="w-4 h-4 mr-2" /> Watch Now
                </Button>
              </Link>
              <Button variant="secondary">
                <Plus className="w-4 h-4 mr-2" /> Add to List
              </Button>
            </div>
          </div>
        </div>
        
        {/* AI Recommendations Banner */}
        <Card>
          <CardContent className="pt-6 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-bold text-white">AI Recommendations</h3>
                <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded">New</span>
              </div>
              <p className="text-[#A0AEC0] mt-2">Get personalized recommendations based on your viewing history and preferences.</p>
              
              <div className="mt-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Personalized Suggestions</h4>
                    <p className="text-[#A0AEC0] text-sm">Based on your watch history</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                    <ChartLine className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Trending Analysis</h4>
                    <p className="text-[#A0AEC0] text-sm">What's popular right now</p>
                  </div>
                </div>
              </div>
            </div>
            
            <Link href="/recommendations" className="w-full mt-6">
              <Button className="w-full bg-gradient-to-r from-primary to-blue-400 text-white hover:from-blue-600 hover:to-blue-500">
                Get Started
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function FeaturedSectionSkeleton() {
  return (
    <section className="mb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Featured Movie Banner Skeleton */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden relative h-80">
          <Skeleton className="w-full h-full" />
          <div className="absolute bottom-0 left-0 p-6 w-full">
            <div className="flex items-center space-x-2 mb-2">
              <Skeleton className="w-16 h-6" />
              <Skeleton className="w-16 h-6" />
            </div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-full max-w-xl mb-1" />
            <Skeleton className="h-4 w-3/4 max-w-xl mb-4" />
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
        
        {/* AI Recommendations Banner Skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-6 w-12" />
            </div>
            <Skeleton className="h-4 w-full mb-6" />
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
            
            <Skeleton className="h-10 w-full mt-6" />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
