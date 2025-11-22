# Notification Debugging Guide

## Issue
Vendor not receiving notifications when users reject events.

## What Should Happen (According to API Docs)

When a user **accepts** an event assignment:
1. User calls `POST /api/event-assignments/:id/accept`
2. Backend updates assignment status to "accepted"
3. Backend creates notification for vendor with type `event_assignment_accepted`
4. Vendor sees notification in their notifications tab

When a user **rejects** an event assignment:
1. User calls `POST /api/event-assignments/:id/reject`
2. Backend updates assignment status to "rejected"
3. Backend creates notification for vendor with type `event_assignment_rejected`
4. Vendor sees notification in their notifications tab

## Changes Made to Debug

### 1. Updated Vendor Notification Loading
**File**: `app/(tabs)/notifications.tsx`

Changed from filtering by type in the API call to fetching all notifications and filtering client-side:

```typescript
// OLD (might not work if backend doesn't support comma-separated types)
const response = await apiService.getNotifications(token, {
  type: 'event_assignment_accepted,event_assignment_rejected',
  limit: 50,
});

// NEW (fetch all, filter client-side)
const response = await apiService.getNotifications(token, {
  limit: 100,
});

const filteredNotifications = (response.notifications || []).filter((notif: any) => {
  const type = notif.payload?.type || notif.type;
  return type === 'event_assignment_accepted' || type === 'event_assignment_rejected';
});
```

### 2. Added Console Logging
Added logging to track:
- All notifications received from backend
- Filtered notifications
- Accept/reject responses
- Any errors

### 3. Updated Success Messages
Changed messages to confirm vendor notification:
- Accept: "Event accepted! It will appear in your calendar. Vendor has been notified."
- Reject: "Event rejected. Vendor has been notified."

## How to Debug

### Step 1: Check Backend Logs
When a user rejects an event, check your backend logs for:
```
POST /api/event-assignments/:assignmentId/reject
```

Verify that:
1. The request succeeds (200 status)
2. A notification is created for the vendor
3. The notification has the correct type: `event_assignment_rejected`

### Step 2: Check Mobile App Console
After a user rejects an event, check the console for:

```
Rejecting assignment: [assignmentId]
Reject response: [response object]
```

### Step 3: Check Vendor Notifications API
As a vendor, check the raw API response:

```
All notifications: [array of all notifications]
Filtered notifications: [array of filtered notifications]
```

### Step 4: Verify Notification Structure
Check if notifications have the expected structure:

```json
{
  "_id": "notificationId123",
  "userId": "vendorId",
  "kind": "push",
  "payload": {
    "type": "event_assignment_rejected",
    "eventId": "eventId123",
    "rejectedBy": "userId123",
    "message": "John Doe rejected the event assignment"
  },
  "scheduledFor": "2025-11-22T10:00:00Z",
  "sentAt": null,
  "createdAt": "2025-11-22T10:00:00Z"
}
```

## Common Issues and Solutions

### Issue 1: Backend Not Creating Notifications
**Symptom**: Console shows successful reject, but no notifications appear

**Solution**: Check backend code to ensure notifications are being created in the reject endpoint:
```javascript
// Backend should do this:
await Notification.create({
  userId: event.vendorId,
  kind: 'push',
  payload: {
    type: 'event_assignment_rejected',
    eventId: assignment.eventId,
    rejectedBy: userId,
    message: `${user.profile.fullName} rejected the event assignment`
  },
  scheduledFor: new Date()
});
```

### Issue 2: Wrong Notification Type
**Symptom**: Notifications exist but don't appear in vendor's list

**Solution**: Check the notification type field. It should be either:
- `payload.type === 'event_assignment_rejected'`
- OR `type === 'event_assignment_rejected'`

Our filter checks both locations.

### Issue 3: Vendor ID Mismatch
**Symptom**: Notifications created but not showing for vendor

**Solution**: Verify that:
1. Notification `userId` matches the vendor's `_id`
2. The event's `vendorId` is correct
3. The vendor is logged in with the correct account

### Issue 4: API Parameter Format
**Symptom**: Type filter not working in API call

**Solution**: Backend might not support comma-separated types. Our new implementation fetches all notifications and filters client-side, which should work regardless.

## Testing Checklist

### As Customer:
1. [ ] Login as customer
2. [ ] Go to Notifications tab
3. [ ] See pending event assignment
4. [ ] Click "Reject"
5. [ ] Confirm rejection
6. [ ] Check console for "Rejecting assignment" log
7. [ ] Check console for "Reject response" log
8. [ ] Verify success message appears

### As Vendor:
1. [ ] Login as vendor (different account)
2. [ ] Go to Notifications tab
3. [ ] Pull down to refresh
4. [ ] Check console for "All notifications" log
5. [ ] Check console for "Filtered notifications" log
6. [ ] Verify rejection notification appears
7. [ ] Verify it shows:
   - Event title
   - User who rejected
   - Timestamp
   - Red icon

### Backend Verification:
1. [ ] Check database for notification document
2. [ ] Verify notification has correct vendorId
3. [ ] Verify notification type is correct
4. [ ] Check backend logs for notification creation

## Quick Test

Run this in your backend console/API client:

```javascript
// Get all notifications for a vendor
GET /api/notifications
Authorization: Bearer <vendor-token>

// Should return array including rejection notifications
```

## Expected Console Output

When working correctly, you should see:

```
// Customer side (when rejecting):
Rejecting assignment: 673f8a2b1c2d3e4f5a6b7c8d
Reject response: { _id: "673f8a2b1c2d3e4f5a6b7c8d", status: "rejected", ... }

// Vendor side (when refreshing notifications):
All notifications: [
  { _id: "...", payload: { type: "event_assignment_rejected", ... } },
  { _id: "...", payload: { type: "event_assignment_accepted", ... } },
  ...
]
Filtered notifications: [
  { _id: "...", payload: { type: "event_assignment_rejected", ... } }
]
```

## Next Steps

1. Test with the updated code
2. Check console logs on both customer and vendor sides
3. If notifications still don't appear, check backend implementation
4. Verify backend is creating notifications with correct structure
5. Check database directly to see if notifications exist

## Backend Implementation Reference

Your backend should have something like this in the reject endpoint:

```javascript
// POST /api/event-assignments/:id/reject
router.post('/:id/reject', auth, async (req, res) => {
  const assignment = await EventAssignment.findById(req.params.id);
  
  // Update assignment
  assignment.status = 'rejected';
  assignment.respondedAt = new Date();
  await assignment.save();
  
  // CREATE NOTIFICATION FOR VENDOR
  const event = await Event.findById(assignment.eventId);
  await Notification.create({
    userId: event.vendorId,
    kind: 'push',
    payload: {
      type: 'event_assignment_rejected',
      eventId: assignment.eventId,
      rejectedBy: req.user._id,
      message: `${req.user.profile.fullName} rejected the event assignment`
    },
    scheduledFor: new Date()
  });
  
  res.json(assignment);
});
```

If this code is missing or different, that's the issue!
