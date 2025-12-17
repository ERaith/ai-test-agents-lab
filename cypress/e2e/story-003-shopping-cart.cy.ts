// cypress/e2e/story-003-shopping-cart.cy.ts

describe('STORY-003 – Shopping Cart Management', () => {
  beforeEach(() => {
    cy.waitForApi();
    cy.resetDatabase();
    // TODO: Setup test products with known stock levels
    // TODO: Clear any existing cart state
  });

  it('@smoke @story-003 @e2e Add item to cart and view cart contents', () => {
    // TODO: Navigate to product page with item in stock
    cy.visit('/products/test-item-1');
    
    // TODO: Verify selector for add to cart button
    cy.get('[data-testid="add-to-cart-button"]').click();
    
    // TODO: Verify cart icon selector and count display
    cy.get('[data-testid="cart-icon-count"]').should('contain', '1');
    
    // TODO: Verify toast notification selector
    cy.get('[data-testid="toast-notification"]').should('contain', 'Item added to cart');
    
    // TODO: Navigate to cart page
    cy.get('[data-testid="cart-icon"]').click();
    
    // TODO: Verify cart item details selectors
    cy.get('[data-testid="cart-item"]').should('exist');
    cy.get('[data-testid="cart-item-quantity"]').should('contain', '1');
  });

  it('@smoke @story-003 @e2e Update item quantities in cart', () => {
    // TODO: Setup cart with existing items
    cy.visit('/cart');
    
    // TODO: Verify plus button selector
    cy.get('[data-testid="quantity-plus-button"]').first().click();
    
    // TODO: Verify quantity updates immediately
    cy.get('[data-testid="cart-item-quantity"]').first().should('contain', '2');
    
    // TODO: Verify subtotal selector and updates
    cy.get('[data-testid="item-subtotal"]').first().should('not.contain', '$0.00');
    
    // TODO: Verify cart total selector and updates
    cy.get('[data-testid="cart-total"]').should('not.contain', '$0.00');
  });

  it('@smoke @story-003 @e2e Remove item from cart', () => {
    // TODO: Setup cart with existing items
    cy.visit('/cart');
    
    // TODO: Verify remove button selector
    cy.get('[data-testid="remove-item-button"]').first().click();
    
    // TODO: Verify confirmation dialog and confirm
    cy.get('[data-testid="confirm-removal-button"]').click();
    
    // TODO: Verify item is removed from cart
    cy.get('[data-testid="cart-item"]').should('not.exist');
    
    // TODO: Verify cart total updates
    cy.get('[data-testid="cart-total"]').should('contain', '$0.00');
  });

  it('@regression @story-003 Cannot add out-of-stock item to cart', () => {
    // TODO: Navigate to out-of-stock product page
    cy.visit('/products/out-of-stock-item');
    
    // TODO: Verify add to cart button is disabled
    cy.get('[data-testid="add-to-cart-button"]').should('be.disabled');
    
    // TODO: Verify cart count remains unchanged
    cy.get('[data-testid="cart-icon-count"]').should('contain', '0');
  });

  it('@regression @story-003 Quantity cannot exceed available stock', () => {
    // TODO: Setup cart with item at stock limit - 1
    cy.visit('/cart');
    
    // TODO: Try to increase quantity beyond stock
    cy.get('[data-testid="quantity-plus-button"]').first().click();
    
    // TODO: Verify quantity is limited to max stock
    cy.get('[data-testid="cart-item-quantity"]').first().should('contain', '5'); // TODO: Define actual stock limit
    
    // TODO: Verify stock limitation message
    cy.get('[data-testid="stock-limit-message"]').should('be.visible');
  });

  it('@regression @story-003 Quantity cannot be less than 1', () => {
    // TODO: Setup cart with item quantity 1
    cy.visit('/cart');
    
    // TODO: Try to decrease quantity below 1
    cy.get('[data-testid="quantity-minus-button"]').first().click();
    
    // TODO: Verify quantity remains at 1
    cy.get('[data-testid="cart-item-quantity"]').first().should('contain', '1');
    
    // TODO: Verify minus button is disabled
    cy.get('[data-testid="quantity-minus-button"]').first().should('be.disabled');
  });

  it('@e2e @story-003 Cart persists across page refresh', () => {
    // TODO: Add items to cart
    cy.visit('/products/test-item-1');
    cy.get('[data-testid="add-to-cart-button"]').click();
    
    // TODO: Refresh page
    cy.reload();
    
    // TODO: Verify cart still contains items
    cy.get('[data-testid="cart-icon-count"]').should('contain', '1');
    
    // TODO: Navigate to cart and verify details
    cy.visit('/cart');
    cy.get('[data-testid="cart-item"]').should('exist');
  });

  it('@e2e @story-003 Guest cart merges with user cart on login', () => {
    // TODO: Add items to cart as guest
    cy.visit('/products/test-item-1');
    cy.get('[data-testid="add-to-cart-button"]').click();
    
    // TODO: Login to account with existing cart items
    cy.login('user');
    
    // TODO: Verify both guest and user cart items are present
    cy.visit('/cart');
    cy.get('[data-testid="cart-item"]').should('have.length.greaterThan', 1);
    
    // TODO: Verify cart totals reflect all items
    cy.get('[data-testid="cart-total"]').should('not.contain', '$0.00');
  });

  it('@e2e @story-003 Empty cart displays appropriate message', () => {
    // TODO: Ensure cart is empty
    cy.visit('/cart');
    
    // TODO: Verify empty cart message
    cy.get('[data-testid="empty-cart-message"]').should('be.visible');
    
    // TODO: Verify continue shopping link
    cy.get('[data-testid="continue-shopping-link"]').should('be.visible').click();
    
    // TODO: Verify navigation to products page
    cy.url().should('include', '/products');
  });

  it('@e2e @story-003 Continue shopping navigation', () => {
    // TODO: Setup cart with items
    cy.visit('/cart');
    
    // TODO: Click continue shopping link
    cy.get('[data-testid="continue-shopping-link"]').click();
    
    // TODO: Verify navigation to product catalog
    cy.url().should('include', '/products');
  });

  it('@regression @story-003 Add same item multiple times increases quantity', () => {
    // TODO: Add item to cart first time
    cy.visit('/products/test-item-1');
    cy.get('[data-testid="add-to-cart-button"]').click();
    
    // TODO: Add same item again
    cy.get('[data-testid="add-to-cart-button"]').click();
    
    // TODO: Verify quantity increased to 2
    cy.visit('/cart');
    cy.get('[data-testid="cart-item-quantity"]').should('contain', '2');
    
    // TODO: Verify only one entry exists for the item
    cy.get('[data-testid="cart-item"]').should('have.length', 1);
  });

  it('@regression @story-003 Item goes out of stock while in cart', () => {
    // TODO: Add item to cart
    cy.visit('/products/test-item-1');
    cy.get('[data-testid="add-to-cart-button"]').click();
    
    // TODO: Simulate item going out of stock via API
    cy.request('PUT', '/api/products/test-item-1', { stock: 0 });
    
    // TODO: View cart
    cy.visit('/cart');
    
    // TODO: Verify out of stock notification
    cy.get('[data-testid="out-of-stock-notification"]').should('be.visible');
    
    // TODO: Verify cannot proceed to checkout
    cy.get('[data-testid="checkout-button"]').should('be.disabled');
  });

  it('@regression @story-003 Price changes do not affect items already in cart', () => {
    // TODO: Add item to cart at original price
    cy.visit('/products/test-item-1');
    cy.get('[data-testid="product-price"]').then(($price) => {
      const originalPrice = $price.text();
      
      cy.get('[data-testid="add-to-cart-button"]').click();
      
      // TODO: Change product price via API
      cy.request('PUT', '/api/products/test-item-1', { price: 99.99 });
      
      // TODO: Verify cart retains original price
      cy.visit('/cart');
      cy.get('[data-testid="item-price"]').should('contain', originalPrice);
    });
  });

  it('@regression @story-003 Direct quantity input validation', () => {
    // TODO: Setup cart with item
    cy.visit('/cart');
    
    // TODO: Type quantity directly in field
    cy.get('[data-testid="quantity-input"]').first().clear().type('3');
    
    // TODO: Verify quantity updates
    cy.get('[data-testid="cart-item-quantity"]').first().should('contain', '3');
    
    // TODO: Verify subtotal and cart total update
    cy.get('[data-testid="item-subtotal"]').first().should('not.contain', '$0.00');
    cy.get('[data-testid="cart-total"]').should('not.contain', '$0.00');
  });

  it('@regression @story-003 Cart API requires authentication', () => {
    // TODO: Ensure not authenticated
    cy.window().then((win) => {
      win.localStorage.removeItem('authToken');
    });
    
    // TODO: Attempt to access cart API endpoints
    cy.request({
      method: 'GET',
      url: '/api/cart',
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(401);
    });
    
    cy.request({
      method: 'POST',
      url: '/api/cart/items',
      body: { productId: 'test-item-1', quantity: 1 },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(401);
    });
  });

  it('@edge-case @story-003 Concurrent users adding last item in stock', () => {
    // TODO: Setup product with 1 item in stock
    cy.request('PUT', '/api/products/test-item-1', { stock: 1 });
    
    // TODO: Simulate concurrent add to cart requests
    cy.request('POST', '/api/cart/items', { productId: 'test-item-1', quantity: 1 });
    
    // TODO: Second request should fail
    cy.request({
      method: 'POST',
      url: '/api/cart/items',
      body: { productId: 'test-item-1', quantity: 1 },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(400);
      expect(response.body.message).to.include('out of stock');
    });
  });

  it('@edge-case @story-003 Network interruption during cart operation', () => {
    // TODO: Setup network interception
    cy.intercept('POST', '/api/cart/items', { forceNetworkError: true }).as('networkError');
    
    cy.visit('/products/test-item-1');
    cy.get('[data-testid="add-to-cart-button"]').click();
    
    // TODO: Verify graceful failure
    cy.wait('@networkError');
    cy.get('[data-testid="error-message"]').should('be.visible');
    
    // TODO: Restore network and retry
    cy.intercept('POST', '/api/cart/items', { statusCode: 200, body: { success: true } }).as('networkRestored');
    cy.get('[data-testid="retry-button"]').click();
    
    cy.wait('@networkRestored');
    cy.get('[data-testid="cart-icon-count"]').should('contain', '1');
  });
});