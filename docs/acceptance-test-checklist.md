# MSWG RR User Acceptance Checklist

**Test environment:** `dev`  
**Tested by:** ____________________  
**Date:** ____________________

Record Pass, Fail, or Not Tested and add a short note for any failure.

| Test | Expected result | Result | Notes |
|---|---|---|---|
| Sign in with a valid RR account | Dashboard opens and shows the correct user's name and department |  |  |
| Sign in with an account that has no RR entitlement | RR access is denied |  |  |
| Use the initial temporary password | User is required to set a new password |  |  |
| Use Forgot password | Verification and password reset complete without administrator intervention, where configured |  |  |
| Register a complete, valid risk | Risk is saved under the signed-in user's department |  |  |
| Submit a form with missing required fields or an invalid rating | Request is rejected with a clear validation message |  |  |
| Edit a risk created by the signed-in user | Changes are saved and visible |  |  |
| Try to edit a risk created by another user | Update is denied |  |  |
| Review risk history after an edit | Every successful update has an accurate before/after audit entry |  |  |
| Sign in as one department and inspect normal views | Only that department's active risks are visible |  |  |
| Attempt to supply another department/user in a request | Impersonation fields are ignored or rejected; access does not change |  |  |
| Sign in as a full-visibility user | Organization overview shows active risks from all departments |  |  |
| Sign in as an ordinary department user | Organization-wide and archived pages/actions are not displayed and direct access is denied |  |  |
| Archive an active risk as a full-visibility user | Risk leaves normal views, remains in archived view, and retains its history |  |  |
| Try to archive as a non-privileged user | Archive action is hidden and the API denies the request |  |  |
| Try to edit an archived risk | Update is denied |  |  |
| Check restore behavior | No restore action is available in the first release |  |  |
| Sign out | Session tokens are cleared and protected pages require a new login |  |  |
| Wait for or simulate token expiry | The application stops protected requests and asks the user to sign in again |  |  |
| Disable a test account | The account can no longer authenticate after current sessions expire/revocation is applied |  |  |
| Use the site on the approved production browser/device types | Navigation, tables, forms, and charts remain usable |  |  |

## Acceptance

- **Business owner:** ____________________  Date: __________
- **Finance/MSWG representative:** ____________________  Date: __________
- **Technical owner:** ____________________  Date: __________

