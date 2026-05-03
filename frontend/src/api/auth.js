const BASE = 'https://pcl-r0b3.onrender.com/api';

const getHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handle = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || data.detail || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
};

export const authAPI = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  getGithubAuthUrl: () =>
    fetch(`${BASE}/auth/github/`).then(handle),

  githubCallback: (code) =>
    fetch(`${BASE}/auth/github/callback/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }).then(handle),

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  refreshToken: () => {
    const refresh = localStorage.getItem('refresh_token');
    return fetch(`${BASE}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    }).then(handle);
  },

  // ── Profile ───────────────────────────────────────────────────────────────
  getProfile: () =>
    fetch(`${BASE}/profile/`, { headers: getHeaders() }).then(handle),

  patchProfile: (data) =>
    fetch(`${BASE}/profile/`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then(handle),

  getPublicProfile: (username) =>
    fetch(`${BASE}/profile/${username}/`).then(handle),

  // ── Analytics ─────────────────────────────────────────────────────────────
  getAnalytics: () =>
    fetch(`${BASE}/analytics/`, { headers: getHeaders() }).then(handle),

  getMomentumHistory: (days = 90) =>
    fetch(`${BASE}/analytics/momentum/?days=${days}`, { headers: getHeaders() }).then(handle),

  // ── GitHub ────────────────────────────────────────────────────────────────
  syncGithub: () =>
    fetch(`${BASE}/github/sync/`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handle),

  disconnectGithub: () =>
    fetch(`${BASE}/github/disconnect/`, {
      method: 'POST',
      headers: getHeaders(),
    }).then(handle),

  // ── Discovery ─────────────────────────────────────────────────────────────
  searchContributors: (params) =>
    fetch(`${BASE}/contributors/search/?${params}`).then(handle),

  getLeaderboard: (limit = 50) =>
    fetch(`${BASE}/leaderboard/?limit=${limit}`).then(handle),

  // ── Settings ──────────────────────────────────────────────────────────────
  updateSettings: (settings) =>
    fetch(`${BASE}/settings/`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settings),
    }).then(handle),
};