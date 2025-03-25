import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import GenrePage from "@/pages/genre-page";
import MovieDetails from "@/pages/movie-details";
import SearchPage from "@/pages/search-page";
import FavoritesPage from "@/pages/favorites-page";
import RecommendationsPage from "@/pages/recommendations-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/genre/:id" component={GenrePage} />
      <ProtectedRoute path="/movie/:id" component={MovieDetails} />
      <ProtectedRoute path="/tv/:id" component={MovieDetails} />
      <ProtectedRoute path="/search" component={SearchPage} />
      <ProtectedRoute path="/discover" component={GenrePage} />
      <ProtectedRoute path="/favorites" component={FavoritesPage} />
      <ProtectedRoute path="/recommendations" component={RecommendationsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
