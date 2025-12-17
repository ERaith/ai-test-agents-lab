// cypress/support/commands.ts
// Custom Cypress commands for the test suite

/**
 * LEARNING NOTE: Custom commands encapsulate common test operations.
 * This makes tests more readable and maintainable. When selectors change,
 * you only update one place.
 * 
 * INTERVIEW POINT: "We use the Page Object pattern through custom commands.
 * This reduces duplication and makes our tests more maintainable. The AI
 * agents are trained to use these commands instead of writing raw selectors."
 */

// ============================================================================
// TYPE DECLARATIONS
// ============================================================================

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login as a specific user type
       * @example cy.login('admin')
       */
      login(userType: 'admin' | 'user'): Chainable<void>;

      /**
       * Login with specific credentials
       * @example cy.loginWith('email@example.com', 'password')
       */
      loginWith(email: string, password: string): Chainable<void>;

      /**
       * Login via API (faster than UI login)
       * @example cy.loginViaApi('admin')
       */
      loginViaApi(userType: 'admin' | 'user'): Chainable<void>;

      /**
       * Create a test user via API
       * @example cy.createUser({ email: 'test@example.com', role: 'user' })
       */
      createUser(user: { email: string; name?: string; role?: string }): Chainable<{ id: string }>;

      /**
       * Delete a user via API
       * @example cy.deleteUser('user-id')
       */
      deleteUser(userId: string): Chainable<void>;

      /**
       * Check if an element is visible in the viewport
       * @example cy.get('.element').shouldBeInViewport()
       */
      shouldBeInViewport(): Chainable<void>;

      /**
       * Wait for API to be ready
       * @example cy.waitForApi()
       */
      waitForApi(): Chainable<void>;

      /**
       * Reset the database to a known state
       * @example cy.resetDatabase()
       */
      resetDatabase(): Chainable<void>;
    }
  }
}

// ============================================================================
// TEST DATA
// ============================================================================

const testCredentials = {
  admin: {
    email: Cypress.env('ADMIN_EMAIL') || 'admin@example.com',
    password: Cypress.env('ADMIN_PASSWORD') || 'admin123',
  },
  user: {
    email: Cypress.env('USER_EMAIL') || 'user@example.com',
    password: Cypress.env('USER_PASSWORD') || 'user123',
  },
};

// ============================================================================
// AUTHENTICATION COMMANDS
// ============================================================================

Cypress.Commands.add('login', (userType: 'admin' | 'user') => {
  const creds = testCredentials[userType];
  cy.loginWith(creds.email, creds.password);
});

Cypress.Commands.add('loginWith', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('not.include', '/login');
});

Cypress.Commands.add('loginViaApi', (userType: 'admin' | 'user') => {
  const creds = testCredentials[userType];
  
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: creds,
  }).then((response) => {
    // Store auth token in localStorage or cookie
    window.localStorage.setItem('authToken', response.body.token);
  });
});

// ============================================================================
// USER MANAGEMENT COMMANDS
// ============================================================================

Cypress.Commands.add('createUser', (user: { email: string; name?: string; role?: string }) => {
  return cy.request({
    method: 'POST',
    url: '/api/users',
    body: {
      email: user.email,
      name: user.name || 'Test User',
      role: user.role || 'user',
    },
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('authToken')}`,
    },
  }).then((response) => {
    return { id: response.body.id };
  });
});

Cypress.Commands.add('deleteUser', (userId: string) => {
  cy.request({
    method: 'DELETE',
    url: `/api/users/${userId}`,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('authToken')}`,
    },
  });
});

// ============================================================================
// UTILITY COMMANDS
// ============================================================================

Cypress.Commands.add('shouldBeInViewport', { prevSubject: true }, (subject) => {
  const bottom = Cypress.$(cy.state('window')).height()!;
  const rect = subject[0].getBoundingClientRect();

  expect(rect.top).to.be.lessThan(bottom);
  expect(rect.bottom).to.be.greaterThan(0);
});

Cypress.Commands.add('waitForApi', () => {
  // Wait for API health check
  cy.request({
    method: 'GET',
    url: '/api/health',
    retryOnStatusCodeFailure: true,
    timeout: 10000,
  });
});

Cypress.Commands.add('resetDatabase', () => {
  cy.task('db:reset');
});

// ============================================================================
// EXPORT FOR TYPE SUPPORT
// ============================================================================

export {};
