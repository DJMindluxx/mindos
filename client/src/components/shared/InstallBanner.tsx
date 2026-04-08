import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsStandalone(standalone);

    // iOS detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Listen for Android/Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
  }

  // Don't show if: already installed, dismissed, or nothing to show
  if (isStandalone || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <div
      style={{
        marginBottom: 14,
        padding: "14px 16px",
        borderRadius: 16,
        border: "1px solid rgba(205,168,104,.2)",
        background: "rgba(205,168,104,.07)",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: "rgba(205,168,104,.14)", border: "1px solid rgba(205,168,104,.22)",
        display: "grid", placeItems: "center", color: "var(--gold)",
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
          <line x1="12" y1="18" x2="12" y2="18"/>
        </svg>
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
          MindOS installieren
        </div>
        {isIOS ? (
          <div style={{ fontSize: 11, color: "var(--muted-text)", lineHeight: 1.4 }}>
            Tippe auf <strong style={{ color: "var(--gold)" }}>Teilen</strong> → <strong style={{ color: "var(--gold)" }}>Zum Home-Bildschirm</strong> für den App-Zugriff.
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "var(--muted-text)" }}>
            Als App installieren für schnellen Zugriff.
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstall}
            style={{
              padding: "6px 12px", borderRadius: 10,
              border: "1px solid rgba(205,168,104,.3)",
              background: "rgba(205,168,104,.14)",
              color: "var(--gold)", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            Installieren
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          style={{
            padding: "6px 10px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,.08)",
            background: "rgba(255,255,255,.03)",
            color: "var(--faint)", fontSize: 12, cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
