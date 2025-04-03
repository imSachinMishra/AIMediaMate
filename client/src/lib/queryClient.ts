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

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<AxiosResponse> {
  if (url.includes("/register") && data && typeof data === "object") {
    const { username } = data as { username?: string };
    console.log("Register Data (Before API Call):", data); // Debug log to inspect the data object
    if (!username || username.trim() === "") {
      console.error("Error: Username is empty or invalid."); // Log error for debugging
      throw new Error("Username is required and cannot be empty.");
    }
  }

  // Ensure URL has the base URL
  let fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
  
  // If data is an object and method is GET, convert it to query parameters
  if (method === 'GET' && data && typeof data === 'object') {
    const queryParams = new URLSearchParams();
    Object.entries(data as Record<string, any>).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    if (queryString) {
      fullUrl += `${fullUrl.includes('?') ? '&' : '?'}${queryString}`;
    }
    data = undefined; // Clear data since we've added it to the URL
  }

  console.log('Making API request:', {
    method,
    url: fullUrl,
    hasData: !!data
  });

  return await axios({
    method,
    url: fullUrl,
    data,
    withCredentials: true,
  });
}