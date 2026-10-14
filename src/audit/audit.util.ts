// The fields whose value differs, as { field: [before, after] }. Arrays and
// objects are compared by value.
export const diffFields = <T extends object>(
  before: T,
  after: Partial<T>,
  fields: readonly (keyof T)[],
): Record<string, [unknown, unknown]> => {
  const changes: Record<string, [unknown, unknown]> = {};

  for (const field of fields) {
    if (!(field in after)) continue;

    const from = before[field];
    const to = after[field];

    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes[field as string] = [from, to];
    }
  }

  return changes;
};

// "2026-10-20" -> "20.10.2026" for the Serbian summaries.
export const formatDay = (day: string) => {
  const [year, month, date] = day.split('-');

  return `${date}.${month}.${year}`;
};

// Free text goes into a one-line summary; keep it short.
export const clip = (text: string | null | undefined, max = 80) => {
  const oneLine = (text ?? '').replace(/\s+/g, ' ').trim();

  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
};
