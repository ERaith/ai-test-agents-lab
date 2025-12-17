# Story 004: Password Reset Flow

## Title
Reset Forgotten Password

## As a
Registered user who forgot my password

## I want to
Reset my password securely

## So that
I can regain access to my account

## Acceptance Criteria

### AC1: Request Password Reset
- [ ] "Forgot Password" link on login page
- [ ] Form accepts email address
- [ ] Same success message shown whether email exists or not (security)
- [ ] Rate limited to prevent abuse

### AC2: Reset Email
- [ ] Email sent within 30 seconds
- [ ] Email contains secure reset link
- [ ] Link expires after 1 hour
- [ ] Email includes security notice if user didn't request

### AC3: Reset Password Page
- [ ] Link opens password reset form
- [ ] Expired links show appropriate message
- [ ] Used links cannot be reused
- [ ] Form requires new password + confirmation

### AC4: Password Requirements
- [ ] Same requirements as registration
- [ ] Cannot reuse last 5 passwords
- [ ] Real-time validation feedback

### AC5: Successful Reset
- [ ] Password updated in database
- [ ] All existing sessions invalidated
- [ ] Confirmation email sent
- [ ] User redirected to login page
- [ ] Success message displayed

### AC6: API Endpoints
- [ ] POST /api/auth/forgot-password - initiates reset
- [ ] GET /api/auth/reset-password/:token - validates token
- [ ] POST /api/auth/reset-password/:token - sets new password

## Security Requirements
- Reset tokens must be cryptographically random
- Tokens stored hashed in database
- Log all password reset attempts
- Alert user of reset attempts via email
- Implement exponential backoff for repeated requests

## Technical Notes
- Use crypto.randomBytes(32) for token generation
- Token format: base64url encoded
- Store token hash, not plaintext
- Include user agent and IP in reset email

## Out of Scope
- Security questions
- SMS verification
- Admin-initiated password reset

## Priority
High - Security critical

## Story Points
5
