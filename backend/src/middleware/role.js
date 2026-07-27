/**
 * RBAC Middleware — SISF
 * Permission-based access control
 */

// ─────────────────────────────
// ROLE DEFINITIONS
// ─────────────────────────────

export const ROLES = ["farmer", "researcher", "admin"];

// ─────────────────────────────
// PERMISSION MAP
// ─────────────────────────────

export const PERMISSIONS = {
  // ALL ROLES
  view_dashboard: ["farmer", "researcher", "admin"],
  view_device_status: ["farmer", "researcher", "admin"],
  trigger_pump: ["farmer", "researcher", "admin"],

  // RESEARCHER + ADMIN
  export_data: ["researcher", "admin"],
  view_raw_logs: ["researcher", "admin"],

  // ADMIN ONLY
  manage_devices: ["admin"],
  manage_users: ["admin"],
  edit_config: ["admin"],
};

// ─────────────────────────────
// AUTHORIZATION MIDDLEWARE
// ─────────────────────────────

export function authorize(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const role = req.user.role;
    const allowedRoles = PERMISSIONS[permission];

    if (!allowedRoles) {
      return res.status(403).json({
        status: "error",
        message: `Unknown permission: ${permission}`,
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden: insufficient permissions",
      });
    }

    next();
  };
}