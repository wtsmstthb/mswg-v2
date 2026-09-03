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
  }),
  localMockClaims: Object.freeze({
    sub: "rr-local-viewer",
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
  }),
  localRoles: Object.freeze({
    viewer: Object.freeze({
      sub: "rr-local-viewer", name: "Lini Hazlinda",
      "custom:department_id": "corp-resources",
      "custom:application_role": "department-head-full-visibility",
      "cognito:groups": ["rr-app-users", "rr-department-heads", "rr-viewers-all", "rr-dept-corp-resources"]
    }),
    hod: Object.freeze({
      sub: "rr-local-hod", name: "Padma Devi",
      "custom:department_id": "it-training",
      "custom:application_role": "department-head",
      "cognito:groups": ["rr-app-users", "rr-department-heads", "rr-dept-it-training"]
    }),
    "cm-hod": Object.freeze({
      sub: "rr-local-cm-hod", name: "Rita Foo",
      "custom:department_id": "corp-monitoring",
      "custom:application_role": "department-head",
      "cognito:groups": ["rr-app-users", "rr-department-heads", "rr-dept-corp-monitoring"]
    })
  })
});
