import { apiFetch } from "./client";

export const adminLogin = (username, password) =>
  apiFetch("/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

