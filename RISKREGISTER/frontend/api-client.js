(function createApiClient(){
  "use strict";

  async function request(path, options = {}){
    const baseUrl = window.APP_CONFIG?.apiBaseUrl;
    if (!baseUrl) throw new Error("The API base URL is not configured for this environment.");

    const headers = { "content-type": "application/json", ...(options.headers || {}) };
    const token = window.MSWG_SESSION.getAccessToken();
    if (!token) throw new Error("Please sign in with your company account.");
    headers.authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, { ...options, headers });
    } catch (error) {
      if (window.APP_CONFIG.environment === "local") {
        throw new Error("Cannot reach the local Risk Register server. Start the RR local server on port 3200, then reload this page.");
      }
      throw new Error("Cannot reach the Risk Register service. Check your connection and try again.");
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || `Request failed (${response.status})`);
      error.code = payload.code || "REQUEST_FAILED";
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function withQuery(path, values) {
    const query = new URLSearchParams();
    Object.entries(values || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
    });
    const suffix = query.toString();
    return suffix ? `${path}?${suffix}` : path;
  }

  const jsonBody = value => JSON.stringify(value);
  window.RISK_API = Object.freeze({
    request,
    listMine: () => request("/risks"),
    listAll: options => request(withQuery("/risks/all", {
      departmentId: options?.departmentId,
      includeArchived: options?.includeArchived
    })),
    create: risk => request("/risks", { method: "POST", body: jsonBody(risk) }),
    update: (riskId, risk) => request(`/risks/${encodeURIComponent(riskId)}`, { method: "PATCH", body: jsonBody(risk) }),
    history: riskId => request(`/risks/${encodeURIComponent(riskId)}/history`),
    archive: (departmentId, riskId) => request(`/risks/${encodeURIComponent(departmentId)}/${encodeURIComponent(riskId)}/archive`, { method: "POST", body: "{}" })
  });
})();
