export type GoogleCodeClient = { requestCode: () => void };

declare global {
  interface Window {
    google?: any;
  }
}

let loader: Promise<void> | null = null;

export function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (loader) return loader;

  loader = new Promise((resolve, reject) => {
    const start = Date.now();
    const timeoutMs = 10_000;

    const tick = () => {
      if (window.google?.accounts?.oauth2) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error("Google Identity script not loaded"));
      setTimeout(tick, 50);
    };

    tick();
  });

  return loader;
}

export function getGoogleClientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!id) throw new Error("Missing VITE_GOOGLE_CLIENT_ID");
  return id;
}
