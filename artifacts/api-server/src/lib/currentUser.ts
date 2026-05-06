import { AsyncLocalStorage } from "node:async_hooks";

export interface CurrentUserContext {
  userId: number;
  getAccessToken: () => Promise<string>;
  invalidateAccessToken: () => void;
}

export const currentUserStore = new AsyncLocalStorage<CurrentUserContext>();

export function getCurrentUserContext(): CurrentUserContext | undefined {
  return currentUserStore.getStore();
}
