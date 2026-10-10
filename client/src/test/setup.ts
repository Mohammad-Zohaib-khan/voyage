import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom does not implement the <dialog> methods; give them minimal open/close behaviour for tests.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute('open');
};

// jsdom has no matchMedia or IntersectionObserver. Media queries report "no match" (a narrow,
// touch-first screen with no motion preference) and observers never fire, which is how the effect
// components behave before they are scrolled into view.
const jsdomWindow = window as Partial<Window> & Window;
if (typeof jsdomWindow.matchMedia !== 'function') {
  jsdomWindow.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
if (typeof (jsdomWindow as { IntersectionObserver?: unknown }).IntersectionObserver !== 'function') {
  class InertIntersectionObserver {
    readonly root = null;
    readonly rootMargin = '0px';
    readonly thresholds = [0];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  Object.assign(jsdomWindow, { IntersectionObserver: InertIntersectionObserver });
}

// jsdom does not implement scrolling.
Element.prototype.scrollIntoView = function scrollIntoView() {};
