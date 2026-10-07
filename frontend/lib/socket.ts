'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';
    socket = io(url, {
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
}

/**
 * Real-time dedupe: the actor's client applies optimistic updates first.
 * When the same mutation's WebSocket event arrives, skip if this tab initiated it.
 */
const pendingMutations = new Set<string>();

export function markPendingMutation(key: string) {
  pendingMutations.add(key);
  setTimeout(() => pendingMutations.delete(key), 10_000);
}

export function consumePendingMutation(key: string): boolean {
  if (pendingMutations.has(key)) {
    pendingMutations.delete(key);
    return true;
  }
  return false;
}

export function mutationKey(
  type: string,
  entityId: string,
  extra?: string,
): string {
  return [type, entityId, extra].filter(Boolean).join(':');
}
