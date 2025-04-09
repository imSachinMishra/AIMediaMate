import { useEffect, useRef, useState } from 'react';
import { User, Search, LogOut, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      if (!query.trim()) return null;
      const response = await apiRequest('GET', `/api/search/multi?query=${encodeURIComponent(query)}`);
      return response.data;
    },
    onSuccess: (data) => {
      if (data && data.results && data.results.length > 0) {
        // Navigate to search results page
        navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
        // Clear the search input
        setSearchQuery('');
      } else {
        toast({
          title: "No results found",
          description: "Try a different search term",
        });
      }
    },
    onError: (error) => {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "An error occurred while searching. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      // Perform the search
      searchMutation.mutate(trimmedQuery);
    }
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
    setIsDropdownOpen(false);
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white inline-block pb-1 relative after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:h-[2px] after:w-[30%] after:bg-gradient-to-r after:from-primary after:to-blue-400">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[#A0AEC0] mt-1">{subtitle}</p>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        <form onSubmit={handleSearch} className="relative">
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full sm:w-64 px-4 py-2 pl-10 rounded-lg text-white placeholder-gray-500 bg-[rgba(45,55,72,0.5)] border border-[rgba(160,174,192,0.2)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A0AEC0] w-4 h-4" />
        </form>
        
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="h-10 w-10 bg-[#1A2037] rounded-full overflow-hidden flex items-center justify-center border border-primary/30"
          >
            {user?.firstName ? (
              <span className="text-white font-semibold">
                {user.firstName[0].toUpperCase()}
              </span>
            ) : (
              <User className="text-white w-5 h-5" />
            )}
          </button>
          
          {isDropdownOpen && (
            <Card className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1 z-10">
              <div className="py-2 px-4 border-b border-gray-700">
                <p className="text-white font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[#A0AEC0] text-sm truncate">
                  {user?.email}
                </p>
              </div>
              <div className="py-1">
                <Button 
                  variant="ghost"
                  className="w-full justify-start rounded-none px-4 py-2 text-sm text-white hover:bg-[#1A2037]"
                >
                  <User className="w-4 h-4 mr-2" /> Profile
                </Button>
                
                <Button 
                  variant="ghost"
                  className="w-full justify-start rounded-none px-4 py-2 text-sm text-white hover:bg-[#1A2037]"
                >
                  <Settings className="w-4 h-4 mr-2" /> Settings
                </Button>
                
                <div className="border-t border-gray-700 my-1"></div>
                
                <Button 
                  variant="ghost"
                  className="w-full justify-start rounded-none px-4 py-2 text-sm text-red-500 hover:bg-[#1A2037]"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </header>
  );
}
