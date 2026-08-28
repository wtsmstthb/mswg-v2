// Environment-specific values. Deployment replaces this file with the outputs
// from the selected dev or prod infrastructure stack.
window.APP_CONFIG = Object.freeze({
  environment: "local",
  apiBaseUrl: "",
  awsRegion: "ap-southeast-1",
  cognito: Object.freeze({
    userPoolId: "",
    clientId: "",
    hostedUiDomain: "",
    redirectUri: "",
    logoutUri: ""
  }),
  localMockClaims: Object.freeze({
    sub: "local-lini-hazlinda",
    name: "Lini Hazlinda",
    email: "",
    "custom:department_id": "corp-resources",
    "custom:application_role": "department-head-full-visibility",
    "cognito:groups": [
      "rr-app-users",
      "rr-department-heads",
      "rr-viewers-all",
      "rr-dept-corp-resources"
    ]
  })
});
