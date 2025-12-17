Feature: Delete User

  As an admin
  I want to delete a user from the system
  So that I can remove access for accounts that are no longer needed

  Background:
    Given the system has the following users:
      | id          | email              | role  |
      | admin-001   | admin@example.com  | admin |
      | user-001    | user@example.com   | user  |
      | delete-001  | deleteme@example.com | user |

  # ============================================================================
  # SMOKE TESTS - Critical Path
  # ============================================================================

  @story-001 @smoke @e2e @happy-path
  Scenario: Admin successfully deletes a user via UI
    Given I am logged in as "admin@example.com"
    And I am on the users management page
    When I click the delete button for user "deleteme@example.com"
    And I confirm the deletion in the dialog
    Then I should see a success message "User deleted successfully"
    And the user "deleteme@example.com" should not appear in the users table
    And an audit entry should be created for the deletion

  @story-001 @smoke @e2e @security
  Scenario: Non-admin user cannot see delete button
    Given I am logged in as "user@example.com"
    When I navigate to the users management page
    Then I should not see any delete buttons
    And the delete action should not be available

  @story-001 @smoke @e2e
  Scenario: Deleted user is removed from the users table
    Given I am logged in as "admin@example.com"
    And I have deleted the user "deleteme@example.com"
    When I view the users management page
    Then the user "deleteme@example.com" should not be visible
    And the total user count should be decreased by one

  # ============================================================================
  # AUTHORIZATION TESTS
  # ============================================================================

  @story-001 @regression @security
  Scenario: Non-admin receives 403 error when attempting to delete
    Given I am logged in as "user@example.com"
    When I attempt to delete user "delete-001" via the API
    Then the response status should be 403
    And I should see an error message "You do not have permission to perform this action"
    And the user "deleteme@example.com" should still exist in the system

  @story-001 @regression @security
  Scenario: Unauthenticated request cannot delete users
    Given I am not logged in
    When I send a DELETE request to "/users/delete-001"
    Then the response status should be 401
    And the user should not be deleted

  @story-001 @regression @security
  Scenario: Expired admin session cannot delete users
    Given I am logged in as "admin@example.com"
    And my session has expired
    When I attempt to delete user "delete-001"
    Then I should be redirected to the login page
    And the user should not be deleted

  # ============================================================================
  # UI BEHAVIOR TESTS
  # ============================================================================

  @story-001 @regression @ui
  Scenario: Delete confirmation dialog appears before deletion
    Given I am logged in as "admin@example.com"
    And I am on the users management page
    When I click the delete button for user "deleteme@example.com"
    Then I should see a confirmation dialog
    And the dialog should contain the user's email
    And the dialog should have "Cancel" and "Delete" buttons

  @story-001 @regression @ui
  Scenario: Canceling delete returns to user list without changes
    Given I am logged in as "admin@example.com"
    And I am on the users management page
    When I click the delete button for user "deleteme@example.com"
    And I click "Cancel" in the confirmation dialog
    Then the dialog should close
    And the user "deleteme@example.com" should still appear in the users table

  @story-001 @regression @ui
  Scenario: Success toast shown after deletion
    Given I am logged in as "admin@example.com"
    And I am on the users management page
    When I successfully delete the user "deleteme@example.com"
    Then I should see a success toast notification
    And the toast should disappear after a few seconds

  @story-001 @regression @error
  Scenario: Error toast shown when deletion fails
    Given I am logged in as "admin@example.com"
    And the backend is returning errors
    When I attempt to delete user "deleteme@example.com"
    Then I should see an error toast notification
    And the user should still appear in the users table

  # ============================================================================
  # API TESTS
  # ============================================================================

  @story-001 @api @smoke
  Scenario: DELETE /users/:id returns 204 for admin
    Given I am authenticated as an admin via API
    When I send a DELETE request to "/users/delete-001"
    Then the response status should be 204
    And the response body should be empty

  @story-001 @api @security
  Scenario: DELETE /users/:id returns 403 for non-admin
    Given I am authenticated as a regular user via API
    When I send a DELETE request to "/users/delete-001"
    Then the response status should be 403
    And the response body should contain an error message

  @story-001 @api @security
  Scenario: DELETE /users/:id returns 401 for unauthenticated requests
    Given I am not authenticated
    When I send a DELETE request to "/users/delete-001"
    Then the response status should be 401

  @story-001 @api @error
  Scenario: DELETE /users/:id returns 404 for non-existent user
    Given I am authenticated as an admin via API
    When I send a DELETE request to "/users/non-existent-id"
    Then the response status should be 404
    And the response should contain "User not found"

  @story-001 @api @smoke
  Scenario: GET /users excludes deleted user
    Given I am authenticated as an admin via API
    And I have deleted user "delete-001"
    When I send a GET request to "/users"
    Then the response should not contain user "delete-001"

  @story-001 @api @security
  Scenario: Deleted user cannot authenticate
    Given user "deleteme@example.com" has been deleted
    When I attempt to login as "deleteme@example.com"
    Then the authentication should fail
    And I should see "Invalid credentials"

  # ============================================================================
  # AUDIT TESTS
  # ============================================================================

  @story-001 @audit @compliance
  Scenario: Audit entry created with correct deleted user ID
    Given I am logged in as "admin@example.com"
    When I delete user "delete-001"
    Then an audit entry should be created
    And the audit entry should contain deleted user ID "delete-001"

  @story-001 @audit @compliance
  Scenario: Audit entry contains acting admin ID
    Given I am logged in as "admin@example.com"
    When I delete user "delete-001"
    Then the audit entry should contain admin ID "admin-001"

  @story-001 @audit @compliance
  Scenario: Audit entry has accurate timestamp
    Given I am logged in as "admin@example.com"
    When I delete user "delete-001" at "2024-12-17T10:30:00Z"
    Then the audit entry timestamp should be within 1 second of "2024-12-17T10:30:00Z"

  @story-001 @audit
  Scenario: Failed deletion does not create audit entry
    Given I am logged in as "admin@example.com"
    And the backend is configured to fail deletions
    When I attempt to delete user "delete-001"
    Then no audit entry should be created for this deletion

  # ============================================================================
  # EDGE CASE TESTS
  # ============================================================================

  @story-001 @regression @edge-case
  Scenario: Admin cannot delete themselves
    Given I am logged in as "admin@example.com"
    When I attempt to delete my own account
    Then I should see an error "Cannot delete your own account"
    And my account should not be deleted

  @story-001 @regression @edge-case
  Scenario: Deleting already-deleted user returns 404
    Given I am authenticated as an admin via API
    And user "delete-001" has already been deleted
    When I send a DELETE request to "/users/delete-001"
    Then the response status should be 404

  @story-001 @regression @edge-case
  Scenario: Rapid multiple delete requests are handled correctly
    Given I am authenticated as an admin via API
    When I send 3 DELETE requests for "/users/delete-001" simultaneously
    Then only one request should succeed with 204
    And the other requests should return 404
    And only one audit entry should be created
