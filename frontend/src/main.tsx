import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { API_BASE_URL } from './config/api';

// If VITE_API_URL is configured (e.g. Render backend URL), automatically route /api calls to it
if (API_BASE_URL) {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (typeof input === 'string' && input.startsWith('/api')) {
      input = `${API_BASE_URL}${input}`;
    }
    return originalFetch.call(this, input, init);
  };
  console.log(`[InvoiceNet] Connected to backend API gateway: ${API_BASE_URL}`);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
