import { router } from '@inertiajs/react';
import { removeNotificationToken } from '@/lib/browserNotifications';

export async function logoutCurrentBrowser(options = {}) {
  await removeNotificationToken();

  router.post('/logout', {}, {
    preserveScroll: true,
    ...options,
  });
}
