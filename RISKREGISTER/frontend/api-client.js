(function createApiClient(){
  "use strict";

  async function request(path, options = {}){
    const baseUrl = window.APP_CONFIG?.apiBaseUrl;
    if (!baseUrl) throw new Error("The API base URL is not configured for this environment.");

    const token = sessionStorage.getItem("mswg_rr_access_token") ||
      localStorage.getItem("mswg_rr_access_token") ||
      sessionStorage.getItem("mswg_rr_id_token") ||
      localStorage.getItem("mswg_rr_id_token");
    if (!token) throw new Error("Your session has expired. Please sign in again.");

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
    return payload;
  }

  window.RISK_API = Object.freeze({ request });
})();
