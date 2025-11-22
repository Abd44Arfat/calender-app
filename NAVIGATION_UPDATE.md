# Navigation Update - Create Event via FAB

## Changes Made

### 1. Removed Events Tab from Bottom Navigation
- The Events tab has been removed from the bottom navigation bar
- Bottom navigation now only shows: Home, Week, Notification, Profile

### 2. Moved Create Event Screen
- **Old location**: `app/(tabs)/events/create.tsx`
- **New location**: `app/events/create.tsx`
- The screen is now accessible via direct navigation, not as a tab

### 3. Updated Explore Screen (Calendar View)
- Added router import from `expo-router`
- Updated the Floating Action Button (FAB) for vendors
- FAB now navigates to `/events/create` instead of opening a modal
- Only visible for vendors (user type check)

### 4. File Structure
```
app/
├── (tabs)/
│   ├── explore.tsx      ← Calendar view with FAB
│   ├── index.tsx        ← Week view
│   ├── notifications.tsx
│   └── profile.tsx
└── events/
    └── create.tsx       ← Create event screen
```

## User Flow for Vendors

1. Vendor logs in and navigates to the Home tab (explore.tsx - calendar view)
2. Vendor sees a green floating action button (FAB) with a "+" icon in the bottom right
3. Vendor taps the FAB
4. App navigates to the Create Event screen (`/events/create`)
5. Vendor fills in event details and assigns users
6. Vendor taps "Create Event"
7. App navigates back to the calendar view
8. New event appears in the calendar

## Technical Details

### FAB Implementation in explore.tsx
```typescript
{user?.userType === 'vendor' && (
  <TouchableOpacity 
    style={styles.fab} 
    onPress={() => {
      router.push('/events/create');
    }}
  >
    <Ionicons name="add" size={24} color="white" />
  </TouchableOpacity>
)}
```

### Navigation
- Uses `expo-router` for navigation
- `router.push('/events/create')` - Navigate to create screen
- `router.back()` - Return to previous screen after creation

### Styling
- FAB positioned at bottom right (above tab bar)
- Green background (#4CAF50)
- White "+" icon
- Elevation/shadow for depth

## Benefits

1. **Cleaner Navigation**: Removed unnecessary tab, making navigation simpler
2. **Better UX**: FAB is a standard pattern for create actions
3. **Context-Aware**: Only vendors see the FAB
4. **Consistent**: Follows mobile app design patterns
5. **Flexible**: Easy to add more actions to the calendar view if needed

## Testing

1. Login as a vendor
2. Navigate to Home tab (calendar view)
3. Verify FAB appears in bottom right
4. Tap FAB
5. Verify Create Event screen opens
6. Create an event
7. Verify navigation back to calendar
8. Verify event appears in calendar
