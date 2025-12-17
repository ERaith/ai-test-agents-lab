# Story 002: User Registration

## Title
New User Registration Flow

## As a
Visitor to the platform

## I want to
Register for a new account

## So that
I can access the platform's features and save my preferences

## Acceptance Criteria

### AC1: Registration Form Display
- [ ] Registration page is accessible from the login page
- [ ] Form includes fields: email, password, confirm password, full name
- [ ] Password requirements are clearly displayed
- [ ] Terms of service checkbox is present

### AC2: Form Validation
- [ ] Email must be valid format
- [ ] Password must be at least 8 characters
- [ ] Password must contain: uppercase, lowercase, number, special character
- [ ] Passwords must match
- [ ] All required fields must be filled
- [ ] Real-time validation feedback is shown

### AC3: Successful Registration
- [ ] User receives confirmation email
- [ ] User is redirected to email verification page
- [ ] Success message is displayed
- [ ] User cannot login until email is verified

### AC4: Duplicate Email Handling
- [ ] System checks if email already exists
- [ ] Appropriate error message is shown
- [ ] No account details are leaked (security)

### AC5: API Behavior
- [ ] POST /api/auth/register creates new user
- [ ] Returns 201 on success with user ID
- [ ] Returns 400 for validation errors
- [ ] Returns 409 for duplicate email
- [ ] Password is never returned in response

## Technical Notes
- Passwords must be hashed with bcrypt (cost factor 12)
- Email verification token expires in 24 hours
- Rate limit: 5 registration attempts per IP per hour

## Out of Scope
- Social login (Google, GitHub)
- Phone number verification
- CAPTCHA (planned for future)

## Design Reference
Figma: [link to registration mockups]

## Priority
High - Core functionality

## Story Points
5
