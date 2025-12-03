# App Store Resubmission Guide

## Step 1: Wait for Build to Complete
You are currently running `eas build --platform ios --profile production`. Wait for this to finish.
- If successful, it will give you a link or automatically upload to App Store Connect (depending on your `eas.json` config).
- If it doesn't auto-upload, you can run:
  ```bash
  eas submit -p ios
  ```
  and select the latest build.

## Step 2: Update App Store Connect
1. Log in to [App Store Connect](https://appstoreconnect.apple.com).
2. Go to **My Apps** -> **Quack Plan v1**.
3. Click on **App Store** (or the version currently in "Rejected" status, likely **1.0**).
4. Scroll down to the **Build** section.
   - Remove the old rejected build (click the red minus icon).
   - Click **Add Build** and select the new one you just created (it might take a few minutes to appear after upload).
5. **Save** the changes.

## Step 3: Reply to App Review (Crucial)
You must reply to the message from Apple in the **App Review** section (often called "Resolution Center").

**Copy and paste this message:**

***

**Subject:** Response to Rejection - Guideline 5.1.1 - Legal - Privacy

Dear App Review Team,

Thank you for your feedback regarding our submission (ID: 67df7aac-ad4e-46dd-b98b-312d46d4a8e7). We have addressed the issues raised in your review:

**1. Data Collection (Phone & Location):**
We have updated the app to make **Phone Number** and **Location** completely optional for users.
- In the Registration flow, these fields are now marked as "(Optional)" and the user can proceed without entering them.
- We have removed the validation logic that required these fields.

**2. Purpose Strings (Info.plist):**
We have updated the privacy usage descriptions in our `Info.plist` to be more specific and descriptive, including examples of usage:
- **NSPhotoLibraryUsageDescription**: "We need access to your photos to let you upload a profile picture "
- **NSLocationWhenInUseUsageDescription**: "We use your location to show events near you. This is optional."

We have uploaded a new build with these changes. We believe this resolves the privacy concerns.

Thank you for your time and review.

***

## Step 4: Resubmit
1. After attaching the new build and sending the reply, click **Submit for Review** (or **Resubmit**) at the top right of the page.
2. Ensure you answer "No" to any export compliance questions if they pop up (unless you added special encryption, which is unlikely for this update).

## "What's New in This Version" (Public Release Notes)
If you are asked to update the "What's New" text for the public store listing:
> "General performance improvements and bug fixes. Enhanced privacy settings for user profile."
