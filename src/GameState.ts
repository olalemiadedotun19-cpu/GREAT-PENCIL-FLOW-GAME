export type GameMode = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export interface GameStateListener {
  onStateChange?: (state: GameMode) => void;
  onScoreUpdate?: (score: number, distance: number, speed: number) => void;
  onGameOver?: (score: number, distance: number, isNewBest: boolean, reason: string) => void;
  onSoundChange?: (enabled: boolean) => void;
}

export class GameState {
  private mode: GameMode = 'MENU';
  public distance = 0;
  public score = 0;
  public speed = 12;
  public bestScore = 0;
  public bestDistance = 0;
  public soundEnabled = true;
  public deathReason = 'Fell off the path';
  public isNewRecord = false;

  private listeners: GameStateListener[] = [];

  constructor() {
    this.loadHighScores();
  }

  private loadHighScores(): void {
    try {
      const savedScore = localStorage.getItem('pencil_flow_best_score');
      if (savedScore) this.bestScore = parseInt(savedScore, 10) || 0;
      const savedDist = localStorage.getItem('pencil_flow_best_dist');
      if (savedDist) this.bestDistance = parseFloat(savedDist) || 0;
      const soundPref = localStorage.getItem('pencil_flow_sound');
      if (soundPref !== null) this.soundEnabled = soundPref === 'true';
    } catch {
      // LocalStorage not available or blocked in iframe
    }
  }

  private saveHighScores(): void {
    try {
      localStorage.setItem('pencil_flow_best_score', this.bestScore.toString());
      localStorage.setItem('pencil_flow_best_dist', this.bestDistance.toFixed(1));
      localStorage.setItem('pencil_flow_sound', this.soundEnabled.toString());
    } catch {
      // Ignore
    }
  }

  public subscribe(listener: GameStateListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getMode(): GameMode {
    return this.mode;
  }

  public setMode(newMode: GameMode): void {
    if (this.mode === newMode) return;
    this.mode = newMode;
    for (const l of this.listeners) {
      l.onStateChange?.(newMode);
    }
  }

  public resetRun(startSpeed: number): void {
    this.distance = 0;
    this.score = 0;
    this.speed = startSpeed;
    this.isNewRecord = false;
    this.deathReason = 'Fell off the path';
  }

  public updateProgress(deltaDist: number, currentSpeed: number): void {
    if (this.mode !== 'PLAYING') return;

    this.distance += deltaDist;
    this.speed = currentSpeed;
    // Score based on distance with speed bonus
    this.score = Math.floor(this.distance * 1.2);

    for (const l of this.listeners) {
      l.onScoreUpdate?.(this.score, Math.floor(this.distance), this.speed);
    }
  }

  public triggerGameOver(reason: string): void {
    if (this.mode === 'GAME_OVER') return;
    this.deathReason = reason;
    this.isNewRecord = false;

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.bestDistance = this.distance;
      this.isNewRecord = true;
      this.saveHighScores();
    }

    this.setMode('GAME_OVER');

    for (const l of this.listeners) {
      l.onGameOver?.(this.score, Math.floor(this.distance), this.isNewRecord, reason);
    }
  }

  public toggleSound(): boolean {
    this.soundEnabled = !this.soundEnabled;
    this.saveHighScores();
    for (const l of this.listeners) {
      l.onSoundChange?.(this.soundEnabled);
    }
    return this.soundEnabled;
  }
}
