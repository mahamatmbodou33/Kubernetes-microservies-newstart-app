/** Single source of the API base URL. Read from VITE_API_BASE_URL; never hard-coded. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
