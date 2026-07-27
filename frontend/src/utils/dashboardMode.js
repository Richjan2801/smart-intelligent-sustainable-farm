import { getUserRole } from "./session";

export function getDashboardMode() {
  const role = getUserRole();

  switch (role) {
    case "farmer":
      return "FARMER_MODE";
    case "researcher":
      return "RESEARCHER_MODE";
    case "admin":
      return "ADMIN_MODE";
    default:
      return "FARMER_MODE";
  }
}

export function isFarmerMode() {
  return getDashboardMode() === "FARMER_MODE";
}

export function isResearcherMode() {
  return getDashboardMode() === "RESEARCHER_MODE";
}

export function isAdminMode() {
  return getDashboardMode() === "ADMIN_MODE";
}