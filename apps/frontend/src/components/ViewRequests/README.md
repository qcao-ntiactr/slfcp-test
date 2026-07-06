# Unread Message Count Tests

This directory contains comprehensive unit tests for the unread message count functionality in the frontend application.

## Test Files

### 1. `UnreadMessageHelpers.unit.ts`
Tests utility functions for handling unread message counts:
- `shouldShowUnreadBadge()` - Determines if badge should be displayed
- `formatUnreadMessageCount()` - Formats count for display (handles 99+ logic)
- `getUnreadMessageAriaLabel()` - Generates accessibility labels
- `filterRequestsWithUnreadMessages()` - Filters requests with unread messages
- `getTotalUnreadMessageCount()` - Calculates total unread count

### 2. `RequestsTable.unit.ts`
Tests the unread message badge component behavior:
- Badge visibility logic (show/hide based on count)
- Display formatting (exact count vs "99+")
- Accessibility attributes (ARIA labels, roles)
- Entity-based filtering scenarios

### 3. `RequestsTableIntegration.unit.ts`
Integration tests for the complete RequestsTable component:
- Entity-based filtering for different user types (Commercial, Federal, NTIA)
- Loading and error state handling
- Edge cases (undefined counts, exactly 99 messages)
- Accessibility compliance

### 4. `RequestSummary.unit.ts`
Type safety tests for the RequestSummary interface:
- `unreadMessageCount` property type validation
- Optional property behavior
- Entity-based filtering data scenarios

## Key Testing Scenarios

### Entity-Based Filtering
The tests verify the core fix that ensures users only see unread message counts for inquiries where their entity is involved:

- **Commercial Users**: Only see counts for inquiries involving their commercial entity
- **Federal Agency Users**: Only see counts for inquiries involving their federal agency
- **NTIA Users**: Only see counts for inquiries involving NTIA

### Badge Display Logic
- Shows exact count for 1-99 unread messages
- Shows "99+" for counts over 99
- **Hides badge for 0 counts** (requirement: do not show 0 counts in frontend)
- Hides badge for undefined counts (backend omits property when count is 0)
- Proper accessibility attributes

### Edge Cases
- Undefined `unreadMessageCount` values (backend omits when count is 0)
- **Zero counts (hidden from display per requirement)**
- Large counts (>99)
- Exactly 99 messages
- Empty request lists

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test

# Run tests with coverage
npm run test:coverage

# Run only unread message tests
npm run test -- --grep "unread"
```

## Test Configuration

The tests use:
- **Vitest** as the test runner
- **@testing-library/react** for component testing
- **jsdom** for DOM simulation
- **Chakra UI** and **React Router** test providers

## Accessibility Testing

The tests include comprehensive accessibility checks:
- ARIA labels for screen readers
- Role attributes for status indicators
- Proper semantic markup
- Keyboard navigation support

## Mock Data

Test files include realistic mock data that represents:
- Different user entity types
- Various unread message count scenarios
- Complete RequestSummary objects with all required fields
- Entity-based filtering results

## Coverage Goals

The test suite aims for:
- 100% function coverage for utility functions
- 100% branch coverage for conditional logic
- Comprehensive edge case testing
- Accessibility compliance verification