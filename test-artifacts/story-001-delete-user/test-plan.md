# Test Plan: story-001-delete-user

**Story:** Delete a User  
**Created:** 2024-12-17  
**Status:** Draft – Awaiting Review

---

## Summary

This test plan covers the admin user deletion functionality. This is a sensitive operation that requires proper authorization, audit logging, and data integrity verification. The focus is on ensuring only authorized admins can delete users and that all deletions are properly tracked.

### Key Risks
- **Authorization bypass** allowing non-admins to delete users
- **Audit trail gaps** making deletions untrackable
- **Data integrity issues** from orphaned references

---

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Non-admin can delete users via API | Low | Critical | Authorization tests at API level |
| Non-admin can delete users via UI bypass | Low | Critical | UI authorization + API defense in depth |
| Audit log not written on deletion | Medium | High | Verify audit entry after each deletion |
| Deleted user still appears in user list | Low | Medium | Verify removal from GET /users and UI |
| Deleting user breaks related data | Medium | High | Test cascade behavior, check for orphans |
| Admin can delete themselves | Medium | Medium | Test self-deletion prevention |
| Deleted user can still login | Low | Critical | Verify session invalidation |

---

## Test Groups

### E2E Tests - Smoke (Critical Path)

| ID | Test Case | Priority | Tags |
|----|-----------|----------|------|
| E2E-001 | Admin successfully deletes user via UI | Critical | @smoke @e2e @happy-path |
| E2E-002 | Non-admin cannot see delete button | Critical | @smoke @e2e @security |
| E2E-003 | Deleted user removed from users table | Critical | @smoke @e2e |

### E2E Tests - Authorization

| ID | Test Case | Priority | Tags |
|----|-----------|----------|------|
| E2E-004 | Non-admin user sees 403 error when attempting delete | Critical | @regression @security |
| E2E-005 | Unauthenticated user cannot access delete | Critical | @regression @security |
| E2E-006 | Admin with expired session cannot delete | High | @regression @security |

### E2E Tests - UI Behavior

| ID | Test Case | Priority | Tags |
|----|-----------|----------|------|
| E2E-007 | Delete confirmation dialog appears | High | @regression @ui |
| E2E-008 | Cancel delete returns to user list | Medium | @regression @ui |
| E2E-009 | Success toast shown after deletion | Medium | @regression @ui |
| E2E-010 | Error toast shown on deletion failure | Medium | @regression @error |

### API Tests

| ID | Test Case | Priority | Tags |
|----|-----------|----------|------|
| API-001 | DELETE /users/:id returns 204 for admin | Critical | @api @smoke |
| API-002 | DELETE /users/:id returns 403 for non-admin | Critical | @api @security |
| API-003 | DELETE /users/:id returns 401 for unauthenticated | Critical | @api @security |
| API-004 | DELETE /users/:id returns 404 for non-existent user | High | @api @error |
| API-005 | GET /users excludes deleted user | Critical | @api @smoke |
| API-006 | Deleted user cannot authenticate | High | @api @security |

### Audit Tests

| ID | Test Case | Priority | Tags |
|----|-----------|----------|------|
| AUD-001 | Audit entry created with correct deleted user ID | Critical | @audit @compliance |
| AUD-002 | Audit entry contains acting admin ID | Critical | @audit @compliance |
| AUD-003 | Audit entry has accurate timestamp | High | @audit @compliance |
| AUD-004 | Failed deletion does not create audit entry | Medium | @audit |

### Edge Cases

| ID | Test Case | Priority | Tags |
|----|-----------|----------|------|
| EDGE-001 | Admin cannot delete themselves | High | @regression @edge-case |
| EDGE-002 | Admin cannot delete another admin | Medium | @regression @edge-case |
| EDGE-003 | Rapid multiple delete requests handled correctly | Medium | @regression @edge-case |
| EDGE-004 | Delete already-deleted user returns 404 | Medium | @regression @edge-case |

---

## Test Data Requirements

### Test Users
```javascript
const adminUser = {
  id: 'admin-001',
  email: 'admin@example.com',
  role: 'admin',
};

const regularUser = {
  id: 'user-001', 
  email: 'user@example.com',
  role: 'user',
};

const userToDelete = {
  id: 'user-to-delete-001',
  email: 'deleteme@example.com',
  role: 'user',
};
```

### Database State
- Pre-seed with `adminUser`, `regularUser`, and `userToDelete`
- Reset state between tests to ensure `userToDelete` exists

---

## Environment Setup

1. **Database**: Seeded with test users
2. **Authentication**: Valid tokens for admin and non-admin
3. **Audit System**: Accessible for verification queries

---

## Open Questions

- [ ] TODO: Confirm if admin can delete other admins
- [ ] TODO: Verify audit log query method (API? Direct DB?)
- [ ] TODO: Clarify cascade delete behavior for user-owned data
- [ ] TODO: Determine soft-delete vs hard-delete approach
- [ ] TODO: Confirm session invalidation timing after deletion

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Planner Agent | AI | 2024-12-17 | Draft |
| SDET Reviewer | | | Pending |
| Security Team | | | Pending |

*This plan should be reviewed by a human before proceeding to test implementation.*
