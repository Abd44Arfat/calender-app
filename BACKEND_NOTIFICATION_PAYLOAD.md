# Backend Notification Payload Requirements

## Overview
For vendor notifications to display user profile images, the backend must include user information in the notification payload.

## Required Notification Structure

### When User Accepts Event (ACTUAL BACKEND STRUCTURE)

```json
{
  "_id": "notificationId123",
  "userId": "vendorId",
  "kind": "push",
  "payload": {
    "type": "event_assignment_accepted",
    "eventId": "eventId123",
    "eventTitle": "Swimming Class",
    "acceptedBy": {
      "id": "userId123",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "image": "/uploads/profiles/userId123-1234567890.jpg"
    },
    "message": "John Doe accepted the event assignment"
  },
  "scheduledFor": "2025-11-22T10:00:00Z",
  "sentAt": null,
  "createdAt": "2025-11-22T10:00:00Z"
}
```

### When User Rejects Event (ACTUAL BACKEND STRUCTURE)

```json
{
  "_id": "notificationId456",
  "userId": "vendorId",
  "kind": "push",
  "payload": {
    "type": "event_assignment_rejected",
    "eventId": "eventId123",
    "eventTitle": "Swimming Class",
    "rejectedBy": {
      "id": "userId456",
      "name": "Jane Smith",
      "email": "jane.smith@example.com",
      "image": "/uploads/profiles/userId456-1234567890.jpg"
    },
    "message": "Jane Smith rejected the event assignment"
  },
  "scheduledFor": "2025-11-22T10:00:00Z",
  "sentAt": null,
  "createdAt": "2025-11-22T10:00:00Z"
}
```

## Required Payload Fields

### Essential Fields:
- `type`: "event_assignment_accepted" or "event_assignment_rejected"
- `eventId`: ID of the event
- `eventTitle`: Title of the event
- `message`: Human-readable message

### User Object (acceptedBy or rejectedBy):
- `id`: User ID who responded
- `name`: Full name of the user
- `email`: User's email address
- `image`: Path to user's profile picture (can be null)

## Backend Implementation Example

### Accept Endpoint (ACTUAL IMPLEMENTATION)
```javascript
// POST /api/event-assignments/:id/accept
router.post('/:id/accept', auth, async (req, res) => {
  const assignment = await EventAssignment.findById(req.params.id)
    .populate('eventId');
  
  // Update assignment
  assignment.status = 'accepted';
  assignment.respondedAt = new Date();
  await assignment.save();
  
  // Get user details
  const user = await User.findById(req.user._id);
  
  // CREATE NOTIFICATION FOR VENDOR WITH USER INFO
  const event = await Event.findById(assignment.eventId);
  await Notification.create({
    userId: event.vendorId,
    kind: 'push',
    payload: {
      type: 'event_assignment_accepted',
      eventId: assignment.eventId._id,
      eventTitle: assignment.eventId.title,
      acceptedBy: {                                       // ← User object
        id: req.user._id,
        name: user.profile.fullName,
        email: user.email,
        image: user.profile.profilePicture
      },
      message: `${user.profile.fullName} accepted the event assignment`
    },
    scheduledFor: new Date()
  });
  
  res.json(assignment);
});
```

### Reject Endpoint (ACTUAL IMPLEMENTATION)
```javascript
// POST /api/event-assignments/:id/reject
router.post('/:id/reject', auth, async (req, res) => {
  const assignment = await EventAssignment.findById(req.params.id)
    .populate('eventId');
  
  // Update assignment
  assignment.status = 'rejected';
  assignment.respondedAt = new Date();
  await assignment.save();
  
  // Get user details
  const user = await User.findById(req.user._id);
  
  // CREATE NOTIFICATION FOR VENDOR WITH USER INFO
  const event = await Event.findById(assignment.eventId);
  await Notification.create({
    userId: event.vendorId,
    kind: 'push',
    payload: {
      type: 'event_assignment_rejected',
      eventId: assignment.eventId._id,
      eventTitle: assignment.eventId.title,
      rejectedBy: {                                       // ← User object
        id: req.user._id,
        name: user.profile.fullName,
        email: user.email,
        image: user.profile.profilePicture
      },
      message: `${user.profile.fullName} rejected the event assignment`
    },
    scheduledFor: new Date()
  });
  
  res.json(assignment);
});
```

## Mobile App Implementation

The mobile app extracts user information from the nested user object:

```typescript
const renderVendorNotification = ({ item }: { item: any }) => {
  const payload = item.payload || {};
  const isAccepted = payload.type === 'event_assignment_accepted';
  
  // Extract user info from nested acceptedBy or rejectedBy object
  const userObject = payload.acceptedBy || payload.rejectedBy;
  const userName = userObject?.name || 'Unknown User';
  const userImage = userObject?.image;
  const userEmail = userObject?.email;
  
  return (
    <View>
      {/* Show user profile image */}
      {userImage ? (
        <Image source={{ uri: getImageUrl(userImage) }} />
      ) : (
        <View>{/* Placeholder */}</View>
      )}
      
      {/* Show user name and action */}
      <Text>{userName}</Text>
      {userEmail && <Text>{userEmail}</Text>}
      <Text>{isAccepted ? 'Accepted' : 'Rejected'} your event</Text>
      <Text>{payload.eventTitle}</Text>
    </View>
  );
};
```

## Fallback Behavior

If the backend doesn't include user information:
- App will show a generic person icon placeholder
- App will display "User" as the name
- Notification will still work, just without the profile image

## Testing

### Test Accept Notification:
1. Customer accepts an event
2. Check notification in database
3. Verify payload includes:
   - `userName`: "John Doe"
   - `userProfilePicture`: "/uploads/profiles/..."
4. Vendor refreshes notifications
5. Should see John Doe's profile picture

### Test Reject Notification:
1. Customer rejects an event
2. Check notification in database
3. Verify payload includes user info
4. Vendor refreshes notifications
5. Should see user's profile picture with red icon

## Migration for Existing Notifications

If you have existing notifications without user info, you can:

1. **Option A**: Ignore them (they'll show placeholder)
2. **Option B**: Run a migration script:

```javascript
// Migration script
const notifications = await Notification.find({
  'payload.type': { 
    $in: ['event_assignment_accepted', 'event_assignment_rejected'] 
  },
  'payload.userName': { $exists: false }
});

for (const notif of notifications) {
  const userId = notif.payload.acceptedBy || notif.payload.rejectedBy;
  const user = await User.findById(userId);
  
  if (user) {
    notif.payload.userName = user.profile.fullName;
    notif.payload.userProfilePicture = user.profile.profilePicture;
    await notif.save();
  }
}
```

## Summary

**What Changed:**
- Mobile app now displays user profile images in vendor notifications
- Shows user name prominently
- Better visual indication of who accepted/rejected

**What Backend Needs to Do:**
- Include `userName` in notification payload
- Include `userProfilePicture` in notification payload
- Fetch user details before creating notification

**Benefits:**
- Vendors can see at a glance who responded
- More personal and engaging notifications
- Consistent with the rest of the app's design
