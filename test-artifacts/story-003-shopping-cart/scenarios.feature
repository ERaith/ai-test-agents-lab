Feature: Story-003 Shopping Cart Management

  @story-003 @smoke @e2e
  Scenario: Add item to cart and view cart contents
    Given I am on a product page with an item in stock
    When I click the "Add to Cart" button
    Then the item is added to my cart with quantity 1
    And the cart icon shows the updated item count
    And I see a toast notification confirming the item was added
    And when I view my cart the item appears with correct details

  @story-003 @smoke @e2e
  Scenario: Update item quantities in cart
    Given I have items in my cart
    When I increase the quantity using the plus button
    Then the quantity updates immediately
    And the subtotal updates for that item
    And the cart total updates automatically

  @story-003 @smoke @e2e
  Scenario: Remove item from cart
    Given I have items in my cart
    When I click the remove button for an item
    And I confirm the removal in the prompt
    Then the item is removed from my cart immediately
    And the cart total updates to reflect the removal

  @story-003 @regression
  Scenario: Cannot add out-of-stock item to cart
    Given I am viewing a product that is out of stock
    When I attempt to add it to my cart
    Then the "Add to Cart" button is disabled
    And no item is added to my cart

  @story-003 @regression
  Scenario: Quantity cannot exceed available stock
    Given I have an item in my cart
    When I try to increase the quantity beyond available stock
    Then the quantity is limited to the maximum stock available
    And I see a message indicating the stock limitation

  @story-003 @regression
  Scenario: Quantity cannot be less than 1
    Given I have an item in my cart with quantity 1
    When I try to decrease the quantity using the minus button
    Then the quantity remains at 1
    And the minus button is disabled

  @story-003 @e2e
  Scenario: Cart persists across page refresh
    Given I have items in my cart
    When I refresh the page
    Then my cart still contains all the same items
    And the quantities and totals are preserved

  @story-003 @e2e
  Scenario: Guest cart merges with user cart on login
    Given I am a guest user with items in my cart
    When I log in to my account that has existing cart items
    Then both the guest cart items and user cart items are present
    And the cart totals reflect all items

  @story-003 @e2e
  Scenario: Empty cart displays appropriate message
    Given my cart is empty
    When I view my cart page
    Then I see a message indicating my cart is empty
    And I see a "Continue Shopping" link that returns me to products

  @story-003 @e2e
  Scenario: Continue shopping navigation
    Given I am viewing my cart with items
    When I click the "Continue Shopping" link
    Then I am returned to the product catalog page

  @story-003 @regression
  Scenario: Add same item multiple times increases quantity
    Given I have an item in my cart with quantity 1
    When I add the same item to my cart again
    Then the quantity for that item increases to 2
    And only one entry for that item exists in my cart

  @story-003 @regression
  Scenario: Item goes out of stock while in cart
    Given I have an item in my cart
    When that item goes out of stock
    And I view my cart
    Then I see a notification that the item is no longer available
    And I cannot proceed to checkout with that item

  @story-003 @regression
  Scenario: Price changes do not affect items already in cart
    Given I have an item in my cart at the original price
    When the product price changes
    Then the item in my cart retains the original price
    And my cart total reflects the locked price

  @story-003 @regression
  Scenario: Direct quantity input validation
    Given I have an item in my cart
    When I type a quantity directly in the quantity field
    And the quantity is within stock limits
    Then the quantity updates to the entered value
    And the subtotal and cart total update accordingly

  @story-003 @regression
  Scenario: Cart API requires authentication
    Given I am not authenticated
    When I attempt to access cart API endpoints
    Then I receive an authentication error
    And no cart operations are performed

  @story-003 @edge-case
  Scenario: Concurrent users adding last item in stock
    Given there is 1 item left in stock
    And multiple users attempt to add it to cart simultaneously
    When the first user successfully adds it
    Then subsequent users cannot add the item
    And they see an out-of-stock message

  @story-003 @edge-case
  Scenario: Network interruption during cart operation
    Given I am adding an item to my cart
    When the network connection is interrupted
    Then the cart operation fails gracefully
    And I can retry the operation when connection is restored