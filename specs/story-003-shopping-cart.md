# Story 003: Shopping Cart Management

## Title
Add and Manage Items in Shopping Cart

## As a
Customer browsing products

## I want to
Add items to my shopping cart and manage quantities

## So that
I can purchase multiple items in a single checkout

## Acceptance Criteria

### AC1: Add to Cart
- [ ] "Add to Cart" button visible on product pages
- [ ] Clicking adds item with quantity of 1
- [ ] Cart icon updates to show item count
- [ ] Toast notification confirms item added
- [ ] Out-of-stock items cannot be added

### AC2: View Cart
- [ ] Cart page shows all added items
- [ ] Each item displays: image, name, price, quantity, subtotal
- [ ] Cart total is calculated correctly
- [ ] "Continue Shopping" link returns to products
- [ ] Empty cart shows appropriate message

### AC3: Update Quantities
- [ ] Quantity can be increased/decreased with +/- buttons
- [ ] Quantity can be typed directly
- [ ] Minimum quantity is 1
- [ ] Maximum quantity is limited by stock
- [ ] Subtotals update in real-time
- [ ] Cart total updates automatically

### AC4: Remove Items
- [ ] Each item has a remove/delete option
- [ ] Confirmation prompt before removal
- [ ] Item removed immediately after confirmation
- [ ] Cart total updates after removal

### AC5: Cart Persistence
- [ ] Cart persists across page refreshes
- [ ] Cart persists across browser sessions (logged in users)
- [ ] Guest cart merges with user cart on login

### AC6: API Endpoints
- [ ] GET /api/cart - returns current cart
- [ ] POST /api/cart/items - adds item to cart
- [ ] PATCH /api/cart/items/:id - updates quantity
- [ ] DELETE /api/cart/items/:id - removes item
- [ ] All endpoints require authentication (or guest token)

## Technical Notes
- Cart stored in database for logged-in users
- Guest carts use localStorage + server session
- Stock validation happens on add and checkout
- Prices locked at time of adding (not checkout)

## Edge Cases
- Item goes out of stock while in cart
- Price changes while item in cart
- User adds same item multiple times
- Cart item exceeds available stock

## Dependencies
- Product catalog API
- Inventory management system
- User authentication

## Priority
High - Core e-commerce functionality

## Story Points
8
