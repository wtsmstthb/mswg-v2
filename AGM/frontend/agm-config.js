/* Environment-specific AGM configuration. Replace this file during AWS deployment. */
(() => {
  const parameters = new URLSearchParams(window.location.search);
  const requestedRole = parameters.get("role");
  if (["analyst", "hod"].includes(requestedRole)) localStorage.setItem("mswg_agm_local_role", requestedRole);
  window.AGM_CONFIG = Object.freeze({
    environment: "local",
    apiBaseUrl: "/api/agm",
    localRole: requestedRole || localStorage.getItem("mswg_agm_local_role") || "analyst"
  });
})();
