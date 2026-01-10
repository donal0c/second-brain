import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/Layout";
import { Capture } from "./routes/Capture";
import { Inbox } from "./routes/Inbox";
import { Today } from "./routes/Today";
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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/capture" replace />} />
            <Route path="capture" element={<Capture />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="today" element={<Today />} />
            <Route path="browse" element={<Browse />} />
            <Route path="clarifications" element={<Clarifications />} />
            <Route path="receipts" element={<Receipts />} />
            <Route path="search" element={<Search />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
