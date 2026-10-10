import { useEffect } from 'react';

/** Sets the document title for the current page; screen readers announce it on navigation. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title.includes('Voyage') ? title : `${title} — Voyage`;
  }, [title]);
}
