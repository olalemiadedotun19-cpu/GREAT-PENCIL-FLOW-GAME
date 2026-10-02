import { GameMode, GameState } from './GameState';
import { ICONS } from './IconSystem';
import { SaveSystem, GameSettings } from './SaveSystem';
import { SHOP_ITEMS, ShopItem } from './ShopCatalogue';
import { ShopPreview } from './ShopPreview';
import { PencilStyleDefinition, getAllPencilStyles, getPencilStyle } from './PencilStyleSystem';
import confetti from 'canvas-confetti';

export interface UICallbacks {
  onPlay: (isDaily?: boolean) => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onJump: () => void;
  onToggleSound: () => void;
  onEquipCosmetic: (category: 'BALL' | 'TRAIL' | 'PENCIL' | 'WORLD', id: string) => void;
  onSettingsChange: () => void;
}

export class UI {
  private callbacks: UICallbacks;
  private saveSystem: SaveSystem;

  // Screens
  private screenMenu: HTMLElement;
  private screenPause: HTMLElement;
  private screenGameOver: HTMLElement;
  private hud: HTMLElement;

  // HUD elements
  private hudScore: HTMLElement;
  private hudDistance: HTMLElement;
  private hudSpeed: HTMLElement;
  private hudToast: HTMLElement;
  private hudBoost: HTMLElement;
  private hudBoostBar: HTMLElement;
  private hudRunGraphite: HTMLElement;
  private hudComboBadge: HTMLElement;
  private hudComboText: HTMLElement;

  // Menu elements
  private menuBestScore: HTMLElement;
  private menuPlayerLevel: HTMLElement;
  private menuXPBar: HTMLElement;
  private menuGraphiteCount: HTMLElement;
  private menuLeadCount: HTMLElement;
  private menuDailyTitle: HTMLElement;
  private soundIcon: HTMLElement;
  private soundText: HTMLElement;

  // Game over elements
  private goReason: HTMLElement;
  private goScore: HTMLElement;
  private goDistance: HTMLElement;
  private goNewBest: HTMLElement;
  private goRewardGraphite: HTMLElement;
  private goRewardLeads: HTMLElement;
  private goRewardXP: HTMLElement;

  // Modals
  private currentShopCat: 'BALL' | 'TRAIL' | 'PENCIL' | 'WORLD' = 'BALL';
  private toastTimeout: number | null = null;
  private shopPreview: ShopPreview | null = null;

  constructor(callbacks: UICallbacks, saveSystem: SaveSystem) {
    this.callbacks = callbacks;
    this.saveSystem = saveSystem;

    // Grab DOM elements
    this.screenMenu = document.getElementById('screen-menu')!;
    this.screenPause = document.getElementById('screen-pause')!;
    this.screenGameOver = document.getElementById('screen-game-over')!;
    this.hud = document.getElementById('hud')!;

    this.hudScore = document.getElementById('hud-score')!;
    this.hudDistance = document.getElementById('hud-distance')!;
    this.hudSpeed = document.getElementById('hud-speed')!;
    this.hudToast = document.getElementById('hud-toast')!;
    this.hudBoost = document.getElementById('hud-boost')!;
    this.hudBoostBar = document.getElementById('hud-boost-bar')!;
    this.hudRunGraphite = document.getElementById('hud-run-graphite')!;
    this.hudComboBadge = document.getElementById('hud-combo-badge')!;
    this.hudComboText = document.getElementById('hud-combo-text')!;

    this.menuBestScore = document.getElementById('menu-best-score')!;
    this.menuPlayerLevel = document.getElementById('menu-player-level')!;
    this.menuXPBar = document.getElementById('menu-xp-bar')!;
    this.menuGraphiteCount = document.getElementById('menu-graphite-count')!;
    this.menuLeadCount = document.getElementById('menu-lead-count')!;
    this.menuDailyTitle = document.getElementById('menu-daily-title')!;
    this.soundIcon = document.getElementById('sound-icon')!;
    this.soundText = document.getElementById('sound-text')!;

    this.goReason = document.getElementById('game-over-reason')!;
    this.goScore = document.getElementById('go-score')!;
    this.goDistance = document.getElementById('go-distance')!;
    this.goNewBest = document.getElementById('go-new-best')!;
    this.goRewardGraphite = document.getElementById('go-reward-graphite')!;
    this.goRewardLeads = document.getElementById('go-reward-leads')!;
    this.goRewardXP = document.getElementById('go-reward-xp')!;

    this.injectIcons();
    this.bindEvents();
    this.updateProfileDisplay();
    const equipped = this.saveSystem?.getData()?.equippedPencil;
    const initStyle = getPencilStyle(equipped);
    if (initStyle) this.applyPencilStyle(initStyle);
  }

