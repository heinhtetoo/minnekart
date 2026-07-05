interface StatsInput {
  country: string;
  placeName: string;
  dateStart: string;
  dateEnd: string | null;
}

export interface TripStats {
  countries: number;
  cities: number;
  photos: number;
  years: number;
}

export function computeStats(
  trips: StatsInput[],
  photoCount: number,
): TripStats {
  const countries = new Set<string>();
  const cities = new Set<string>();
  const years = new Set<number>();

  for (const trip of trips) {
    countries.add(trip.country);
    cities.add(trip.placeName);
    const startYear = yearOf(trip.dateStart);
    const endYear = trip.dateEnd ? yearOf(trip.dateEnd) : startYear;
    for (let year = startYear; year <= endYear; year += 1) {
      years.add(year);
    }
  }

  return {
    countries: countries.size,
    cities: cities.size,
    photos: photoCount,
    years: years.size,
  };
}

function yearOf(date: string): number {
  return Number.parseInt(date.slice(0, 4), 10);
}
