export function saveAuthSession(data) {
  if (typeof window === "undefined") return;
  localStorage.setItem("authToken", data.token || "");
  localStorage.setItem("authUser", JSON.stringify(data.user || null));
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  const rawUser = localStorage.getItem("authUser");
  if (!rawUser) return null;
  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
}

export function getDashboardPath(role) {
  if (role === "admin") return "/admin/providers";
  if (role === "provider") return "/dashboard/provider";
  return "/dashboard/customer";
}
