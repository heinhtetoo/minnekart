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
