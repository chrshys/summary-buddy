import { render as rtlRender } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ReactElement } from 'react';

function render(ui: ReactElement, { route = '/' } = {}) {
  window.history.pushState({}, 'Test page', route);
  
  return rtlRender(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  );
}

// Re-export everything
export * from '@testing-library/react';
// Override render method
export { render }; 