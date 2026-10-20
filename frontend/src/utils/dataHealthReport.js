export function normalizeDataHealthReport(data) {
  const credit = data?.credit_mismatches ?? data?.credit_balance?.rows;
  const points = data?.points_mismatches ?? data?.points_balance?.rows;
  const orphans = data?.orphaned_payments ?? (
    Array.isArray(data?.malformed_data?.rows)
      ? data.malformed_data.rows.filter(row => row?.type === 'orphaned_payment')
      : undefined
  );
  if (![credit, points, orphans].every(rows => Array.isArray(rows) && rows.every(row => row && typeof row === 'object'))) {
    throw new Error('Incomplete data health response');
  }
  return { credit_mismatches: credit, points_mismatches: points, orphaned_payments: orphans };
}
