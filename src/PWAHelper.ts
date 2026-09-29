/**
 * PWA Helper: Install prompt management and offline status indicator
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export class PWAHelper {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled = false;
  private isIOS = false;
  private installBtn: HTMLElement | null = null;
  private offlineIndicator: HTMLElement | null = null;
  private iosModal: HTMLElement | null = null;
  private closeIosBtn: HTMLElement | null = null;

  constructor() {
    this.installBtn = document.getElementById('btn-pwa-install');
    this.offlineIndicator = document.getElementById('offline-indicator');
    this.iosModal = document.getElementById('modal-ios-install');
    this.closeIosBtn = document.getElementById('btn-close-ios-guide');

    this.checkStandalone();
    this.detectPlatform();
    this.bindEvents();
    this.updateOnlineStatus();
  }

  private checkStandalone(): void {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    this.isInstalled = isStandalone;
  }

  private detectPlatform(): void {
    const ua = window.navigator.userAgent.toLowerCase();
    this.isIOS = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: boolean }).MSStream;
  }

  private bindEvents(): void {
    // BeforeInstallPrompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      if (this.installBtn && !this.isInstalled) {
        this.installBtn.classList.remove('hidden');
      }
    });

    // AppInstalled
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      if (this.installBtn) {
        this.installBtn.classList.add('hidden');
      }
    });

    // If iOS and not installed, we can still show the Install button to guide them
    if (this.isIOS && !this.isInstalled && this.installBtn) {
      this.installBtn.classList.remove('hidden');
    }

    // Install Button Click Handler
    if (this.installBtn) {
      this.installBtn.addEventListener('click', async () => {
        if (this.deferredPrompt) {
          await this.deferredPrompt.prompt();
          const { outcome } = await this.deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            this.isInstalled = true;
            this.installBtn?.classList.add('hidden');
          }
          this.deferredPrompt = null;
        } else if (this.isIOS) {
          if (this.iosModal) {
            this.iosModal.classList.remove('hidden');
          }
        }
      });
    }

    if (this.closeIosBtn && this.iosModal) {
      this.closeIosBtn.addEventListener('click', () => {
        this.iosModal?.classList.add('hidden');
      });
    }

    // Online / Offline Connectivity Detection
    window.addEventListener('online', () => this.updateOnlineStatus());
    window.addEventListener('offline', () => this.updateOnlineStatus());
  }

  private updateOnlineStatus(): void {
    const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
    if (this.offlineIndicator) {
      if (isOffline) {
        this.offlineIndicator.classList.remove('hidden');
      } else {
        this.offlineIndicator.classList.add('hidden');
      }
    }
  }
}
