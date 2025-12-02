# Testing Checklist for App Store Resubmission

## Before Building

- [ ] Test registration flow WITHOUT providing date of birth
- [ ] Test registration flow WITH date of birth (to ensure it still works)
- [ ] Verify the label shows "Date of Birth (Optional)"
- [ ] Confirm no validation errors appear when skipping date of birth
- [ ] Test on both iOS simulator and physical device

## Build Process

- [ ] Update app version number in `app.json`
- [ ] Build production version: `eas build --platform ios --profile production`
- [ ] Test the production build thoroughly
- [ ] Ensure all other app features work correctly

## App Store Connect

- [ ] Upload new build to App Store Connect
- [ ] Update version notes mentioning the privacy compliance fix
- [ ] Reply to Apple's review message with the resolution details
- [ ] Resubmit for review

## Response to Apple

When replying to Apple's review message, include:

**Subject:** Resolution for Guideline 5.1.1 - Date of Birth Made Optional

**Message:**
"Thank you for your feedback regarding Guideline 5.1.1.

We have updated our app to make the Date of Birth field completely optional. Users can now:
- Complete registration without providing their date of birth
- The field is clearly labeled as 'Date of Birth (Optional)'
- No validation errors occur when this field is left empty

This change ensures we only collect personal information that is essential for our app's core functionality.

We have submitted a new build (version X.X.X) with these changes implemented.

Thank you for your consideration."

---

## Files Modified

- `/app/register.tsx` - Removed validation, updated label
- `/services/api.ts` - Made dob optional in TypeScript interface
- `/APP_STORE_RESOLUTION.md` - Documentation of changes

---

**Status:** Ready for testing and resubmission
