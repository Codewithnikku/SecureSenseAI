"use client";

import { useCallback, useMemo, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";

const CHANGE_EVENT = "securesense:local-storage";

function subscribe(key: string, notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) notify();
  };
  const onSameTab = (event: Event) => {
    if (event instanceof CustomEvent && event.detail === key) notify();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onSameTab);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onSameTab);
  };
}

function getSnapshot(key: string) {
  return window.localStorage.getItem(key);
}

function getServerSnapshot() {
  return null;
}

export function useLocalStorageJson<T>(key: string, fallback: T) {
  const subscribeToKey = useCallback((notify: () => void) => subscribe(key, notify), [key]);
  const readKey = useCallback(() => getSnapshot(key), [key]);
  const snapshot = useSyncExternalStore(subscribeToKey, readKey, getServerSnapshot);

  return useMemo(() => {
    if (snapshot === null) return fallback;
    try {
      return JSON.parse(snapshot) as T;
    } catch (error) {
      console.warn(`Could not read saved dashboard data "${key}".`, error);
      return fallback;
    }
  }, [fallback, key, snapshot]);
}

export function useStoredState<T>(
  key: string,
  fallback: T,
): readonly [T, Dispatch<SetStateAction<T>>] {
  const value = useLocalStorageJson(key, fallback);
  const setValue = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    const nextValue = typeof action === "function"
      ? (action as (previous: T) => T)(value)
      : action;
    window.localStorage.setItem(key, JSON.stringify(nextValue));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
  }, [key, value]);
  return [value, setValue] as const;
}

