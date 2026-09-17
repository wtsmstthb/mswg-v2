// Environment-specific values. Deployment replaces this file with the outputs
// from the selected dev or prod infrastructure stack.
window.APP_CONFIG = Object.freeze({
  environment: "local",
  apiBaseUrl: "/api",
  awsRegion: "ap-southeast-1",
  cognito: Object.freeze({
    userPoolId: "",
    clientId: "",
    hostedUiDomain: "",
    redirectUri: "",
    logoutUri: ""
  })
});
