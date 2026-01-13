/**
 * Global type declarations for FarmerChat mobile app
 */

// Fix JSX namespace for React 19
import type { ReactElement, ReactNode } from 'react';

declare global {
  namespace JSX {
    interface Element extends ReactElement<any, any> {}
    interface ElementClass {
      render(): ReactNode;
    }
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
