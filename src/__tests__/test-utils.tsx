import type { ReactElement } from 'react';
import { render as rtlRender } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Add interface for render options
interface RenderOptions {
  route?: string;
}

function render(ui: ReactElement, { route = '/' }: RenderOptions = {}) {
  window.history.pushState({}, 'Test page', route);

  return rtlRender(<BrowserRouter>{ui}</BrowserRouter>);
}

// Re-export everything
export * from '@testing-library/react';
// Override render method
export { render };
