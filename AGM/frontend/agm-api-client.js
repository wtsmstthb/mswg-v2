/* Authenticated API client shared by the AGM assessment and record-list pages. */
(() => {
  async function request(path, options = {}) {
    const config = window.AGM_CONFIG;
    if (!config?.apiBaseUrl) throw new Error("AGM API is not configured");
    const headers = { "content-type": "application/json", ...(options.headers || {}) };
    const token = window.MSWG_SESSION.getAccessToken();
    if (!token) throw new Error("Please sign in with your company account.");
    headers.authorization = `Bearer ${token}`;
    const response = await fetch(`${config.apiBaseUrl}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || `Request failed (${response.status})`);
      error.code = payload.code;
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  window.agmApi = Object.freeze({
    create: assessment => request("/assessments", { method: "POST", body: assessment }),
    list: () => request("/assessments"),
    get: id => request(`/assessments/${encodeURIComponent(id)}`),
    save: (id, assessment) => request(`/assessments/${encodeURIComponent(id)}`, { method: "PATCH", body: assessment }),
    submit: (id, recordVersion) => request(`/assessments/${encodeURIComponent(id)}/submit`, { method: "POST", body: { record_version: recordVersion } }),
    review: (id, recordVersion, decision, comment) => request(`/assessments/${encodeURIComponent(id)}/review`, { method: "POST", body: { record_version: recordVersion, decision, comment } }),
    reopen: (id, recordVersion, reason) => request(`/assessments/${encodeURIComponent(id)}/reopen`, { method: "POST", body: { record_version: recordVersion, reason } }),
    history: id => request(`/assessments/${encodeURIComponent(id)}/history`)
  });
})();
