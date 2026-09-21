import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Buffer is polyfilled lazily inside SolanaShell — keeping it out of main
// prevents the Solana vendor graph from hitching onto every first paint.

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);
