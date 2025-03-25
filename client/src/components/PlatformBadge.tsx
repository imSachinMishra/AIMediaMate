import React from 'react';
import { SiNetflix, SiAmazonprime, SiHbo, SiApple, SiAppletv, SiPrimevideo } from 'react-icons/si';

interface PlatformBadgeProps {
  provider: {
    provider_id: number;
    provider_name: string;
    logo_path?: string;
  };
}

export default function PlatformBadge({ provider }: PlatformBadgeProps) {
  // Map the provider to the correct icon
  const getProviderIcon = () => {
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

  return (
    <div 
      className="w-6 h-6 flex items-center justify-center rounded-md bg-[rgba(15,21,53,0.7)]"
      title={provider.provider_name}
    >
      {getProviderIcon()}
    </div>
  );
}
