export const FREE_TRIP_LIMIT = 15;
export const FREE_PHOTOS_PER_TRIP = 6;
export const MAX_PHOTOS_PER_TRIP = 50;
export const PAID_ACCOUNT_PHOTO_CEILING = 5000;

export function photosPerTripFor(plan: 'free' | 'paid'): number {
  return plan === 'free' ? FREE_PHOTOS_PER_TRIP : MAX_PHOTOS_PER_TRIP;
}
