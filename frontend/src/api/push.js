import { apiFetch } from './client';

export async function getVapidKey() {
  const data = await apiFetch('/push/vapid-key');
  return data.publicKey;
}

export async function subscribePush(subscription) {
  return apiFetch('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
  });
}

export async function unsubscribePush(subscription) {
  return apiFetch('/push/unsubscribe', {
    method: 'DELETE',
    body: JSON.stringify(subscription),
  });
}

/** Converte a chave pública VAPID (base64url) para Uint8Array que o browser espera. */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
