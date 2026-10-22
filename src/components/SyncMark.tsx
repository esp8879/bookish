import { useStore } from '../data/store';

/** Quiet marker: shows only when there's something waiting to sync. */
export function SyncMark() {
  const { pending, online } = useStore();
  if (online && !pending) return null;
  // navigator.onLine stays true on weak subway wifi, so "pending" alone means "not synced yet".
  return <span className="sync" role="status">{!online ? (pending ? 'Offline · not synced yet' : 'Offline') : 'Not synced yet'}</span>;
}
