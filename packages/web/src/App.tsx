import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import { Layout } from "./components/Layout";
import { Capture } from "./routes/Capture";
import { Inbox } from "./routes/Inbox";
import { Today } from "./routes/Today";
import { Digest } from "./routes/Digest";
import { Browse } from "./routes/Browse";
import { Clarifications } from "./routes/Clarifications";
import { Receipts } from "./routes/Receipts";
import { Search } from "./routes/Search";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/capture" replace />} />
              <Route
                path="capture"
                element={
                  <RouteErrorBoundary routeName="Capture">
                    <Capture />
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="inbox"
                element={
                  <RouteErrorBoundary routeName="Inbox">
                    <Inbox />
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="today"
                element={
                  <RouteErrorBoundary routeName="Today">
                    <Today />
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="digest"
                element={
                  <RouteErrorBoundary routeName="Digest">
                    <Digest />
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="browse"
                element={
                  <RouteErrorBoundary routeName="Browse">
                    <Browse />
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="clarifications"
                element={
                  <RouteErrorBoundary routeName="Clarifications">
                    <Clarifications />
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="receipts"
                element={
                  <RouteErrorBoundary routeName="Receipts">
                    <Receipts />
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="search"
                element={
                  <RouteErrorBoundary routeName="Search">
                    <Search />
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="digest/dashboard"
                element={
                  <RouteErrorBoundary routeName="Digest Dashboard">
                    <Today />
                  </RouteErrorBoundary>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
