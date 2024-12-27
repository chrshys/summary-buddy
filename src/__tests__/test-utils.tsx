/* eslint-disable */
/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://localhost/"}
 */

import type { ReactElement } from 'react';
import { render as rtlRender } from '@testing-library/react';

// Add interface for render options
interface RenderOptions {
  route?: string;
}

function render(ui: ReactElement, { route = '/' }: RenderOptions = {}) {
  window.history.pushState({}, 'Test page', route);
  return rtlRender(ui);
}

// Re-export everything
export * from '@testing-library/react';
// Override render method
export { render };
