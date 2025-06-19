/**
 * Main Application Entry Point
 *
 * Initializes React application with strict mode and global styles
 */

import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// CSS Imports
import "./index.css"; // Main CSS file (Tailwind + custom styles)
import "@fontsource/inter"; // Default Inter font weights
import "@fontsource/inter/500.css"; // Medium weight
import "@fontsource/inter/600.css"; // Semi-bold weight
import "@fontsource/inter/700.css"; // Bold weight

// Performance Monitoring (optional)
// import reportWebVitals from './reportWebVitals';

// Initialize React application
const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// If you want to start measuring performance in your app:
// reportWebVitals(console.log); // or send to analytics endpoint

// Service Worker Registration (for PWA)
// if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/service-worker.js');
//   });
// }
