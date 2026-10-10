import { useNavigate, useSearchParams } from 'react-router';
import { useToast } from '../components/ui/toastContext';
import { usePreferences } from '../features/auth/usePreferences';
import { useCreateTrip } from '../features/trips/api';
import { TripForm } from '../features/trips/forms';
import { useDocumentTitle } from './useDocumentTitle';

export default function NewTripPage() {
  useDocumentTitle('New trip');
  const [params] = useSearchParams();
  const create = useCreateTrip();
  const navigate = useNavigate();
  const toast = useToast();
  const { currency } = usePreferences();
  const destination = params.get('destination');
  const initialDestinationIds = destination && /^[a-f0-9]{24}$/i.test(destination) ? [destination] : [];

  return (
    <div className="page-x container-wide grid gap-12 pt-14 pb-24 md:pt-20 lg:grid-cols-12">
      <header className="lg:col-span-4">
        <h1 className="font-serif text-h1">A new trip</h1>
        <p className="mt-5 max-w-sm text-muted">
          Start with the outline: when, who and roughly how much. Each date becomes a day in your itinerary, ready to fill in.
        </p>
        <p className="mt-8 max-w-sm border-t border-line pt-5 text-small text-faint">
          Voyage keeps plans and estimates only. Nothing here books or reserves anything.
        </p>
      </header>
      <div className="lg:col-span-7 lg:col-start-6">
        <TripForm
          defaultCurrency={currency}
          initialDestinationIds={initialDestinationIds}
          submitLabel="Create trip"
          onCancel={() => void navigate(-1)}
          onSubmit={async (input) => {
            const trip = await create.mutateAsync(input);
            toast.success(`Created ${trip.title}.`);
            void navigate(`/app/trips/${trip.id}`, { replace: true });
          }}
        />
      </div>
    </div>
  );
}
