import React, { useEffect, useState } from 'react';
import { installPromptController, type InstallPromptState } from '../../lib/pwa/registerServiceWorker';
import { Download } from 'lucide-react';

export const InstallAppButton: React.FC = () => {
  const [promptState, setPromptState] = useState<InstallPromptState>(installPromptController.getState());

  useEffect(() => {
    const unsubscribe = installPromptController.subscribe(setPromptState);
    return () => {
      unsubscribe();
    };
  }, []);

  if (!promptState.canInstall || promptState.isStandalone) {
    return null;
  }

  const handleInstallClick = async () => {
    await installPromptController.promptInstall();
  };

  return (
    <button
      onClick={handleInstallClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-all shadow-sm active:scale-95"
      title="Install myManager to your home screen or desktop for fast offline access"
    >
      <Download className="w-3.5 h-3.5 text-emerald-400" />
      <span>Install App</span>
    </button>
  );
};
