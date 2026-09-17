/* Browser session checks support presentation only. APIs verify signatures and permissions. */
(() => {
  "use strict";
  function readToken(kind) {
    const key = `mswg_rr_${kind}_token`;
    return sessionStorage.getItem(key) || localStorage.getItem(key) || "";
  }
  function claimsFor(token, kind) {
    const config = window.APP_CONFIG;
    const cognito = config?.cognito;
    if (!cognito?.userPoolId || !cognito?.clientId || !config.awsRegion) return null;
    try {
      const parts = token.split(".");
      if (parts.length !== 3 || !parts[2]) return null;
      const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
      const claims = JSON.parse(decodeURIComponent(Array.from(json, char => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")));
      const issuer = `https://cognito-idp.${config.awsRegion}.amazonaws.com/${cognito.userPoolId}`;
      if (!claims.sub || claims.iss !== issuer || claims.token_use !== kind ||
          !Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000 ||
          (claims.nbf !== undefined && claims.nbf > Date.now() / 1000) ||
          (kind === "id" ? claims.aud : claims.client_id) !== cognito.clientId) return null;
      return claims;
    } catch { return null; }
  }
  function getAccessToken() {
    const token = readToken("access");
    return claimsFor(token, "access") ? token : "";
  }
  function readClaims() {
    const access = claimsFor(getAccessToken(), "access");
    const identity = claimsFor(readToken("id"), "id");
    return access && identity && access.sub === identity.sub ? identity : null;
  }
  function groups(claims) {
    const value = claims?.["cognito:groups"];
    return Array.isArray(value) ? value.filter(item => typeof item === "string") : [];
  }
  window.MSWG_SESSION = Object.freeze({ readClaims, getAccessToken, groups });
})();
