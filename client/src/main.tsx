import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set the page title
document.title = "Vexis Image Training Platform";

// Set favicon if not already set
if (!document.querySelector('link[rel="icon"]')) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%233b82f6"><path d="M10 6H14V10H10V6ZM10 14H14V18H10V14ZM6 10H10V14H6V10ZM14 10H18V14H14V10Z"/></svg>';
  document.head.appendChild(link);
}

// Set meta description
const existingMeta = document.querySelector('meta[name="description"]');
if (!existingMeta) {
  const meta = document.createElement('meta');
  meta.name = 'description';
  meta.content = 'Vexis Image Training Platform for medical ultrasound synthetic image generation using OpenAI GPT Image and DALL-E 3 APIs';
  document.head.appendChild(meta);
}

createRoot(document.getElementById("root")!).render(<App />);
