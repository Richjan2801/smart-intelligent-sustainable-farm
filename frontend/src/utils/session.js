/**
 * Session utilities — JWT based session helpers
 */

export function clearSession() {
  localStorage.clear();
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

export function getTokenExpiredAt(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000;
}

export function saveSession({ accessToken, user, tokenExpiredAt }) {
  const exp = tokenExpiredAt || getTokenExpiredAt(accessToken);

  if (!accessToken || !user || !exp) {
    clearSession();
    return false;
  }

  localStorage.setItem("isLogin", "true");
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("tokenExpiredAt", String(exp));

  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("userRole", user.role || "farmer");

  return true;
}

export function isSessionValid() {
  const token = localStorage.getItem("accessToken");
  const exp = Number(localStorage.getItem("tokenExpiredAt"));

  if (!token || !exp) return false;

  if (Date.now() >= exp) {
    clearSession();
    return false;
  }

  return true;
}

export function getAccessToken() {
  return localStorage.getItem("accessToken");
}

export function getUserRole() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    return user?.role || "farmer";
  } catch {
    return "farmer";
  }
}

export function authFetch(url, options = {}) {
  const token = getAccessToken();

  // if caller passed a relative path (e.g. "/api/devices"),
  // prepend the API base. If caller already passed a full URL, use as-is.
  const API_BASE = import.meta.env.VITE_API_URL || "";
  const resolvedUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;

  return fetch(resolvedUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}