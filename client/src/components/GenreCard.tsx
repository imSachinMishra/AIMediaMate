import { Link } from 'wouter';
import { Skeleton } from './ui/skeleton';

interface GenreCardProps {
  id: number;
  name: string;
  count: number;
  imageUrl: string;
  mediaType: 'movie' | 'tv';
}

export default function GenreCard({ id, name, count, imageUrl, mediaType }: GenreCardProps) {
  return (
    <Link href={`/genre/${id}?mediaType=${mediaType}`}>
      <div className="rounded-xl overflow-hidden aspect-video relative group cursor-pointer bg-[rgba(26,32,55,0.8)] backdrop-blur-md border border-[rgba(255,255,255,0.05)]">
        <img 
          src={imageUrl}
          alt={`${name} Genre`} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1535] to-transparent"></div>
        <div className="absolute bottom-3 left-3">
          <h3 className="text-white font-semibold text-lg">{name}</h3>
          <p className="text-[#A0AEC0] text-xs">{count} titles</p>
        </div>
      </div>
    </Link>
  );
}

export function GenreCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden aspect-video relative bg-[rgba(26,32,55,0.8)] backdrop-blur-md border border-[rgba(255,255,255,0.05)]">
      <Skeleton className="w-full h-full" />
      <div className="absolute bottom-3 left-3 w-3/4">
        <Skeleton className="h-6 w-24 mb-1" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
