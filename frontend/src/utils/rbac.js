/**
 * Frontend RBAC Utility — SISF
 */

export const ROLES = {
  FARMER: "farmer",
  RESEARCHER: "researcher",
  ADMIN: "admin",
};

export const PERMISSIONS = {
  view_dashboard: ["farmer", "researcher", "admin"],
  view_device_status: ["farmer", "researcher", "admin"],
  trigger_pump: ["farmer", "researcher", "admin"],

  export_data: ["researcher", "admin"],
  view_raw_logs: ["researcher", "admin"],

  manage_devices: ["admin"],
  manage_users: ["admin"],
  edit_config: ["admin"],
};

/**
 * Check permission by role
 */
export function hasPermission(role, permission) {
  const allowed = PERMISSIONS[permission];
  return allowed ? allowed.includes(role) : false;
}

/**
 * Role helpers (optional convenience)
 */
export function isAdmin(role) {
  return role === ROLES.ADMIN;
}

export function isResearcher(role) {
  return role === ROLES.RESEARCHER;
}

export function isFarmer(role) {
  return role === ROLES.FARMER;
}