/**
 * Frontend RBAC Utility — SISF
 * Dynamic: loads permission mapping from backend API,
 * falls back to defaults if API is unavailable.
 */

import { authFetch } from './session.js';

export const ROLES = {
  FARMER: 'farmer',
  RESEARCHER: 'researcher',
  ADMIN: 'admin',
};

// Hardcoded fallback (used until API data loads)
const DEFAULT_PERMISSIONS = {
  view_dashboard: ['farmer', 'researcher', 'admin'],
  view_device_status: ['farmer', 'researcher', 'admin'],
  trigger_pump: ['farmer', 'researcher', 'admin'],
  export_data: ['researcher', 'admin'],
  view_raw_logs: ['researcher', 'admin'],
  manage_devices: ['admin'],
  manage_users: ['admin'],
  manage_rbac: ['admin'],
  edit_config: ['admin'],
};

// Live permission mapping loaded from API
let livePermissions = null;

/**
 * Load role-permission mapping from the backend.
 * Called once after login or on app init.
 */
export async function loadRbacMapping() {
  try {
    const res = await authFetch('/api/rbac/role-permissions');
    if (!res.ok) throw new Error('Failed to load RBAC');
    const json = await res.json();
    if (json.status === 'ok' && json.data) {
      // Convert from { role: [perms] } to { perm: [roles] }
      const permMap = {};
      for (const [role, perms] of Object.entries(json.data)) {
        for (const perm of perms) {
          if (!permMap[perm]) permMap[perm] = [];
          permMap[perm].push(role);
        }
      }
      livePermissions = permMap;
    }
  } catch (err) {
    console.warn('[RBAC] Could not load from API, using defaults:', err.message);
    livePermissions = null;
  }
}

/**
 * Check permission by role.
 * Uses live data if available, otherwise falls back to defaults.
 */
export function hasPermission(role, permission) {
  const source = livePermissions || DEFAULT_PERMISSIONS;
  const allowed = source[permission];
  return allowed ? allowed.includes(role) : false;
}

/**
 * Force reload of RBAC mapping (e.g. after admin changes permissions)
 */
export async function refreshRbacMapping() {
  await loadRbacMapping();
}

// Convenience helpers
export function isAdmin(role) { return role === ROLES.ADMIN; }
export function isResearcher(role) { return role === ROLES.RESEARCHER; }
export function isFarmer(role) { return role === ROLES.FARMER; }