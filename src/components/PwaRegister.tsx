"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  const iosStandalone = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

function isIosBrowser() {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function shellUrls() {
  const urls = new Set<string>();
  if (!location.pathname.startsWith("/admin")) {
    const current = new URL(location.href);
    current.hash = "";
    urls.add(current.href);
  }

  const collect = (value: string | null | undefined) => {
    if (!value) return;
    try {
      const url = new URL(value, location.origin);
      if (url.origin !== location.origin || url.searchParams.has("_rsc")) return;
      const asset =
        url.pathname.startsWith("/_next/static/") ||
        url.pathname.startsWith("/icons/") ||
        url.pathname === "/icon.svg" ||
        url.pathname === "/favicon.ico" ||
        url.pathname === "/apple-touch-icon.png";
      if (asset) urls.add(url.href);
    } catch {
      // Les adresses illisibles ne font pas partie du cache.
    }
  };

  for (const entry of performance.getEntriesByType("resource")) collect(entry.name);
  for (const element of document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>("script[src], link[href]")) {
    collect(element instanceof HTMLScriptElement ? element.src : element.href);
  }
  return [...urls];
}

export function PwaRegister() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const standalone = isStandalone();
    if (!standalone) setIosHint(isIosBrowser());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    if (!standalone) {
      window.addEventListener("beforeinstallprompt", onPrompt);
      window.addEventListener("appinstalled", onInstalled);
    }

    let unregisterController: (() => void) | undefined;
    if ("serviceWorker" in navigator) {
      const dev = process.env.NODE_ENV !== "production";
      const cacheShell = () => {
        if (dev) return;
        navigator.serviceWorker.controller?.postMessage({ type: "cache-urls", urls: shellUrls() });
      };
      unregisterController = () => navigator.serviceWorker.removeEventListener("controllerchange", cacheShell);
      navigator.serviceWorker.addEventListener("controllerchange", cacheShell);
      navigator.serviceWorker
        .register(dev ? "/sw.js?dev=1" : "/sw.js", { scope: "/", updateViaCache: "none" })
        .then(() => {
          cacheShell();
        })
        .catch(() => undefined);
    }

    return () => {
      if (!standalone) {
        window.removeEventListener("beforeinstallprompt", onPrompt);
        window.removeEventListener("appinstalled", onInstalled);
      }
      unregisterController?.();
    };
  }, []);

  if (installEvent) {
    return (
      <button
        type="button"
        className="secondary mt-3"
        onClick={() => {
          void installEvent.prompt().then(() => setInstallEvent(null));
        }}
      >
        Installer l’application
      </button>
    );
  }

  if (iosHint) {
    return <p className="mt-3 mb-0">Sur iPhone ou iPad : Partager, puis « Sur l’écran d’accueil ».</p>;
  }

  return null;
}
