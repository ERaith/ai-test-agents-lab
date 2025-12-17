// cypress/support/e2e.ts
// Cypress E2E support file

import './commands';

// ============================================================================
// GLOBAL CONFIGURATION
// ============================================================================

// Prevent Cypress from failing tests when uncaught exceptions occur
// (useful during development, can be removed for production)
Cypress.on('uncaught:exception', (err, runnable) => {
  // Log the error but don't fail the test
  console.error('Uncaught exception:', err);
  return false;
});

// ============================================================================
// BEFORE EACH HOOK
// ============================================================================

beforeEach(() => {
  // Clear cookies and local storage before each test
  // cy.clearCookies();
  // cy.clearLocalStorage();
  
  // Wait for API to be ready (optional)
  // cy.waitForApi();
});

// ============================================================================
// AFTER EACH HOOK
// ============================================================================

afterEach(() => {
  // Take screenshot on failure (Cypress does this automatically)
  // Add custom cleanup here if needed
});
