(() => {
  const claims = window.MSWG_SESSION.readClaims();
  window.APP_CONTEXT = Object.freeze({
    userName: claims?.name || claims?.["cognito:username"] || claims?.email || "User",
    isAuthenticated: Boolean(claims)
  });
  if (!claims) window.location.replace("../../RISKREGISTER/frontend/login.html");
  window.preVotingFetch = (url, options = {}) => {
    const token = window.MSWG_SESSION.getAccessToken();
    if (!token) return Promise.reject(new Error("Please sign in with your company account."));
    const headers = new Headers(options.headers);
    headers.set("authorization", `Bearer ${token}`);
    return fetch(url, { ...options, headers });
  };
})();
