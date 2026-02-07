import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CopilotKit } from "@copilotkit/react-core";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import { Layout } from "./components/Layout";
import { PWAPrompt } from "./components/PWAPrompt";
import { Capture } from "./routes/Capture";
import { Inbox } from "./routes/Inbox";
import { Today } from "./routes/Today";
import { Browse } from "./routes/Browse";
import { Clarifications } from "./routes/Clarifications";
import { Receipts } from "./routes/Receipts";
import { Search } from "./routes/Search";
import { Digest } from "./routes/Digest";
import { WeeklyReview } from "./routes/WeeklyReview";
import { StreamDemo } from "./routes/StreamDemo";

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
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const authToken = import.meta.env.VITE_API_AUTH_TOKEN;
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;

  return (
    <ErrorBoundary>
      <PWAPrompt />
      <QueryClientProvider client={queryClient}>
        <CopilotKit
          runtimeUrl={`${apiBase}/copilotkit`}
          headers={headers}
          showDevConsole={false}
          useSingleEndpoint
        >
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
                    <RouteErrorBoundary routeName="Digest">
                      <Digest />
                    </RouteErrorBoundary>
                  }
                />
                <Route
                  path="digest/weekly"
                  element={
                    <RouteErrorBoundary routeName="WeeklyReview">
                      <WeeklyReview />
                    </RouteErrorBoundary>
                  }
                />
                <Route
                  path="stream-demo"
                  element={
                    <RouteErrorBoundary routeName="StreamDemo">
                      <StreamDemo />
                    </RouteErrorBoundary>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </CopilotKit>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
