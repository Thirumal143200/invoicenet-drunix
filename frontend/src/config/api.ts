/**
 * InvoiceNet Production API Configuration
 * Supports VITE_API_URL for direct Render backend calls,
 * or relative paths with Vercel rewrites and Vite local proxy.
 */
export const API_BASE_URL: string = (
  import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).trim().replace(/\/+$/, '')
    : ''
);

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
