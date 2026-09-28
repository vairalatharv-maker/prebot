// Use the Vite same-origin proxy in development. In production, set VITE_API_URL
// to the deployed API base URL (including /api).
const API_URL = import.meta.env.VITE_API_URL || '/api';

export async function apiRequest(path, { token, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
  return data;
}
