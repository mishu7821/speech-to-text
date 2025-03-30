/**
 * This file provides shim implementations for modules
 * that would normally be installed via npm
 */

// Mock implementations for @radix-ui/react-checkbox
export const CheckboxPrimitive = {
  Root: 'div',
  Indicator: 'span',
  displayName: 'Checkbox'
};

// Mock implementations for @radix-ui/react-tabs
export const TabsPrimitive = {
  Root: 'div',
  List: 'div',
  Trigger: 'button',
  Content: 'div',
  displayName: 'Tabs'
}; 