  private injectIcons(): void {
    const setInner = (id: string, svg: string) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = svg;
    };

    setInner('icon-pause-btn', ICONS.PAUSE);
    setInner('hud-icon-graphite', ICONS.GRAPHITE);
    setInner('icon-lead-boost', ICONS.LEAD);
    setInner('icon-jump-btn', ICONS.JUMP);
    setInner('icon-top-graphite', ICONS.GRAPHITE);
    setInner('icon-top-lead', ICONS.LEAD);
    setInner('hero-pencil-icon', ICONS.PENCIL);
    setInner('icon-play-arrow', ICONS.ARROW_RIGHT);
    setInner('icon-daily-btn', ICONS.DAILY);
    setInner('icon-hub-shop', ICONS.SHOP);
    setInner('icon-hub-garage', ICONS.GARAGE);
    setInner('icon-hub-missions', ICONS.MISSIONS);
    setInner('icon-hub-worlds', ICONS.WORLDS);
    setInner('icon-hub-achieve', ICONS.ACHIEVEMENTS);
    setInner('icon-hub-profile', ICONS.PROFILE);
    setInner('icon-hub-ranks', ICONS.LEADERBOARD);
    setInner('icon-hub-settings', ICONS.SETTINGS);
    setInner('icon-shop-header', ICONS.SHOP);
    setInner('icon-resume', ICONS.RESUME);
    setInner('icon-retry', ICONS.RESTART);
    setInner('icon-go-graphite', ICONS.GRAPHITE);
    setInner('icon-go-lead', ICONS.LEAD);
    setInner('icon-go-share', ICONS.SHARE);

