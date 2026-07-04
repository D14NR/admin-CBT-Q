export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '';
  try {
    const d = typeof value === 'string' ? new Date(value) : value;
    if (!d || Number.isNaN((d as Date).getTime())) return '';
    return (d as Date).toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    return '';
  }
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return '';
  try {
    const d = typeof value === 'string' ? new Date(value) : value;
    if (!d || Number.isNaN((d as Date).getTime())) return '';
    return (d as Date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return '';
  }
}

export default { formatDateTime, formatDate };
