import './index.css';
import { Game } from './Game';
import { PWAHelper } from './PWAHelper';

function initGame(): void {
  try {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Pencil Flow: Game canvas element (#game-canvas) not found in DOM');
      return;
    }

    // Initialize PWA Helper for offline capability and install prompts
    try {
      new PWAHelper();
    } catch (pwaErr) {
      console.warn('PWA initialization non-fatal note:', pwaErr);
    }

    // Initialize Game instance
    const game = new Game(canvas);

    // Expose on window for debugging & inspection
    (window as unknown as { __game: Game }).__game = game;
  } catch (err) {
    console.error('Failed to initialize Pencil Flow game:', err);
  }
}

// Support both early loading and deferred/iframe execution when DOM is already complete
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  // DOM is already ready
  initGame();
}