    document.querySelectorAll('.icon-close').forEach((el) => {
      el.innerHTML = ICONS.CLOSE;
    });
  }

  private bindEvents(): void {
    // Menu buttons
    document.getElementById('btn-play')?.addEventListener('click', () => this.callbacks.onPlay(false));
    document.getElementById('btn-daily-challenge')?.addEventListener('click', () => this.openModal('modal-daily'));
    document.getElementById('btn-start-daily')?.addEventListener('click', () => {
      this.closeModal('modal-daily');
      this.callbacks.onPlay(true);
    });
    document.getElementById('btn-sound-toggle')?.addEventListener('click', () => this.callbacks.onToggleSound());
    document.getElementById('btn-how-to-play')?.addEventListener('click', () => this.openModal('modal-how'));

    // World Artist Style Quick Switcher
    const cycleStyle = (direction: 1 | -1) => {
      const styles = getAllPencilStyles();
      const currentId = this.saveSystem.getData().equippedPencil;
      let currentIndex = styles.findIndex((s) => s.id === currentId);
      if (currentIndex === -1) currentIndex = 0;
      const nextIndex = (currentIndex + direction + styles.length) % styles.length;
      const nextStyle = styles[nextIndex];
      this.saveSystem.getData().equippedPencil = nextStyle.id;
      this.saveSystem.save();
      this.callbacks.onEquipCosmetic('PENCIL', nextStyle.id);
      this.showToast(`${nextStyle.name}: ${nextStyle.artistTitle}`);
    };

    document.getElementById('btn-style-prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      cycleStyle(-1);
    });
    document.getElementById('btn-style-next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      cycleStyle(1);
    });
    document.getElementById('world-style-picker')?.addEventListener('click', () => {
      cycleStyle(1);
    });

    // Hub buttons
    document.getElementById('hub-shop')?.addEventListener('click', () => {
      this.renderShop();
      this.openModal('modal-shop');
    });
    document.getElementById('hub-garage')?.addEventListener('click', () => {
      this.renderGarage();
      this.openModal('modal-garage');
    });
    document.getElementById('hub-missions')?.addEventListener('click', () => {
      this.renderMissions();
      this.openModal('modal-missions');
    });
    document.getElementById('hub-worlds')?.addEventListener('click', () => {
      this.renderWorlds();
      this.openModal('modal-worlds');
    });
    document.getElementById('hub-achievements')?.addEventListener('click', () => {
      this.renderAchievements();
      this.openModal('modal-achievements');
    });
    document.getElementById('hub-profile')?.addEventListener('click', () => {
      this.renderProfile();
      this.openModal('modal-profile');
    });
    document.getElementById('hub-leaderboard')?.addEventListener('click', () => {
      this.renderLeaderboard();
      this.openModal('modal-leaderboard');
    });
    document.getElementById('hub-settings')?.addEventListener('click', () => {
      this.renderSettings();
      this.openModal('modal-settings');
    });

    // Close buttons for all modals
    document.querySelectorAll('.btn-close-modal').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement).getAttribute('data-target');
        if (target) this.closeModal(target);
      });
    });

    // Shop tabs
    document.querySelectorAll('.shop-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.shop-tab').forEach((t) => {
          t.classList.remove('bg-[#2b2723]', 'text-[#f5f0e6]');
          t.classList.add('bg-[#f4ece0]', 'text-[#2b2723]');
        });
        const current = e.currentTarget as HTMLElement;
        current.classList.add('bg-[#2b2723]', 'text-[#f5f0e6]');
        current.classList.remove('bg-[#f4ece0]', 'text-[#2b2723]');
        this.currentShopCat = (current.getAttribute('data-cat') as ShopItem['category']) || 'BALL';
        this.renderShop();
      });
    });

    // HUD buttons
    document.getElementById('btn-pause')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onPause();
    });

    const btnJump = document.getElementById('btn-jump');
    btnJump?.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.callbacks.onJump();
    });
    btnJump?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onJump();
    });

    // Pause buttons
    document.getElementById('btn-resume')?.addEventListener('click', () => this.callbacks.onResume());
    document.getElementById('btn-pause-restart')?.addEventListener('click', () => this.callbacks.onRestart());
    document.getElementById('btn-pause-menu')?.addEventListener('click', () => this.callbacks.onMenu());

    // Game Over buttons
    document.getElementById('btn-retry')?.addEventListener('click', () => this.callbacks.onRestart());
    document.getElementById('btn-go-menu')?.addEventListener('click', () => this.callbacks.onMenu());
    document.getElementById('btn-go-share')?.addEventListener('click', () => {
      const dist = this.goDistance ? this.goDistance.textContent : '0 m';
      const score = this.goScore ? this.goScore.textContent : '0';
      const text = `I rolled ${dist} with a score of ${score} in Pencil Flow! The pencil draws, you roll. Can you beat my distance?`;

      if (navigator.share) {
        navigator.share({
          title: 'Pencil Flow Run',
          text,
          url: window.location.href,
        }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          this.showToast('RECORD COPIED TO CLIPBOARD!');
        }).catch(() => {
          this.showToast('UNABLE TO COPY SCORE');
        });
      }
    });

    // Settings listeners
    const slider = document.getElementById('setting-sensitivity') as HTMLInputElement;
    slider?.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      this.saveSystem.getData().settings.sensitivity = val;
      const label = document.getElementById('label-sensitivity');
      if (label) label.textContent = `${val.toFixed(1)}x`;
      this.saveSystem.save();
      this.callbacks.onSettingsChange();
    });

    const autosteer = document.getElementById('setting-autosteer') as HTMLInputElement;
    autosteer?.addEventListener('change', () => {
      this.saveSystem.getData().settings.autoSteerAssist = autosteer.checked;
      this.saveSystem.save();
      this.callbacks.onSettingsChange();
    });

    const shake = document.getElementById('setting-shake') as HTMLInputElement;
    shake?.addEventListener('change', () => {
      this.saveSystem.getData().settings.cameraShake = shake.checked;
      this.saveSystem.save();
      this.callbacks.onSettingsChange();
    });
  }

  public openModal(modalId: string): void {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('hidden');
  }

  public closeModal(modalId: string): void {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('hidden');
    this.updateProfileDisplay();
  }

  public updateProfileDisplay(): void {
    const data = this.saveSystem.getData();
    if (this.menuPlayerLevel) this.menuPlayerLevel.textContent = data.level.toString();
    if (this.menuGraphiteCount) this.menuGraphiteCount.textContent = data.graphite.toString();
    if (this.menuLeadCount) this.menuLeadCount.textContent = data.leads.toString();
    if (this.menuBestScore) this.menuBestScore.textContent = `${Math.floor(data.stats.bestDistance)} m`;

    const reqXP = this.saveSystem.getXPForNextLevel(data.level);
    const pct = Math.min(100, Math.floor((data.xp / reqXP) * 100));
    if (this.menuXPBar) this.menuXPBar.style.width = `${pct}%`;

    const dailyMod = this.saveSystem.getDailyChallengeModifier();
    if (this.menuDailyTitle) this.menuDailyTitle.textContent = dailyMod.name;

    const modName = document.getElementById('daily-mod-name');
    if (modName) modName.textContent = dailyMod.name;
    const modDesc = document.getElementById('daily-mod-desc');
    if (modDesc) modDesc.textContent = dailyMod.desc;
    const streakCount = document.getElementById('daily-streak-count');
    if (streakCount) streakCount.textContent = `${data.dailyStreak} Days`;
    const dailyBest = document.getElementById('daily-best-dist');
    if (dailyBest) dailyBest.textContent = `${Math.floor(data.dailyHighScore)} m`;
  }

  public renderShop(): void {
    const grid = document.getElementById('shop-items-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const data = this.saveSystem.getData();
    const items = SHOP_ITEMS.filter((item) => item.category === this.currentShopCat);

    const isUnlocked = (item: ShopItem) => {
      switch (item.category) {
        case 'BALL': return data.unlockedBalls.includes(item.id);
        case 'TRAIL': return data.unlockedTrails.includes(item.id);
        case 'PENCIL': return data.unlockedPencils.includes(item.id);
        case 'WORLD': return data.unlockedWorlds.includes(item.id);
      }
    };

    const isEquipped = (item: ShopItem) => {
      switch (item.category) {
        case 'BALL': return data.equippedBall === item.id;
        case 'TRAIL': return data.equippedTrail === item.id;
        case 'PENCIL': return data.equippedPencil === item.id;
        case 'WORLD': return data.equippedWorld === item.id;
      }
    };

    items.forEach((item) => {
      const unlocked = isUnlocked(item);
      const equipped = isEquipped(item);

      const card = document.createElement('div');
      card.className = `p-3.5 bg-[#f5ede0] rounded-2xl border-2 ${
        equipped ? 'border-[#2b2723] bg-[#fbf5eb] shadow-[3px_3px_0px_#2b2723]' : 'border-[#2b2723]/30'
      } flex flex-col justify-between text-left`;

      const priceIcon = item.priceType === 'GRAPHITE' ? ICONS.GRAPHITE : ICONS.LEAD;
      const priceText = item.price === 0 ? 'FREE' : `${item.price}`;

      const pencilStyle = item.category === 'PENCIL' ? getPencilStyle(item.id) : null;
      const artistBadge = pencilStyle
        ? `<div class="text-[9px] font-black text-[#b45309] bg-[#fef3c7] px-2 py-0.5 rounded-md uppercase tracking-wider mb-1 inline-block">${pencilStyle.artistTitle}</div>`
        : '';
      const subtitleDesc = pencilStyle ? `<div class="text-[10px] font-semibold text-[#8c8274] mb-1">${pencilStyle.subtitle}</div>` : '';

      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
              item.rarity === 'LEGENDARY' ? 'bg-[#fef3c7] text-[#92400e]' :
              item.rarity === 'EPIC' ? 'bg-[#e0e7ff] text-[#3730a3]' :
              item.rarity === 'RARE' ? 'bg-[#e0f2fe] text-[#0369a1]' : 'bg-[#e5e7eb] text-[#374151]'
            }">${item.rarity}</span>
            <div class="w-4 h-4 rounded-full border border-[#2b2723]/40" style="background-color: ${item.colorHex};"></div>
          </div>
          ${artistBadge}
          <h4 class="font-bold text-sm text-[#221f1d]">${item.name}</h4>
          ${subtitleDesc}
          <p class="text-[11px] text-[#756a5e] mb-3 leading-tight">${item.desc}</p>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-[#2b2723]/15">
          <div class="flex items-center gap-1 font-bold text-xs">
            <span>${priceIcon}</span>
            <span>${priceText}</span>
          </div>
          <button class="btn-action-shop px-3 py-1.5 rounded-xl font-bold text-xs ${
            equipped ? 'bg-[#2b2723] text-[#f5f0e6]' :
            unlocked ? 'bg-[#fdfbf7] border border-[#2b2723] text-[#2b2723] hover:bg-[#ede5d6]' :
            'bg-[#2b2723] text-[#f5f0e6] hover:bg-[#3d3833]'
          }">${equipped ? 'EQUIPPED' : unlocked ? 'EQUIP' : 'BUY'}</button>
        </div>
      `;

      card.querySelector('.btn-action-shop')?.addEventListener('click', () => {
        if (equipped) return;
        if (unlocked) {
          this.equipItem(item);
        } else {
          // Attempt purchase
          const graphiteReq = item.priceType === 'GRAPHITE' ? item.price : 0;
          const leadsReq = item.priceType === 'LEAD' ? item.price : 0;
          if (this.saveSystem.spendCurrency(graphiteReq, leadsReq)) {
            switch (item.category) {
              case 'BALL': data.unlockedBalls.push(item.id); break;
              case 'TRAIL': data.unlockedTrails.push(item.id); break;
              case 'PENCIL': data.unlockedPencils.push(item.id); break;
              case 'WORLD': data.unlockedWorlds.push(item.id); break;
            }
            this.saveSystem.save();
            this.equipItem(item);
            this.showToast(`UNLOCKED: ${item.name}!`);
          } else {
            this.showToast('NOT ENOUGH CURRENCY!');
          }
        }
        this.renderShop();
        this.updateProfileDisplay();
      });

      grid.appendChild(card);
    });
  }

  private equipItem(item: ShopItem): void {
    const data = this.saveSystem.getData();
    switch (item.category) {
      case 'BALL': data.equippedBall = item.id; break;
      case 'TRAIL': data.equippedTrail = item.id; break;
      case 'PENCIL': data.equippedPencil = item.id; break;
      case 'WORLD': data.equippedWorld = item.id; break;
    }
    this.saveSystem.save();
    this.callbacks.onEquipCosmetic(item.category, item.id);
  }

  public renderGarage(): void {
    const data = this.saveSystem.getData();
    const findName = (id: string) => SHOP_ITEMS.find((i) => i.id === id)?.name || id;

    const ballName = document.getElementById('garage-ball-name');
    if (ballName) ballName.textContent = findName(data.equippedBall);
    const pencilStyle = getPencilStyle(data.equippedPencil);
    const pencilName = document.getElementById('garage-pencil-name');
    if (pencilName) pencilName.textContent = `${pencilStyle.name} (${pencilStyle.artistTitle})`;
    const trailName = document.getElementById('garage-trail-name');
    if (trailName) trailName.textContent = findName(data.equippedTrail);
    const worldName = document.getElementById('garage-world-name');
    if (worldName) worldName.textContent = findName(data.equippedWorld);

    document.querySelectorAll('.btn-goto-shop-cat').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const cat = (e.currentTarget as HTMLElement).getAttribute('data-cat') as ShopItem['category'];
        this.closeModal('modal-garage');
        this.currentShopCat = cat;
        this.renderShop();
        this.openModal('modal-shop');
      });
    });
  }

  public renderMissions(): void {
    const list = document.getElementById('missions-list');
    if (!list) return;
    list.innerHTML = '';

    const data = this.saveSystem.getData();
    data.missions.forEach((m) => {
      const card = document.createElement('div');
      card.className = `p-3 bg-[#f5ede0] rounded-2xl border ${
        m.completed ? 'border-[#10b981]/50 bg-[#ecfdf5]' : 'border-[#2b2723]/25'
      } flex items-center justify-between text-left`;

      const pct = Math.min(100, Math.floor((m.progress / m.target) * 100));
      const rewardIcon = m.rewardType === 'GRAPHITE' ? ICONS.GRAPHITE : m.rewardType === 'LEAD' ? ICONS.LEAD : 'XP';

      card.innerHTML = `
        <div class="flex-1 pr-3">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
              m.isDaily ? 'bg-[#fef3c7] text-[#92400e]' : 'bg-[#e5e7eb] text-[#374151]'
            }">${m.isDaily ? 'DAILY' : 'LIFETIME'}</span>
            <span class="font-bold text-xs text-[#221f1d]">${m.title}</span>
          </div>
          <p class="text-[11px] text-[#756a5e] mb-1.5 leading-tight">${m.desc}</p>
          <div class="w-full h-1.5 bg-[#2b2723]/15 rounded-full overflow-hidden">
            <div class="h-full bg-[#2b2723] rounded-full" style="width: ${pct}%;"></div>
          </div>
        </div>

        <div class="text-right">
          <div class="flex items-center justify-end gap-1 text-xs font-bold mb-1">
            <span>${rewardIcon}</span>
            <span>+${m.rewardAmount}</span>
          </div>
          <button class="btn-claim-mission px-3 py-1 rounded-xl text-xs font-bold ${
            m.claimed ? 'bg-[#d1d5db] text-[#6b7280]' :
            m.completed ? 'bg-[#10b981] text-[#fdfbf7] hover:bg-[#059669]' :
            'bg-[#e5e7eb] text-[#9ca3af] pointer-events-none'
          }">${m.claimed ? 'CLAIMED' : m.completed ? 'CLAIM' : `${Math.floor(m.progress)}/${m.target}`}</button>
        </div>
      `;

      card.querySelector('.btn-claim-mission')?.addEventListener('click', () => {
        const claimed = this.saveSystem.claimMissionReward(m.id);
        if (claimed) {
          this.showToast(`REWARD CLAIMED: +${claimed.rewardAmount} ${claimed.rewardType}!`);
          this.renderMissions();
          this.updateProfileDisplay();
        }
      });

      list.appendChild(card);
    });
  }

  public renderWorlds(): void {
    const grid = document.getElementById('worlds-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const data = this.saveSystem.getData();
    const worlds = SHOP_ITEMS.filter((i) => i.category === 'WORLD');

    worlds.forEach((w) => {
      const unlocked = data.unlockedWorlds.includes(w.id);
      const equipped = data.equippedWorld === w.id;

      const card = document.createElement('div');
      card.className = `p-3.5 bg-[#f5ede0] rounded-2xl border-2 ${
        equipped ? 'border-[#2b2723] bg-[#fbf5eb] shadow-[3px_3px_0px_#2b2723]' : 'border-[#2b2723]/30'
      } flex flex-col justify-between text-left`;

      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between mb-1">
            <h4 class="font-bold text-sm text-[#221f1d]">${w.name}</h4>
            <div class="w-4 h-4 rounded-full border border-[#2b2723]/40" style="background-color: ${w.colorHex};"></div>
          </div>
          <p class="text-[11px] text-[#756a5e] mb-3 leading-tight">${w.desc}</p>
        </div>
        <button class="btn-select-world w-full py-1.5 rounded-xl font-bold text-xs ${
          equipped ? 'bg-[#2b2723] text-[#f5f0e6]' :
          unlocked ? 'bg-[#fdfbf7] border border-[#2b2723] text-[#2b2723]' :
          'bg-[#d1d5db] text-[#6b7280]'
        }">${equipped ? 'ACTIVE WORLD' : unlocked ? 'SELECT WORLD' : 'LOCKED IN SHOP'}</button>
      `;

      card.querySelector('.btn-select-world')?.addEventListener('click', () => {
        if (unlocked) {
          data.equippedWorld = w.id;
          this.saveSystem.save();
          this.callbacks.onEquipCosmetic('WORLD', w.id);
          this.renderWorlds();
        }
      });

      grid.appendChild(card);
    });
  }

  public renderAchievements(): void {
    const list = document.getElementById('achievements-list');
    if (!list) return;
    list.innerHTML = '';

    const data = this.saveSystem.getData();
    const countText = document.getElementById('achieve-count-text');
    const unlockedCount = data.achievements.filter((a) => a.unlocked).length;
    if (countText) countText.textContent = `${unlockedCount} / ${data.achievements.length} Completed`;

    data.achievements.forEach((a) => {
      const card = document.createElement('div');
      card.className = `p-2.5 bg-[#f5ede0] rounded-xl border ${
        a.unlocked ? 'border-[#10b981]/50 bg-[#ecfdf5]' : 'border-[#2b2723]/20'
      } flex items-center justify-between text-left`;

      const pct = Math.min(100, Math.floor((a.progress / a.target) * 100));

      card.innerHTML = `
        <div class="flex-1 pr-3">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-xs text-[#221f1d]">${a.title}</span>
            ${a.unlocked ? `<span class="text-[#10b981]">${ICONS.CHECK}</span>` : ''}
          </div>
          <p class="text-[10px] text-[#756a5e] mb-1">${a.desc}</p>
          <div class="w-full h-1.5 bg-[#2b2723]/15 rounded-full overflow-hidden">
            <div class="h-full bg-[#2b2723] rounded-full" style="width: ${pct}%;"></div>
          </div>
        </div>
        <div class="text-right text-xs font-bold text-[#b45309] flex items-center gap-1">
          <span>${ICONS.LEAD}</span>
          <span>+${a.rewardLeads}</span>
        </div>
      `;

      list.appendChild(card);
    });
  }

  public renderProfile(): void {
    const grid = document.getElementById('profile-stats-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const s = this.saveSystem.getData().stats;
    const statsList = [
      { label: 'Total Distance', val: `${Math.floor(s.totalDistance)} m` },
      { label: 'Best Single Run', val: `${Math.floor(s.bestDistance)} m` },
      { label: 'Total Runs', val: `${s.totalRuns}` },
      { label: 'Top Speed', val: `${s.bestSpeed.toFixed(1)} u/s` },
      { label: 'Graphite Shards', val: `${s.graphiteCollected}` },
      { label: 'Lead Boosts Picked', val: `${s.leadsCollected}` },
      { label: 'Obstacles Dodged', val: `${s.obstaclesDodged}` },
      { label: 'Close Calls', val: `${s.closeCalls}` },
      { label: 'Perfect Landings', val: `${s.perfectLandings}` },
      { label: 'Highest Combo', val: `x${s.bestCombo}` },
      { label: 'Total Jumps', val: `${s.jumps}` },
      { label: 'Best Run Score', val: `${s.bestScore}` },
    ];

    statsList.forEach((st) => {
      const card = document.createElement('div');
      card.className = 'p-2.5 bg-[#f5ede0] rounded-xl border border-[#2b2723]/25';
      card.innerHTML = `
        <span class="text-[10px] uppercase font-bold text-[#756a5e] block">${st.label}</span>
        <strong class="text-base font-black text-[#221f1d]">${st.val}</strong>
      `;
      grid.appendChild(card);
    });
  }

  public renderLeaderboard(): void {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    list.innerHTML = '';

    const board = this.saveSystem.getData().leaderboard;
    board.forEach((entry, idx) => {
      const row = document.createElement('div');
      row.className = `p-2.5 rounded-xl border flex items-center justify-between ${
        entry.name === 'You' ? 'bg-[#fef3c7] border-[#d97706]/50' : 'bg-[#f5ede0] border-[#2b2723]/20'
      }`;

      row.innerHTML = `
        <div class="flex items-center gap-2.5">
          <span class="w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center ${
            idx === 0 ? 'bg-[#f59e0b] text-[#fdfbf7]' :
            idx === 1 ? 'bg-[#94a3b8] text-[#fdfbf7]' :
            idx === 2 ? 'bg-[#b45309] text-[#fdfbf7]' : 'bg-[#2b2723]/10 text-[#2b2723]'
          }">#${idx + 1}</span>
          <div>
            <strong class="text-xs text-[#221f1d] block">${entry.name}</strong>
            <span class="text-[10px] text-[#756a5e]">${entry.date}</span>
          </div>
        </div>
        <div class="text-right">
          <strong class="text-sm font-black text-[#221f1d] block">${entry.score} pts</strong>
          <span class="text-[10px] text-[#756a5e]">${entry.distance} m</span>
        </div>
      `;

      list.appendChild(row);
    });
  }

  public renderSettings(): void {
    const settings = this.saveSystem.getData().settings;
    const slider = document.getElementById('setting-sensitivity') as HTMLInputElement;
    if (slider) slider.value = settings.sensitivity.toString();
    const label = document.getElementById('label-sensitivity');
    if (label) label.textContent = `${settings.sensitivity.toFixed(1)}x`;

    const autosteer = document.getElementById('setting-autosteer') as HTMLInputElement;
    if (autosteer) autosteer.checked = settings.autoSteerAssist;

    const sound = document.getElementById('setting-sound') as HTMLInputElement;
    if (sound) sound.checked = settings.soundEnabled;

    const shake = document.getElementById('setting-shake') as HTMLInputElement;
    if (shake) shake.checked = settings.cameraShake;

    document.querySelectorAll('.setting-quality-btn').forEach((btn) => {
      const q = btn.getAttribute('data-quality');
      if (q === settings.graphicsQuality) {
        btn.classList.add('bg-[#2b2723]', 'text-[#fdfbf7]');
      } else {
        btn.classList.remove('bg-[#2b2723]', 'text-[#fdfbf7]');
      }
      btn.addEventListener('click', () => {
        document.querySelectorAll('.setting-quality-btn').forEach((b) => b.classList.remove('bg-[#2b2723]', 'text-[#fdfbf7]'));
        btn.classList.add('bg-[#2b2723]', 'text-[#fdfbf7]');
        settings.graphicsQuality = q as GameSettings['graphicsQuality'];
        this.saveSystem.save();
        this.callbacks.onSettingsChange();
      });
    });
  }

  public updateState(state: GameMode, gameState: GameState): void {
    this.screenMenu.classList.add('hidden');
    this.screenPause.classList.add('hidden');
    this.screenGameOver.classList.add('hidden');
    this.hud.classList.add('hidden');

    switch (state) {
      case 'MENU':
        this.screenMenu.classList.remove('hidden');
        this.updateProfileDisplay();
        break;
      case 'PLAYING':
        this.hud.classList.remove('hidden');
        break;
      case 'PAUSED':
        this.hud.classList.remove('hidden');
        this.screenPause.classList.remove('hidden');
        break;
      case 'GAME_OVER':
        this.screenGameOver.classList.remove('hidden');
        break;
    }
  }

  public updateScore(score: number, distance: number, speed: number): void {
    if (this.hudScore) this.hudScore.textContent = score.toString();
    if (this.hudDistance) this.hudDistance.innerHTML = `${distance} <span class="text-xs font-normal text-[#726a61]">m</span>`;
    if (this.hudSpeed) this.hudSpeed.innerHTML = `${speed.toFixed(0)} <span class="text-[10px] font-normal text-[#726a61]">u/s</span>`;
  }

  public updateRunGraphite(count: number): void {
    if (this.hudRunGraphite) this.hudRunGraphite.textContent = count.toString();
  }

  public updateStage(chapter: string, name: string): void {
    const el = document.getElementById('hud-stage-name');
    if (el) el.textContent = `${chapter}: ${name}`;
  }

  public updateCombo(combo: number): void {
    if (combo > 1) {
      this.hudComboBadge.classList.remove('hidden');
      this.hudComboText.textContent = `x${combo}`;
    } else {
      this.hudComboBadge.classList.add('hidden');
    }
  }

  public showGameOver(
    score: number,
    distance: number,
    bestDist: number,
    isNewBest: boolean,
    reason: string,
    earnedGraphite = 0,
    earnedLeads = 0,
    earnedXP = 0
  ): void {
    if (this.goScore) this.goScore.textContent = score.toString();
    if (this.goDistance) this.goDistance.textContent = `${Math.floor(distance)} m`;
    if (this.goReason) this.goReason.textContent = reason.toUpperCase();
    if (this.goRewardGraphite) this.goRewardGraphite.textContent = `+${earnedGraphite}`;
    if (this.goRewardLeads) this.goRewardLeads.textContent = `+${earnedLeads}`;
    if (this.goRewardXP) this.goRewardXP.textContent = `+${earnedXP}`;

    if (isNewBest) {
      this.goNewBest.classList.remove('hidden');
      confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
    } else {
      this.goNewBest.classList.add('hidden');
    }
  }

  public showToast(text: string): void {
    if (!this.hudToast) return;
    this.hudToast.textContent = text;
    this.hudToast.classList.remove('opacity-0', '-translate-x-6');
    this.hudToast.classList.add('opacity-100', 'translate-x-0');

    if (this.toastTimeout) window.clearTimeout(this.toastTimeout);
    this.toastTimeout = window.setTimeout(() => {
      this.hudToast.classList.remove('opacity-100', 'translate-x-0');
      this.hudToast.classList.add('opacity-0', '-translate-x-6');
    }, 1800);
  }

  public updateBoost(active: boolean, timer: number, maxDuration: number): void {
    if (active) {
      this.hudBoost.classList.remove('hidden');
      const pct = Math.max(0, Math.min(100, (timer / maxDuration) * 100));
      this.hudBoostBar.style.width = `${pct}%`;
    } else {
      this.hudBoost.classList.add('hidden');
    }
  }

  public updateSoundDisplay(enabled: boolean): void {
    if (this.soundIcon) {
      this.soundIcon.innerHTML = enabled ? ICONS.SOUND_ON : ICONS.SOUND_OFF;
    }
    if (this.soundText) {
      this.soundText.textContent = enabled ? 'SOUND: ON' : 'SOUND: OFF';
    }
  }

  public applyPencilStyle(style: PencilStyleDefinition): void {
    if (!style || !style.uiTheme) return;

    if (document.documentElement?.style?.setProperty) {
      document.documentElement.style.setProperty('--style-accent', style.uiTheme.accentHex);
      document.documentElement.style.setProperty('--style-border', style.uiTheme.borderHex);
      document.documentElement.style.setProperty('--style-glow', style.uiTheme.glowHex);
    }

    const titleEl = document.getElementById('style-title');
    const subtitleEl = document.getElementById('style-subtitle');
    const swatchEl = document.getElementById('style-swatch');
    if (titleEl) titleEl.textContent = style.name;
    if (subtitleEl) subtitleEl.textContent = `${style.artistTitle} • ${style.subtitle}`;
    if (swatchEl) {
      swatchEl.style.backgroundColor = style.uiTheme.accentHex;
      swatchEl.style.boxShadow = `0 0 8px ${style.uiTheme.glowHex}`;
    }

    if (this.hudComboBadge) {
      this.hudComboBadge.style.borderColor = style.uiTheme.borderHex;
      this.hudComboBadge.style.backgroundColor = style.uiTheme.badgeBgHex;
      this.hudComboBadge.style.color = style.uiTheme.badgeTextHex;
    }
  }
}
