import { LegalLayout, type LegalSection } from '@/components/templates/LegalLayout';
import { LEGAL_UPDATED_ON } from '@/consts';

export const metadata = {
  title: 'Terms of service — Courte',
  description: 'How booking, paying and cancelling work on Courte.',
};

/**
 * Written from what the software actually does, not from a template: the ten-minute hold, the
 * venue's own cancellation window and the desk payment are all real behaviour, and a clause
 * describing something we do not do would be the easiest promise on the site to break.
 */
const SECTIONS: readonly LegalSection[] = [
  {
    heading: 'What Courte is',
    paragraphs: [
      'Courte is a booking service. The court is the venue’s, and so are its opening hours, its prices and its rules — we show you what is free and pass your booking on.',
      'That means a dispute about the court itself, its condition or its staff is between you and the venue. We will help where we can.',
    ],
  },
  {
    heading: 'Booking a court',
    paragraphs: [
      'Choosing a slot holds it for ten minutes while you check out. If you do not finish in that time the hold lapses and the slot goes back to whoever wants it — nothing is charged and nothing is kept.',
      'The price you are shown at checkout is the price recorded against the booking. If the venue changes its rates afterwards, your booking keeps the rate it was made at.',
      'A slot can be taken by somebody else in the moment between the page loading and you pressing book. When that happens the booking is refused outright rather than double-sold, and you are told so.',
    ],
  },
  {
    heading: 'Paying',
    paragraphs: [
      'Payment is settled with the venue, at the desk — cash, GCash, Maya or card, whichever that venue takes. We do not take card details and we do not process the payment.',
      'The venue records what you paid, and that record is what your booking shows as paid, part-paid or unpaid.',
    ],
  },
  {
    heading: 'Cancelling, and not turning up',
    paragraphs: [
      'Each venue sets its own cancellation window, and most set twenty-four hours. Until that deadline you can cancel your booking yourself, free. After it, the slot is the venue’s to release — ask them.',
      'A venue can cancel or release a booking on its own side at any time, which is how a desk fixes a mistake or waives its own policy.',
      'A booking nobody turns up for may be marked as a no-show by the venue. It stays on your history as one.',
    ],
  },
  {
    heading: 'Reviews',
    paragraphs: [
      'Only a player who booked and played can review a venue, and only once per booking. That is enforced by the software, not by moderation.',
      'We remove reviews that name other players, that are not about the visit, or that exist to harm a venue rather than to describe it.',
    ],
  },
  {
    heading: 'Your account',
    paragraphs: [
      'You sign in with Google. We never see or store your password.',
      'Access to a venue’s console is granted by an owner of that venue and can be withdrawn by them at any time. It is checked on every request, so a withdrawal takes effect immediately rather than when a session expires.',
    ],
  },
  {
    heading: 'Changes to these terms',
    paragraphs: [
      'When these terms change, the new version is posted here with the date it changed. Bookings you have already made are governed by the terms in force when you made them.',
    ],
  },
];

const TermsPage = () => (
  <LegalLayout
    title="Terms of service"
    summary="What you can expect from Courte, and what the venue you book with is responsible for."
    updated={LEGAL_UPDATED_ON}
    sections={SECTIONS}
  />
);

export default TermsPage;
