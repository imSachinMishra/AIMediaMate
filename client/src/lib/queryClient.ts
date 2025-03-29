import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  if (url.includes("/register") && data && typeof data === "object") {
    const { username } = data as { username?: string };
    console.log("Register Data (Before API Call):", data); // Debug log to inspect the data object
    if (!username || username.trim() === "") {
      console.error("Error: Username is empty or invalid."); // Log error for debugging
      throw new Error("Username is required and cannot be empty.");
    }
  }

  const token = localStorage.getItem("authToken"); // Retrieve token from localStorage
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}), // Add Authorization header if token exists
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem("authToken"); // Retrieve token from localStorage
    const res = await fetch(queryKey[1] as string, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {}, // Add Authorization header if token exists
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const API_URL = window.location.hostname === 'localhost' ? 'http://0.0.0.0:3000' : ''; // Use relative URLs in production

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});