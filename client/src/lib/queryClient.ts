import { QueryClient, QueryKey, QueryFunction } from "@tanstack/react-query";
import axios, { AxiosResponse } from "axios";

export const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      queryFn: getQueryFn(),
    },
  },
});

interface QueryFnOptions {
  on401?: "throw" | "ignore";
}

export function getQueryFn(options: QueryFnOptions = {}): QueryFunction {
  return async ({ queryKey }: { queryKey: QueryKey }) => {
    try {
      const [url, params] = queryKey as [string, Record<string, any>?];
      
      if (typeof url !== 'string') {
        throw new Error('Query key must start with a URL string');
      }

      // Build the full URL
      let fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
      
      // Add query parameters if they exist
      if (params && typeof params === 'object') {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
        const queryString = queryParams.toString();
        if (queryString) {
          fullUrl += `${fullUrl.includes('?') ? '&' : '?'}${queryString}`;
        }
      }

      console.log('Making API request:', {
        url: fullUrl,
        hasParams: !!params
      });

      const response = await axios.get(fullUrl, {
        withCredentials: true,
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401 && options.on401 !== "ignore") {
        throw new Error("Unauthorized");
      }
      throw error;
    }
  };
}

export async function apiRequest(method: string, url: string, data?: any) {
  try {
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    
    // Add timestamp to prevent caching
    const separator = fullUrl.includes('?') ? '&' : '?';
    const timestampedUrl = `${fullUrl}${separator}_t=${Date.now()}`;
    
    console.log('Making API request:', {
      method,
      url: timestampedUrl,
      hasData: !!data
    });

    const response = await axios({
      method,
      url: timestampedUrl,
      data,
      withCredentials: true,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    return response;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error("Unauthorized");
    }
    throw error;
  }
}