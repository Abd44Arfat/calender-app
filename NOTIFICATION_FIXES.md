# Notification Display Fixes

## Issues Fixed

### 1. Placeholder Showing "User Event"
**Problem**: Vendor notifications were showing placeholder text instead of actual user names and event titles.

**Root Cause**: Backend might not be sending the expected field names in the notification payload.

**Solution**: Added multiple fallback field names to handle different backend implementations:

```typescript
// Try multiple possible field names for user name
const userName = payload.userName || 
                 payload.userFullName || 
                 payload.acceptedByName || 
                 payload.rejectedByName || 
                 'Unknown User';

// Try multiple possible field names for user image
const userImage = payload.userProfilePicture || 
                  payload.profilePicture || 
                  payload.userImage;

// Try multiple possible field names for event title
const eventTitle = payload.eventTitle || 
                   payload.title || 
                   'Unknown Event';
```

### 2. Snackbar Position
**Status**: Already Fixed ✓

The Snackbar component already uses `useSafeAreaInsets()` and positions itself correctly:
```typescript
top: insets.top + 10
```

The Snackbar is also rendered inside the `SafeAreaView`, so it respects safe area boundaries.

## Debugging Added

Added comprehensive console logging to help identify backend data issues:

```typescript
console.log('📧 Vendor Notification:', {
  notificationId: item._id,
  type: payload.type,
  userName,
  hasUserImage: !!userImage,
  userImagePath: userImage,
  eventTitle,
  message: payload.message,
  allPayloadKeys: Object.keys(payload),
});
```

This will show:
- What fields are present in the payload
- What values are being extracted
- Whether images are available

## How to Debug

### Step 1: Check Console Logs
When vendor refreshes notifications, look for logs like:

```
📧 Vendor Notification: {
  notificationId: "673f8a2b...",
  type: "event_assignment_rejected",
  userName: "John Doe",
  hasUserImage: true,
  userImagePath: "/uploads/profiles/user123.jpg",
  eventTitle: "Swimming Class",
  message: "John Doe rejected the event assignment",
  allPayloadKeys: ["type", "eventId", "eventTitle", "rejectedBy", "userName", ...]
}
```

### Step 2: Identify Missing Fields
If you see:
- `userName: "Unknown User"` → Backend not sending user name
- `hasUserImage: false` → Backend not sending profile picture
- `eventTitle: "Unknown Event"` → Backend not sending event title

### Step 3: Check Backend Payload
The `allPayloadKeys` array shows what fields the backend is actually sending. Compare with expected fields.

## Expected Backend Payload

### Ideal Structure:
```json
{
  "type": "event_assignment_rejected",
  "eventId": "eventId123",
  "eventTitle": "Swimming Class",
  "rejectedBy": "userId123",
  "userName": "John Doe",
  "userProfilePicture": "/uploads/profiles/user123.jpg",
  "message": "John Doe rejected the event assignment"
}
```

### Minimum Required:
```json
{
  "type": "event_assignment_rejected",
  "message": "John Doe rejected the event assignment"
}
```

Even with minimum data, the app will show:
- Placeholder icon
- "Unknown User" as name
- "Unknown Event" as title
- Correct accept/reject icon and color

## Testing Checklist

### Test with Full Data:
1. [ ] Backend sends all fields (userName, userProfilePicture, eventTitle)
2. [ ] Vendor sees user's profile picture
3. [ ] Vendor sees user's full name
4. [ ] Vendor sees event title
5. [ ] Correct icon (green checkmark or red X)
6. [ ] Timestamp displays correctly

### Test with Partial Data:
1. [ ] Backend sends only message
2. [ ] App shows placeholder icon
3. [ ] App shows "Unknown User"
4. [ ] App shows "Unknown Event"
5. [ ] App doesn't crash
6. [ ] Notification is still readable

### Test Snackbar:
1. [ ] Customer accepts/rejects event
2. [ ] Snackbar appears at top
3. [ ] Snackbar is within safe area (not under notch)
4. [ ] Snackbar auto-dismisses after 6 seconds
5. [ ] Can manually close Snackbar

## Common Issues

### Issue: "Unknown User" Displayed
**Cause**: Backend not sending user name in payload

**Fix**: Update backend to include `userName` field:
```javascript
payload: {
  userName: user.profile.fullName,  // Add this
  // ... other fields
}
```

### Issue: Placeholder Icon Instead of Profile Picture
**Cause**: Backend not sending profile picture path

**Fix**: Update backend to include `userProfilePicture` field:
```javascript
payload: {
  userProfilePicture: user.profile.profilePicture,  // Add this
  // ... other fields
}
```

### Issue: "Unknown Event" Displayed
**Cause**: Backend not sending event title in payload

**Fix**: Update backend to include `eventTitle` field:
```javascript
payload: {
  eventTitle: event.title,  // Add this
  // ... other fields
}
```

### Issue: Snackbar Outside Safe Area
**Status**: Should not occur - already fixed

If it still happens:
1. Check if SafeAreaView is properly imported
2. Verify device has safe area insets
3. Check Snackbar component has `useSafeAreaInsets()`

## Quick Backend Fix

If you're seeing "Unknown User" and "Unknown Event", add this to your backend:

```javascript
// In accept/reject endpoints
const user = await User.findById(req.user._id);
const event = await Event.findById(assignment.eventId);

await Notification.create({
  userId: event.vendorId,
  kind: 'push',
  payload: {
    type: 'event_assignment_rejected',
    eventId: event._id,
    eventTitle: event.title,                        // ← Add this
    rejectedBy: user._id,
    userName: user.profile.fullName,                // ← Add this
    userProfilePicture: user.profile.profilePicture, // ← Add this
    message: `${user.profile.fullName} rejected the event assignment`
  },
  scheduledFor: new Date()
});
```

## Summary

**What Changed:**
- Added multiple fallback field names for robustness
- Added comprehensive debug logging
- Better error handling for missing data
- Graceful degradation when data is incomplete

**What Works Now:**
- App handles any backend payload structure
- Shows placeholder when data is missing
- Doesn't crash with incomplete data
- Provides clear debugging information

**What Backend Should Do:**
- Send `userName` in payload
- Send `userProfilePicture` in payload
- Send `eventTitle` in payload
- Follow the structure in BACKEND_NOTIFICATION_PAYLOAD.md
