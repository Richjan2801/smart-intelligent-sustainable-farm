/**
 * Session utilities — JWT based session helpers.
 * Used by: App.jsx, Header.jsx, Login.jsx
 */

export function clearSession() {
  localStorage.removeItem("isLogin");
  localStorage.removeItem("username");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("tokenExpiredAt");
  localStorage.removeItem("mock_api");

  localStorage.removeItem("user");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userName");
  localStorage.removeItem("userRole");

  localStorage.removeItem("access_token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("refresh_token");
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalizedPayload = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const decodedPayload = atob(normalizedPayload);

    return JSON.parse(decodedPayload);
  } catch {
    return null;
  }
}

export function getTokenExpiredAt(token) {
  const payload = decodeJwtPayload(token);

  if (!payload || !payload.exp) {
    return null;
  }

  return payload.exp * 1000;
}

export function saveSession({ accessToken, user, tokenExpiredAt }) {
  const resolvedTokenExpiredAt =
    tokenExpiredAt || getTokenExpiredAt(accessToken);

  if (!accessToken || !user || !resolvedTokenExpiredAt) {
    clearSession();
    return false;
  }

  localStorage.setItem("isLogin", "true");
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("tokenExpiredAt", String(resolvedTokenExpiredAt));

  localStorage.setItem("username", user.username || "User");
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("userEmail", user.email || "");
  localStorage.setItem("userName", user.username || "");
  localStorage.setItem("userRole", user.role || "admin");

  return true;
}

export function isSessionValid() {
  const isLogin = localStorage.getItem("isLogin") === "true";
  const accessToken = localStorage.getItem("accessToken");
  const tokenExpiredAt = Number(localStorage.getItem("tokenExpiredAt"));

  if (!isLogin || !accessToken || !tokenExpiredAt) {
    clearSession();
    return false;
  }

  if (Date.now() >= tokenExpiredAt) {
    clearSession();
    return false;
  }

  return true;
}

export function getAccessToken() {
  return localStorage.getItem("accessToken");
}