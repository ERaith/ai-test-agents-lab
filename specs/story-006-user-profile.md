# Story 006: User Profile Management

## Title
View and Edit User Profile

## As a
Registered user

## I want to
View and update my profile information

## So that
I can keep my account details current

## Acceptance Criteria

### AC1: View Profile
- [ ] Profile accessible from user menu
- [ ] Displays: name, email, avatar, member since date
- [ ] Shows account type/subscription status
- [ ] Links to related settings (password, notifications, etc.)

### AC2: Edit Basic Information
- [ ] Edit button reveals editable form
- [ ] Can update: display name, bio, phone number
- [ ] Email change requires verification
- [ ] Changes saved with single "Save" button
- [ ] Cancel button discards changes

### AC3: Avatar Management
- [ ] Upload custom avatar image
- [ ] Crop/resize before saving
- [ ] Supported formats: JPG, PNG, GIF
- [ ] Max file size: 5MB
- [ ] Option to remove/reset to default

### AC4: Account Preferences
- [ ] Language preference
- [ ] Timezone setting
- [ ] Date format preference
- [ ] Theme preference (light/dark/system)

### AC5: Data Export
- [ ] "Download my data" option
- [ ] Exports all user data as JSON/ZIP
- [ ] Processing notification sent to email
- [ ] Download link expires after 24 hours

### AC6: Account Deletion
- [ ] "Delete account" option with strong warning
- [ ] Requires password confirmation
- [ ] Optional: specify reason for leaving
- [ ] Grace period of 30 days before permanent deletion
- [ ] Confirmation email sent

### AC7: API Endpoints
- [ ] GET /api/users/me - get current user profile
- [ ] PATCH /api/users/me - update profile
- [ ] POST /api/users/me/avatar - upload avatar
- [ ] DELETE /api/users/me/avatar - remove avatar
- [ ] POST /api/users/me/export - request data export
- [ ] DELETE /api/users/me - initiate account deletion

## Technical Notes
- Avatar stored in S3/CloudFront
- Generate multiple sizes on upload (thumbnail, medium, large)
- Use presigned URLs for avatar upload
- Data export runs as background job

## Privacy Considerations
- Profile visibility settings (public/private)
- Option to hide email from other users
- Audit log of profile changes

## Priority
Medium - User experience improvement

## Story Points
8
