import { trips } from '@/db/schema';

type TripRow = typeof trips.$inferSelect;

export interface TripDTO {
  id: string;
  placeName: string;
  country: string;
  lat: number;
  lng: number;
  dateStart: string;
  dateEnd: string | null;
  highlight: string | null;
  story: string | null;
}

export function toTripDTO(trip: TripRow): TripDTO {
  return {
    id: trip.id,
    placeName: trip.placeName,
    country: trip.country,
    lat: trip.lat,
    lng: trip.lng,
    dateStart: trip.dateStart,
    dateEnd: trip.dateEnd,
    highlight: trip.highlight,
    story: trip.story,
  };
}
