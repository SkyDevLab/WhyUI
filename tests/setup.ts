// Setup file for vitest with jsdom
import { afterEach } from 'vitest';

afterEach(() => {
  // Clear test DOM
  document.body.innerHTML = '';
});
