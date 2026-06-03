// lib/api.js (was utils/api.jsx)
//
// L1.1: axios → native fetch. Four verbs + the chatAPI/productsAPI/userAPI
// groups, ported faithfully from utils/api.jsx.
//
// Two deliberate changes from the React file (per plan §L1.1):
//   1. getApiUrl's multi-Lambda service switch is COLLAPSED to a single
//      VITE_API_BASE_URL — the per-service URLs (VITE_CHAT_STREAM_URL /
//      VITE_PRODUCTS_URL / VITE_USER_URL / VITE_CHAT_THREADS_URL) are dead under
//      the unified Worker (Tracks B/C). The `service` argument is kept on every
//      function signature so call sites (and the API groups below) port verbatim,
//      but it no longer selects a base URL — every call uses BASE_URL.
//   2. axios → fetch. fetch does NOT throw on 4xx/5xx and has no `.response`, so
//      the wrapper (a) throws on non-2xx and (b) normalizes the thrown error to
//      the axios-compatible { response: { data } } shape (decision D7) so callers
//      reading `error.response.data.error` (Chat.jsx:138, Hybrid.jsx:147) survive
//      unchanged.

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Normalize a fetch failure into an axios-shaped error: { response: { data } }
// (decision D7). `data` is the parsed JSON error body when the server sent one,
// else a best-effort blob so `error.response.data.error` never throws.
function normalizeError(error) {
  if (error && error.response) return error; // already normalized
  return { response: { data: { error: error?.message ?? 'Network error' } }, original: error };
}

// Read the response body. Throw an axios-shaped error on non-2xx so callers that
// `try/catch` around these verbs (and read error.response.data.error) keep working
// even though fetch resolves on 4xx/5xx.
async function handleResponse(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    body = undefined; // non-JSON / empty body
  }

  if (!response.ok) {
    // mirror axios: error.response.data carries the server's JSON error payload
    throw { response: { data: body ?? { error: response.statusText } } };
  }

  return body;
}

export async function fetchData(endpoint, service = null) {
  try {
    const response = await fetch(BASE_URL + endpoint);
    return await handleResponse(response);
  } catch (error) {
    console.error('There was an error!', error);
    throw normalizeError(error);
  }
}

export async function postData(endpoint, data, service = null) {
  try {
    const response = await fetch(BASE_URL + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('There was an error!', error);
    throw normalizeError(error);
  }
}

export async function putData(endpoint, data, service = null) {
  try {
    const response = await fetch(BASE_URL + endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('There was an error!', error);
    throw normalizeError(error);
  }
}

export async function deleteData(endpoint, service = null) {
  try {
    const response = await fetch(BASE_URL + endpoint, { method: 'DELETE' });
    return await handleResponse(response);
  } catch (error) {
    console.error('There was an error!', error);
    throw normalizeError(error);
  }
}

// Specialized functions for different services. The `service` tags are carried
// verbatim from utils/api.jsx (now inert — see header). URLSearchParams query
// building is preserved exactly.
export const chatAPI = {
  fetchThreads: (params) => fetchData('/threads?' + new URLSearchParams(params).toString(), 'chat'),
  createThread: (data) => postData('/threads', data, 'chat'),
  postMessage: (data) => postData('/messages', data, 'chat'),
  getMessages: (params) => fetchData('/threads/messages?' + new URLSearchParams(params).toString(), 'chat'),
  getStatistics: (params) => fetchData('/threads/statistics?' + new URLSearchParams(params).toString(), 'chat'),
};

export const productsAPI = {
  search: (params) => fetchData('/search?' + new URLSearchParams(params).toString(), 'products'),
  filter: (params) => fetchData('/filter?' + new URLSearchParams(params).toString(), 'products'),
  getDetails: (productId) => fetchData(`/${productId}`, 'products'),
  getReviews: (productId) => fetchData(`/${productId}/reviews`, 'products'),
};

export const userAPI = {
  get: (params) => fetchData('/?' + new URLSearchParams(params).toString(), 'user'),
  create: (data) => postData('/', data, 'user'),
  getStatistics: (params) => fetchData('/statistic?' + new URLSearchParams(params).toString(), 'user'),
};
