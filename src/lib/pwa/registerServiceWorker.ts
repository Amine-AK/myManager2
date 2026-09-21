// ==========================================
// PWA CONTROLLER & SERVICE WORKER REGISTRATION
// Manages offline shell & installation prompt
// ==========================================

export interface InstallPromptState {
  canInstall: boolean;
  isStandalone: boolean;
}

type InstallPromptListener = (state: InstallPromptState) => void;

class InstallPromptController {
  private deferredPrompt: any = null;
  private listeners: Set<InstallPromptListener> = new Set();
  private state: InstallPromptState = {
    canInstall: false,
    isStandalone: false
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.checkStandalone();

      window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent default mini-infobar from appearing on mobile
        e.preventDefault();
        this.deferredPrompt = e;
        this.state.canInstall = true;
        this.notifyListeners();
      });

      window.addEventListener('appinstalled', () => {
        this.deferredPrompt = null;
        this.state.canInstall = false;
        this.state.isStandalone = true;
        this.notifyListeners();
        console.log('[PWA] Application successfully installed.');
      });
    }
  }

  private checkStandalone(): void {
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        (typeof document !== 'undefined' && document.referrer ? document.referrer.includes('android-app://') : false);

      this.state.isStandalone = isStandalone;
      if (isStandalone) {
        this.state.canInstall = false;
      }
    }
  }

  public getState(): InstallPromptState {
    return { ...this.state };
  }

  public subscribe(listener: InstallPromptListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('[PWA] Error in install prompt listener:', err);
      }
    });
  }

  /**
   * Triggers the native browser install prompt dialog
   */
  public async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        this.state.canInstall = false;
        this.deferredPrompt = null;
        this.notifyListeners();
        return true;
      }
    } catch (err) {
      console.warn('[PWA] User dismissed install prompt or error occurred:', err);
    }
    return false;
  }
}

export const installPromptController = new InstallPromptController();

/**
 * Registers the service worker in supported browser environments
 */
export function registerServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered with scope:', registration.scope);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[PWA] New content available; please refresh.');
                  } else {
                    console.log('[PWA] Content cached for offline use.');
                  }
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }
}
