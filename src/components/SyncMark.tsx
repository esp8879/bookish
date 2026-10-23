import { useStore } from '../data/store';

/**
 * Always-visible sync state, kept short so it fits beside the ledger line at any width.
 * navigator.onLine stays true on weak subway wifi, so a write stuck for a few seconds counts as not synced.
 */
export function SyncMark() {
  const { pending, stuck, online } = useStore();
  const [label, state, detail] = !pending
    ? online ? ['Synced', 'ok', 'Everything is saved to the cloud.'] : ['Offline', 'ok', 'Offline. Everything so far is synced.']
    : !online || stuck ? ['Not synced', 'wait', 'Saved on this device. It will sync when there is a connection.']
      : ['Syncing…', 'busy', 'Saving to the cloud.'];
  return <span className={`sync ${state}`} role="status" title={detail} aria-label={detail}><i aria-hidden />{label}</span>;
}
