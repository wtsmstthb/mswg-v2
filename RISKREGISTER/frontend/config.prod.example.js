// Example only. Generate config.js from deployment outputs; do not commit real
// production identifiers into shared source control.
window.APP_CONFIG = Object.freeze({
  environment: "prod",
  apiBaseUrl: "__API_BASE_URL__",
  awsRegion: "__AWS_REGION__",
  cognito: Object.freeze({
    userPoolId: "__COGNITO_USER_POOL_ID__",
    clientId: "__COGNITO_CLIENT_ID__",
    hostedUiDomain: "__COGNITO_HOSTED_UI_DOMAIN__",
    redirectUri: "__COGNITO_REDIRECT_URI__",
    logoutUri: "__COGNITO_LOGOUT_URI__"
  })
});
