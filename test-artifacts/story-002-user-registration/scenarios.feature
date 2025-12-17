Feature: User Registration Flow

  As a visitor to the platform
  I want to register for a new account
  So that I can access the platform's features and save my preferences

  Background:
    Given the application is running
    And I am on the registration page

  # ============================================================================
  # SMOKE TESTS - Critical Path
  # ============================================================================

  @story-002 @smoke @e2e @happy-path
  Scenario: Successful registration with valid data
    Given I have not registered before
    When I fill in the registration form with valid data:
      | field           | value              |
      | fullName        | Test User          |
      | email           | newuser@example.com|
      | password        | SecurePass123!     |
      | confirmPassword | SecurePass123!     |
    And I accept the terms of service
    And I click the register button
    Then I should see a success message
    And I should be redirected to the email verification page
    And I should receive a confirmation email

  @story-002 @smoke @e2e @navigation
  Scenario: Navigate to registration from login page
    Given I am on the login page
    When I click the "Sign up" link
    Then I should be on the registration page
    And I should see the registration form

  @story-002 @smoke @e2e @ui
  Scenario: Registration form displays all required fields
    Then I should see the following form fields:
      | field           | type     | required |
      | fullName        | text     | yes      |
      | email           | email    | yes      |
      | password        | password | yes      |
      | confirmPassword | password | yes      |
    And I should see a terms of service checkbox
    And I should see the password requirements

  # ============================================================================
  # VALIDATION TESTS - Email
  # ============================================================================

  @story-002 @regression @validation
  Scenario Outline: Invalid email format shows validation error
    When I enter "<invalid_email>" in the email field
    And I click outside the email field
    Then I should see an email validation error
    And the submit button should be disabled

    Examples:
      | invalid_email    |
      | notanemail       |
      | missing@domain   |
      | @nodomain.com    |
      | spaces in@email.com |

  # ============================================================================
  # VALIDATION TESTS - Password Requirements
  # ============================================================================

  @story-002 @regression @validation
  Scenario: Password less than 8 characters shows error
    When I enter "Short1!" in the password field
    Then I should see an error "Password must be at least 8 characters"

  @story-002 @regression @validation
  Scenario: Password missing uppercase shows error
    When I enter "lowercase123!" in the password field
    Then I should see an error "Password must contain an uppercase letter"

  @story-002 @regression @validation
  Scenario: Password missing lowercase shows error
    When I enter "UPPERCASE123!" in the password field
    Then I should see an error "Password must contain a lowercase letter"

  @story-002 @regression @validation
  Scenario: Password missing number shows error
    When I enter "NoNumbers!!" in the password field
    Then I should see an error "Password must contain a number"

  @story-002 @regression @validation
  Scenario: Password missing special character shows error
    When I enter "NoSpecial123" in the password field
    Then I should see an error "Password must contain a special character"

  @story-002 @regression @validation
  Scenario: Passwords do not match shows error
    When I enter "SecurePass123!" in the password field
    And I enter "DifferentPass123!" in the confirm password field
    And I click outside the confirm password field
    Then I should see an error "Passwords do not match"

  @story-002 @regression @validation
  Scenario: Real-time validation feedback as user types
    When I start typing "secure" in the password field
    Then I should see password requirement indicators updating in real-time
    When I continue typing to make it "SecurePass123!"
    Then all password requirements should show as satisfied

  # ============================================================================
  # VALIDATION TESTS - Required Fields
  # ============================================================================

  @story-002 @regression @validation
  Scenario: Empty form submission shows all required field errors
    When I click the register button without filling any fields
    Then I should see validation errors for:
      | field           | error                    |
      | fullName        | Full name is required    |
      | email           | Email is required        |
      | password        | Password is required     |
      | confirmPassword | Please confirm password  |
      | terms           | You must accept the terms|

  @story-002 @regression @validation
  Scenario: Terms checkbox must be accepted
    Given I have filled in all registration fields with valid data
    But I have not accepted the terms of service
    When I click the register button
    Then I should see an error "You must accept the terms of service"
    And the form should not be submitted

  # ============================================================================
  # ERROR HANDLING - Duplicate Email
  # ============================================================================

  @story-002 @regression @error @security
  Scenario: Duplicate email shows appropriate error without leaking info
    Given a user with email "existing@example.com" already exists
    When I fill in the registration form with:
      | field           | value                |
      | fullName        | Another User         |
      | email           | existing@example.com |
      | password        | SecurePass123!       |
      | confirmPassword | SecurePass123!       |
    And I accept the terms of service
    And I click the register button
    Then I should see an error message about the email
    And the error should not reveal whether the account exists

  # ============================================================================
  # SECURITY TESTS
  # ============================================================================

  @story-002 @smoke @security
  Scenario: Password field is masked
    When I enter "SecurePass123!" in the password field
    Then the password should be displayed as dots or asterisks
    And the password value should not be visible in the DOM

  @story-002 @regression @security
  Scenario: XSS payloads in form fields are sanitized
    When I fill in the registration form with:
      | field    | value                              |
      | fullName | <script>alert('xss')</script>      |
      | email    | test@example.com                   |
    And I submit the form
    Then the script should not execute
    And the name should be stored safely escaped

  @story-002 @regression @security
  Scenario: Form is protected against CSRF attacks
    When I inspect the registration form
    Then I should see a CSRF token in the form
    And submitting without the token should fail

  # ============================================================================
  # API TESTS
  # ============================================================================

  @story-002 @api @smoke
  Scenario: API returns 201 on successful registration
    When I send a POST request to "/api/auth/register" with:
      """json
      {
        "fullName": "API User",
        "email": "apiuser@example.com",
        "password": "SecurePass123!"
      }
      """
    Then the response status should be 201
    And the response should contain a user ID
    And the response should not contain the password

  @story-002 @api @validation
  Scenario: API returns 400 for invalid email
    When I send a POST request to "/api/auth/register" with:
      """json
      {
        "fullName": "Test User",
        "email": "invalid-email",
        "password": "SecurePass123!"
      }
      """
    Then the response status should be 400
    And the response should contain error "Invalid email format"

  @story-002 @api @validation
  Scenario: API returns 400 for weak password
    When I send a POST request to "/api/auth/register" with:
      """json
      {
        "fullName": "Test User",
        "email": "test@example.com",
        "password": "weak"
      }
      """
    Then the response status should be 400
    And the response should contain password requirement errors

  @story-002 @api @error
  Scenario: API returns 409 for duplicate email
    Given a user with email "existing@example.com" already exists
    When I send a POST request to "/api/auth/register" with:
      """json
      {
        "fullName": "Duplicate User",
        "email": "existing@example.com",
        "password": "SecurePass123!"
      }
      """
    Then the response status should be 409
    And the response should indicate email conflict

  @story-002 @api @security
  Scenario: API enforces rate limiting
    Given I have made 5 registration attempts in the last hour
    When I send another POST request to "/api/auth/register"
    Then the response status should be 429
    And the response should indicate rate limit exceeded

  # ============================================================================
  # EMAIL VERIFICATION INTEGRATION
  # ============================================================================

  @story-002 @integration @email
  Scenario: User cannot login before email verification
    Given I have registered with email "unverified@example.com"
    But I have not clicked the verification link
    When I attempt to login with "unverified@example.com"
    Then I should see an error "Please verify your email address"
    And I should not be logged in

  @story-002 @integration @email
  Scenario: User can login after email verification
    Given I have registered with email "verified@example.com"
    And I have clicked the verification link in my email
    When I attempt to login with "verified@example.com"
    Then I should be successfully logged in

  @story-002 @integration @email
  Scenario: Verification token expires after 24 hours
    Given I registered 25 hours ago
    And I have not verified my email
    When I click the verification link from the original email
    Then I should see an error "Verification link has expired"
    And I should be offered to resend the verification email
