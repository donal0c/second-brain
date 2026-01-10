import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Capture } from "./routes/Capture";
import { Inbox } from "./routes/Inbox";
import { Today } from "./routes/Today";
import { Browse } from "./routes/Browse";
import { Clarifications } from "./routes/Clarifications";
import { Receipts } from "./routes/Receipts";

export function App() {
  return (
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
