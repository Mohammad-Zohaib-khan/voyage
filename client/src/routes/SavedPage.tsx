import { ButtonLink } from '../components/ui/Button';
import { EmptyState, RetryPanel } from '../components/ui/Feedback';
import { useSaved, useToggleSave } from '../features/destinations/api';
import { DestinationCard, DestinationCardSkeleton } from '../features/destinations/components';
import { errorMessage } from '../lib/api';
import { useDocumentTitle } from './useDocumentTitle';

export default function SavedPage() {
  useDocumentTitle('Saved places');
  const { data, isPending, isError, error, refetch, isRefetching } = useSaved();
  const { toggle, pendingId } = useToggleSave();

  return (
    <div className="page-x container-wide pt-14 pb-24 md:pt-20">
      <header className="border-b border-line pb-10">
        <h1 className="font-serif text-h1">Saved places</h1>
        <p className="mt-3 max-w-md text-muted">A shortlist of places you might go. Add any of them to a trip from its guide.</p>
      </header>

      {isPending ? (
        <div className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <DestinationCardSkeleton key={index} />
          ))}
        </div>
      ) : isError ? (
        <RetryPanel className="mt-10" message={errorMessage(error, 'Saved places didn’t load.')} onRetry={() => void refetch()} retrying={isRefetching} />
      ) : data.length === 0 ? (
        <EmptyState className="mt-10" title="Nothing saved yet" action={<ButtonLink to="/destinations">Browse destinations</ButtonLink>}>
          Use the bookmark on any destination to keep it here.
        </EmptyState>
      ) : (
        <ul className="mt-10 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {data.map(({ destination }) => (
            <li key={destination.id}>
              <DestinationCard destination={destination} saved savePending={pendingId === destination.id} onToggleSave={toggle} sharedTransition />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
