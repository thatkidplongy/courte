import { LegalLayout, type LegalSection } from '@/components/templates/LegalLayout';
import { LEGAL_UPDATED_ON } from '@/consts';

export const metadata = {
  title: 'Privacy policy — Courte',
  description: 'What Courte stores about you, who can see it, and how long it is kept.',
};

/**
 * Every claim here is checkable against the schema. "We do not store card details" is true
 * because there is no column for one; "records are archived, not deleted" is the `deleted_at`
 * convention. A privacy policy that describes a different system than the one running is worse
 * than none, because it is believed.
 */
const SECTIONS: readonly LegalSection[] = [
  {
    heading: 'What we store',
    paragraphs: [
      'Your name and email address, as Google gives them to us when you sign in. Nothing else comes across from your Google account, and your password never does.',
      'Your bookings: which court, when, what it cost, and whether it was played, cancelled or missed. What the venue recorded you as having paid, and how.',
      'Any review you write, with the name it is shown under.',
    ],
  },
  {
    heading: 'What we do not store',
    paragraphs: [
      'Card numbers, bank details and payment credentials. Payment happens at the venue’s desk, so those details never reach us — there is nowhere in our database to put one.',
      'Your location. Searches run from a fixed point in the city rather than from wherever you are.',
    ],
  },
  {
    heading: 'Who can see it',
    paragraphs: [
      'The venue you book with sees your name, your email and the booking itself. Its staff need that to hold the court and to find you at the desk.',
      'Other players see only the name on a review, and only if you write one. Nobody else can see your bookings.',
      'A venue’s staff can only see that venue. Access is checked on every request against the memberships an owner has granted.',
    ],
  },
  {
    heading: 'Venue locations',
    paragraphs: [
      'Venue addresses and coordinates come from OpenStreetMap and are used under the Open Database Licence. That is why the attribution sits at the foot of every page that shows a map or a distance.',
    ],
  },
  {
    heading: 'How long it is kept',
    paragraphs: [
      'Records are archived rather than erased. A court a venue stops offering, a price rule it retires, a review that is taken down — each is marked as gone and stops appearing, but the bookings that referred to it keep making sense.',
      'That is a deliberate choice: a venue’s history of what was booked and what was paid has to stay intact, and deleting a court out from under last month’s bookings would corrupt it.',
    ],
  },
  {
    heading: 'Removing your account',
    paragraphs: [
      'Ask us and we will close your account and detach your name from anything you have written. Bookings a venue has already taken payment for stay on that venue’s books, because they are the venue’s records as much as yours.',
    ],
  },
];

const PrivacyPage = () => (
  <LegalLayout
    title="Privacy policy"
    summary="What Courte knows about you, who it is shared with, and why some of it is kept rather than deleted."
    updated={LEGAL_UPDATED_ON}
    sections={SECTIONS}
  />
);

export default PrivacyPage;
