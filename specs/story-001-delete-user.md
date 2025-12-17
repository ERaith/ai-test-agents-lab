# STORY-001 – Delete a user

As an admin, I want to delete a user from the system so that I can remove access for accounts that are no longer needed.

## Business Context

- Only admin users should be able to delete users.
- Non-admin users must never be able to delete.
- Deleting a user should not break other core flows.

## Acceptance Criteria

1. Admin can delete a user from the users table UI.
2. Backend `DELETE /users/:id` returns 204 on successful deletion.
3. After deletion, the user no longer appears in:
   - `GET /users`
   - The users table UI
4. Non-admin user attempting delete receives 403 and sees an appropriate error.
5. An audit entry is written for each successful deletion with:
   - Deleted user ID
   - Acting admin ID
   - Timestamp

## Testing Checklist (for this story)

- [ ] AI test plan created and saved
- [ ] Test plan reviewed/edited by SDET
- [ ] AI-generated test cases reviewed and accepted
- [ ] AI-generated Cypress skeleton created
- [ ] Skeleton refined with real selectors/data
- [ ] Cypress tests passing locally