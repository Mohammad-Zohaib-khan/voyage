import { ButtonLink } from '../components/ui/Button';
import { useDocumentTitle } from './useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="page-x container-wide pt-24 pb-32">
      <p className="label">Page not found</p>
      <h1 className="mt-4 max-w-3xl font-serif text-h1">This path doesn’t lead anywhere.</h1>
      <p className="measure mt-6 text-lead text-muted">The page may have moved, or the link may be mistyped.</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink to="/">Back to home</ButtonLink>
        <ButtonLink to="/destinations" variant="secondary">
          Browse destinations
        </ButtonLink>
      </div>
    </div>
  );
}
