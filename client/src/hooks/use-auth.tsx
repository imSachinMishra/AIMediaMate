import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import apiClient from '@/lib/api-client';

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

// Move outside component to avoid recreation
const API_ENDPOINTS = {
  user: '/api/auth/me',
  login: '/api/auth/login',
  register: '/api/auth/register',
  logout: '/api/auth/logout'
} as const;

const USER_QUERY_KEY = ['auth', 'user'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: USER_QUERY_KEY,
    queryFn: () => apiClient.get(API_ENDPOINTS.user).then(res => res.data),
    retry: 0,
    enabled: !!localStorage.getItem('isAuthenticated'),
    onSuccess: (data) => {
      if (data) {
        localStorage.setItem('isAuthenticated', 'true');
      }
    },
    onError: () => {
      localStorage.removeItem('isAuthenticated');
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        const response = await apiClient.post(API_ENDPOINTS.login, credentials);
        
        const userData = response.data?.user || response.data;
        const token = response.data?.token || response.data?.accessToken;
        
        if (!userData || !token) {
          throw new Error('Invalid response from server');
        }

        return { user: userData, token };
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message;
        console.error('Login error:', {
          status: error.response?.status,
          message: errorMessage,
          url: API_ENDPOINTS.login
        });
        throw new Error(errorMessage || 'Login failed');
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(USER_QUERY_KEY, data.user);
      navigate("/");
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.firstName || 'User'}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      try {
        console.log("Sending registration data:", data);
        const response = await apiClient.post(API_ENDPOINTS.register, data);
        if (!response.data) {
          throw new Error('No response data received');
        }
        return response.data;
      } catch (error: any) {
        console.error("Registration API error:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw new Error(error.response?.data?.message || error.message || "Registration failed");
      }
    },
    onError: (error: Error) => {
      console.error("Registration mutation error:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(USER_QUERY_KEY, user);
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
      navigate("/");
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.firstName || 'User'}!`,
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(API_ENDPOINTS.logout);
      localStorage.removeItem('authToken');
      localStorage.removeItem('isAuthenticated');
    },
    onSuccess: () => {
      queryClient.setQueryData(USER_QUERY_KEY, null);
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
      navigate("/auth");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
