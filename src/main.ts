import './index.css';
import { Game } from './Game';
import { PWAHelper } from './PWAHelper';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Game canvas element not found');
    return;
  }

  // Initialize PWA Helper for offline capability and install prompts
  new PWAHelper();

  // Initialize Game instance
  const game = new Game(canvas);

  // Expose on window for testing/debugging if needed
  (window as unknown as { __game: Game }).__game = game;
});
