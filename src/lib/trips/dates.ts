export function tripDateError(
  dateStart: string,
  dateEnd: string | null | undefined,
): string | null {
  if (!dateStart) {
    return 'Add a start date.';
  }
  if (dateEnd && dateEnd < dateStart) {
    return 'End date can’t be before the start date.';
  }
  return null;
}
