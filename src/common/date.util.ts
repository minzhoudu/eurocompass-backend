// True for a real calendar day in "YYYY-MM-DD" form (rejects e.g. 2026-02-31).
export const isRealDate = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const parsed = new Date(`${date}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date)
  );
};
