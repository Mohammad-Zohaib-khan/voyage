import { LegalPage } from './LegalPage';

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      updated="9 October 2026"
      sections={[
        {
          heading: 'What this is',
          body: [
            'Voyage is a portfolio demonstration of a travel planning application. It is not a commercial service, it does not sell travel and it never takes payment details.',
          ],
        },
        {
          heading: 'What we store',
          body: [
            'Your display name, your email address and a one-way hash of your password (Argon2id). We never store your password itself.',
            'The trips, itinerary activities, notes, cost estimates, saved destinations and preferences you create.',
            'A session record that keeps you signed in, linked to an HttpOnly cookie. It expires after a period of inactivity and is deleted when you sign out.',
          ],
        },
        {
          heading: 'What we don’t do',
          body: [
            'We don’t use advertising or analytics trackers, and we don’t sell or share your data with anyone.',
            'Server logs record request paths and status codes for troubleshooting. They do not record passwords, cookies, tokens or the contents of your trips.',
          ],
        },
        {
          heading: 'Photographs',
          body: [
            'Destination photographs load directly from Unsplash’s image service, so Unsplash receives standard web request information (such as your IP address) when your browser fetches an image. Each photographer is credited on the page where their work appears.',
          ],
        },
        {
          heading: 'Your choices',
          body: [
            'You can edit or delete any trip at any time, and export a trip as a spreadsheet. This demo does not offer self-service account deletion; whoever operates your deployment can remove an account and its data on request.',
          ],
        },
      ]}
    />
  );
}
