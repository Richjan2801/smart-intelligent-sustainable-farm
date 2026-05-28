/**
 * Session utilities — pure helpers, no React, no side effects beyond localStorage.
 * Used by: App.jsx, Header.jsx, Login.jsx
 */

/**
 * Removes all session-related keys from localStorage.
 * Covers both the current mock-token keys and legacy / alternative auth keys.
 */
export function clearSession() {
  // Current mock-token session keys
  localStorage.removeItem("isLogin");
  localStorage.removeItem("username");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("tokenExpiredAt");

  // Old / alternative auth keys cleanup
  localStorage.removeItem("access_token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userName");
  localStorage.removeItem("userRole");
}

/**
 * Returns true when a non-expired session exists in localStorage.
 * Clears the session automatically if any required key is missing or the
 * token has expired.
 */
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

/**
 * Generates a base64-encoded mock access token from a user object.
 * @param {{ username: string, email: string }} user
 * @returns {string} base64-encoded JSON payload
 */
export function generateMockAccessToken(user) {
  const payload = {
    username: user.username,
    email: user.email,
    issuedAt: Date.now(),
  };

  return btoa(JSON.stringify(payload));
}
