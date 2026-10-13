const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function label(date: string): string {
  const [year, month] = date.split('-');
  return `${MONTHS[Number.parseInt(month, 10) - 1]} ${year}`;
}

export function formatTripDates(
  dateStart: string,
  dateEnd: string | null,
): string {
  const start = label(dateStart);
  if (!dateEnd) {
    return start;
  }
  const end = label(dateEnd);
  return start === end ? start : `${start} – ${end}`;
}

// "1 photo", "5 photos" — and nothing at all when there are none, so a trip
// without photos doesn't announce "0 photos".
export function formatPhotoCount(count: number): string {
  if (count <= 0) return '';
  return count === 1 ? '1 photo' : `${count} photos`;
}
