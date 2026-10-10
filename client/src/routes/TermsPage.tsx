import { LegalPage } from './LegalPage';

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      updated="9 October 2026"
      sections={[
        {
          heading: 'A planning tool, not a travel agent',
          body: [
            'Voyage helps you research destinations and organise your own plans. It does not book, reserve, sell or guarantee any travel, accommodation or activity.',
          ],
        },
        {
          heading: 'Estimates are estimates',
          body: [
            'Destination costs are illustrative figures written for this demo. They are not live prices, quotes or availability. Budget totals are calculated from the amounts you enter.',
            'Seasonal advice and practical notes are general guidance. Always check official sources for entry requirements, safety advice and opening times before you travel.',
          ],
        },
        {
          heading: 'Your content',
          body: ['What you write in Voyage is yours. Keep your password private and sign out on shared devices.'],
        },
        {
          heading: 'Availability',
          body: ['This is a demonstration project provided as is, without any guarantee that it will be available, accurate or free of errors.'],
        },
      ]}
    />
  );
}
