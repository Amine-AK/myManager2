import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('PWA InstallPromptController', () => {
  let mockWindow: any;

  beforeEach(async () => {
    // Setup lightweight EventTarget window mock for Node test environment
    const listeners: Record<string, Function[]> = {};

    mockWindow = {
      addEventListener: (type: string, listener: Function) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(listener);
      },
      removeEventListener: (type: string, listener: Function) => {
        if (listeners[type]) {
          listeners[type] = listeners[type].filter(l => l !== listener);
        }
      },
      dispatchEvent: (event: any) => {
        if (listeners[event.type]) {
          listeners[event.type].forEach(l => l(event));
        }
      },
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      navigator: {}
    };

    (globalThis as any).window = mockWindow;
  });

  afterEach(() => {
    delete (globalThis as any).window;
    vi.resetModules();
  });

  it('subscribes and notifies listeners on state changes', async () => {
    // Dynamically import so constructor runs with mockWindow active
    const { installPromptController } = await import('../registerServiceWorker');

    const listener = vi.fn();
    const unsubscribe = installPromptController.subscribe(listener);

    // Initial notification
    expect(listener).toHaveBeenCalledWith({ canInstall: false, isStandalone: false });

    // Simulate beforeinstallprompt event
    const preventDefault = vi.fn();
    const mockPromptEvent = {
      type: 'beforeinstallprompt',
      preventDefault,
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' })
    };

    mockWindow.dispatchEvent(mockPromptEvent);

    expect(installPromptController.getState().canInstall).toBe(true);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ canInstall: true })
    );

    unsubscribe();
  });

  it('triggers promptInstall and clears prompt when accepted', async () => {
    const { installPromptController } = await import('../registerServiceWorker');

    const mockPrompt = vi.fn();
    const mockPromptEvent = {
      type: 'beforeinstallprompt',
      preventDefault: vi.fn(),
      prompt: mockPrompt,
      userChoice: Promise.resolve({ outcome: 'accepted' })
    };

    mockWindow.dispatchEvent(mockPromptEvent);
    expect(installPromptController.getState().canInstall).toBe(true);

    const result = await installPromptController.promptInstall();
    expect(result).toBe(true);
    expect(mockPrompt).toHaveBeenCalled();
    expect(installPromptController.getState().canInstall).toBe(false);
  });

  it('updates state to standalone when appinstalled event fires', async () => {
    const { installPromptController } = await import('../registerServiceWorker');

    (installPromptController as any).state.canInstall = true;

    mockWindow.dispatchEvent({ type: 'appinstalled' });

    const state = installPromptController.getState();
    expect(state.canInstall).toBe(false);
    expect(state.isStandalone).toBe(true);
  });
});
