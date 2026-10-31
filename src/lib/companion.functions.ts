import { createServerFn } from '@tanstack/react-start';
import { requireActiveAccount } from './account.functions';

/** Static capability evidence, never inferred from sample hosts or a last-seen timestamp. */
export const companionReadiness = createServerFn({ method: 'POST' })
  .middleware([requireActiveAccount])
  .handler(async () => ({
    state: 'blocked' as const,
    source: 'Local PTY and encrypted-frame acceptance core available',
    enrollment: 'Not implemented',
    relay: 'Not connected',
    persistence: 'Host tmux supervisor not implemented',
    installer: 'No signed native release',
    executionAllowed: false as const,
  }));