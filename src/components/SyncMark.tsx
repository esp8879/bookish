import { useStore } from '../data/store';

/** Always-visible sync state. navigator.onLine stays true on weak subway wifi, so a write stuck for a few seconds counts as waiting. */
export function SyncMark() {
  const { pending, stuck, online } = useStore();
  const [label, state] = !pending ? [online ? 'Synced' : 'Synced · offline', 'ok']
    : !online || stuck ? ['Waiting to sync', 'wait'] : ['Syncing…', 'busy'];
  return <span className={`sync ${state}`} role="status"><i aria-hidden />{label}</span>;
}
