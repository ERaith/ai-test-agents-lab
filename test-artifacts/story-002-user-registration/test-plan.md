# Test Plan: story-002-user-registration

**Story:** User Registration Flow  
**Created:** 2024-12-17  
**Status:** Draft – Awaiting Review

---

## Summary

This test plan covers the user registration functionality, including form validation, successful registration flow, error handling, and API behavior. The registration flow is a critical path for user acquisition, making comprehensive testing essential.

### Key Risks
- **Security vulnerabilities** in password handling and email enumeration
- **Poor UX** from unclear validation messages
- **Data integrity** issues with duplicate accounts

---

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Password stored in plaintext or weak hash | Low | Critical | Verify bcrypt with cost factor 12; never log passwords |
| Email enumeration attack (duplicate email reveals account exists) | Medium | High | Use identical error messages for "email exists" vs other errors |
| SQL injection via form fields | Low | Critical | Use parameterized queries; test with injection payloads |
| Rate limiting bypass | Medium | Medium | Test rate limit enforcement from multiple IPs |
| XSS via name/email fields | Medium | High | Verify input sanitization and output encoding |
| Email verification token predictable | Low | Critical | Verify tokens are cryptographically random |
| Registration completes without email verification | Low | High | Verify login blocked until verified |
| Passwords don't match but form submits | Low | Medium | Client and server-side validation tests |

---

## Test Groups

### E2E Tests - Smoke (Critical Path)

| ID | Test Case | Priority | Tags |
|----|-----------|----------|------|
| E2E-001 | Happy path: Complete registration with valid data | Critical | @smoke @e2e @happy-path |
| E2E-002 | Navigate to registration from login page | Critical | @smoke @e2e @navigation |
| E2E-003 | Form displays all required fields | High | @smoke @e2e @ui |
| E2E-004 | Password requirements are visible | High | @smoke @e2e @ui |

### E2E Tests - Form Validation

| ID | Test Case | Priority | Tags |
|----|-----------|----------|------|
| E2E-005 | Invalid email format shows error | High | @regression @validation |
| E2E-006 | Password less than 8 chars shows error | High | @regression @validation |
| E2E-007 | Password missing uppercase shows error | High | @regression @validation |
| E2E-008 | Password missing lowercase shows error | High | @regression @validation |
| E2E-009 | Password missing number shows error | High | @regression @validation |
| E2E-010 | Password missing special char shows error | High | @regression @validation |
| E2E-011 | Passwords don't match shows error | High | @regression @validation |
| E2E-012 | Empty required fields show errors | High | @regression @validation |
| E2E-013 | Real-time validation updates as user types | Medium | @regression @ux |
| E2E-014 | Terms checkbox required for submission | High | @regression @validation |

### E2E Tests - Error Handling

| ID | Test Case | Priority | Tags |
|----|-----------|----------|------|
| E2E-015 | Duplicate email shows appropriate error | High | @regression @error |
| E2E-016 | Network error during submission shows retry option | Medium | @regression @error |
| E2E-017 | Server error (500) shows friendly message | Medium | @regression @error |

### E2E Tests - Security

| ID | Test Case | Priority | Tags |
|----|-----------|----------|------|
| E2E-018 | Password field is masked | High | @smoke @security |
| E2E-019 | Password not visible in network requests (HTTPS) | Critical | @security |
| E2E-020 | Form protected against CSRF | High | @security |
| E2E-021 | XSS payloads in name field are sanitized | High | @security |

### API Tests

| ID | Test Case | Priority | Tags |
|----|-----------|----------|------|
| API-001 | POST /api/auth/register - valid data returns 201 | Critical | @api @smoke |
| API-002 | POST /api/auth/register - returns user ID (not password) | Critical | @api @security |
| API-003 | POST /api/auth/register - invalid email returns 400 | High | @api @validation |
| API-004 | POST /api/auth/register - weak password returns 400 | High | @api @validation |
| API-005 | POST /api/auth/register - duplicate email returns 409 | High | @api @error |
| API-006 | POST /api/auth/register - missing fields returns 400 | High | @api @validation |
| API-007 | Rate limiting enforced after 5 attempts | High | @api @security |
| API-008 | Response time under 500ms | Medium | @api @performance |

### Integration Tests - Email Verification

| ID | Test Case | Priority | Tags |
|----|-----------|----------|------|
| INT-001 | Confirmation email sent after registration | Critical | @integration @email |
| INT-002 | Email contains valid verification link | Critical | @integration @email |
| INT-003 | Verification token expires after 24 hours | High | @integration @email |
| INT-004 | User cannot login before email verification | Critical | @integration @auth |
| INT-005 | User can login after email verification | Critical | @integration @auth |

---

## Test Data Requirements

### Valid Test Users
```javascript
const validUser = {
  email: 'test.user@example.com',
  password: 'SecurePass123!',
  confirmPassword: 'SecurePass123!',
  fullName: 'Test User'
};
```

### Invalid Data Variations
- Invalid emails: `'notanemail'`, `'missing@domain'`, `'@nodomain.com'`
- Weak passwords: `'short'`, `'nouppercase1!'`, `'NOLOWERCASE1!'`, `'NoNumbers!'`, `'NoSpecial123'`
- Mismatched passwords: password ≠ confirmPassword
- XSS payloads: `'<script>alert("xss")</script>'`
- SQL injection: `"'; DROP TABLE users; --"`

### Existing User for Duplicate Tests
```javascript
const existingUser = {
  email: 'existing@example.com',
  // Pre-seeded in test database
};
```

---

## Environment Setup

1. **Database**: Clean state with only `existingUser` seeded
2. **Email Service**: Mock/intercept to capture verification emails
3. **Rate Limiting**: Reset between test runs
4. **HTTPS**: Required for security tests

---

## Open Questions

- [ ] TODO: Confirm exact password requirement error messages with UX team
- [ ] TODO: Verify rate limiting implementation details (per IP? per email?)
- [ ] TODO: Get list of blocked/reserved email domains
- [ ] TODO: Confirm email verification page URL structure
- [ ] TODO: Define acceptable response time SLA for registration endpoint
- [ ] TODO: Clarify behavior when verification email fails to send

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Planner Agent | AI | 2024-12-17 | Draft |
| SDET Reviewer | | | Pending |
| Product Owner | | | Pending |

*This plan should be reviewed by a human before proceeding to test implementation.*
