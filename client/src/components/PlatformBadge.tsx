import React from 'react';
import { SiNetflix, SiAmazonprime, SiHbo, SiApple, SiAppletv, SiPrimevideo, SiCrunchyroll, SiYoutube } from 'react-icons/si';

interface PlatformBadgeProps {
  provider: {
    provider_id: number;
    provider_name: string;
    logo_path?: string;
  };
}

// Create a mapping of provider IDs to icon components to avoid duplicates
const PROVIDER_ICONS: Record<number, React.ReactNode> = {
  8: <SiNetflix className="text-red-600" />, // Netflix
  9: <SiAmazonprime className="text-blue-400" />, // Amazon Prime
  337: <span className="text-xs font-bold text-blue-300">D+</span>, // Disney+
  2: <SiApple className="text-gray-200" />, // Apple TV
  15: <span className="text-xs font-bold text-green-400">HULU</span>, // Hulu
  384: <SiHbo className="text-purple-400" />, // HBO Max
  531: <span className="text-xs font-bold text-blue-500">P+</span>, // Paramount+
  283: <SiCrunchyroll className="text-orange-500" />, // Crunchyroll
  350: <SiYoutube className="text-red-500" />, // YouTube
};

// List of known provider IDs to prevent duplicates
const KNOWN_PROVIDERS = Object.keys(PROVIDER_ICONS).map(Number);

export default function PlatformBadge({ provider }: PlatformBadgeProps) {
  // Get icon based on provider ID or fallback to text
  const getProviderIcon = () => {
    // Check if we have a predefined icon for this provider
    if (PROVIDER_ICONS[provider.provider_id]) {
      return PROVIDER_ICONS[provider.provider_id];
    }
    
    // Otherwise fall back to using the name
    const name = provider.provider_name.toLowerCase();
    
    if (name.includes('netflix')) {
      return <SiNetflix className="text-red-600" />;
    } else if (name.includes('amazon') || name.includes('prime')) {
      return <SiPrimevideo className="text-blue-400" />;
    } else if (name.includes('disney')) {
      return <span className="text-xs font-bold text-blue-300">D+</span>;
    } else if (name.includes('hbo') || name.includes('max')) {
      return <SiHbo className="text-purple-400" />;
    } else if (name.includes('apple')) {
      return name.includes('tv') ? <SiAppletv className="text-gray-200" /> : <SiApple className="text-gray-200" />;
    } else if (name.includes('hulu')) {
      return <span className="text-xs font-bold text-green-400">HULU</span>;
    } else {
      // Fallback to using the first letter
      return <span className="text-xs font-bold">{provider.provider_name.charAt(0)}</span>;
    }
  };

  // Handle click to redirect to streaming service
  const handleClick = () => {
    window.open(`https://www.google.com/search?q=Watch+on+${encodeURIComponent(provider.provider_name)}`, '_blank');
  };

  return (
    <div 
      className="w-6 h-6 flex items-center justify-center rounded-md bg-[rgba(15,21,53,0.7)] cursor-pointer hover:bg-[rgba(45,51,83,0.7)] transition-colors"
      title={`Watch on ${provider.provider_name}`}
      onClick={handleClick}
    >
      {getProviderIcon()}
    </div>
  );
}
