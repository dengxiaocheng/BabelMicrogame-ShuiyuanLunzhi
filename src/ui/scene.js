/**
 * 水源轮值 — Canvas Scene Renderer
 * Visual scene objects for each game phase.
 * Primary input mapped to scene object manipulation.
 */

const ROUTE_Y = { main: 170, shortcut: 250, night: 330 };
const ROUTE_COLORS = { main: '#66bb6a', shortcut: '#fdd835', night: '#ab47bc' };
const ROUTE_LABELS = { main: '大路', shortcut: '小路', night: '夜路' };
const ROUTE_SPILL = { main: '15%', shortcut: '35%', night: '25%' };
const ROUTE_TIME = { main: 2, shortcut: 1, night: 1 };

const WELL_X = 60, WELL_Y = 250, CAMP_X = 580;

export class Scene {
  constructor(canvasId, onAction) {
    this.el = document.getElementById(canvasId);
    this.ctx = this.el.getContext('2d');
    this.onAction = onAction;
    this.state = null;
    this.phase = null;
    this.zones = [];
    this.hovered = null;
    this.carryT = 0;
    this.drops = [];
    this.animId = null;
    this.uiState = {};

    this.W = 640;
    this.H = 400;
    this.el.width = this.W;
    this.el.height = this.H;

    this.el.addEventListener('click', e => this._click(e));
    this.el.addEventListener('mousemove', e => this._move(e));
  }

  // --- Input ---

  _pos(e) {
    const r = this.el.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (this.W / r.width), y: (e.clientY - r.top) * (this.H / r.height) };
  }

  _click(e) {
    const p = this._pos(e);
    for (const z of this.zones) {
      if (z.hit(p.x, p.y)) { this.onAction(z.action, z.data); return; }
    }
  }

  _move(e) {
    const p = this._pos(e);
    this.hovered = null;
    for (const z of this.zones) {
      if (z.hit(p.x, p.y)) { this.hovered = z; break; }
    }
    this.el.style.cursor = this.hovered ? 'pointer' : 'default';
  }

  // --- Lifecycle ---

  update(state, uiState = {}) {
    const changed = state.phase !== this.phase;
    this.state = state;
    this.phase = state.phase;
    this.uiState = uiState;
    if (changed) this._enterPhase();
    this._draw();
  }

  _enterPhase() {
    this.zones = [];
    this.carryT = 0;
    this.drops = [];
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
    if (this.phase === 'CARRY') this._animateCarry();
  }

  // --- Main draw ---

  _draw() {
    const c = this.ctx;
    c.clearRect(0, 0, this.W, this.H);
    c.fillStyle = '#3e2723';
    c.fillRect(0, 0, this.W, this.H);
    const sky = c.createLinearGradient(0, 34, 0, 80);
    sky.addColorStop(0, '#1a237e');
    sky.addColorStop(1, 'rgba(62,39,35,0)');
    c.fillStyle = sky;
    c.fillRect(0, 34, this.W, 46);
    this._drawHUD();
    this._drawEventBanner();
    const fn = { QUEUE: '_drawQueue', FILL: '_drawFill', ROUTE: '_drawRoute', CARRY: '_drawCarry', DISTRIBUTE: '_drawDistribute', SETTLE: '_drawSettle', GAME_OVER: '_drawGameOver' }[this.phase];
    if (fn) this[fn]();
  }

  // --- HUD (always drawn) ---

  _drawHUD() {
    const c = this.ctx, s = this.state;
    c.fillStyle = 'rgba(0,0,0,0.75)';
    c.fillRect(0, 0, this.W, 32);

    c.fillStyle = '#e0e0e0'; c.font = 'bold 12px sans-serif'; c.textAlign = 'left';
    c.fillText(`第 ${s.round.current}/${s.round.max} 轮`, 8, 20);

    // Trust
    c.fillStyle = '#888'; c.font = '10px sans-serif';
    c.fillText(`信任`, 120, 12);
    c.fillStyle = '#444'; c.fillRect(120, 16, 70, 8);
    const tw = s.relation.trust / 100 * 70;
    c.fillStyle = tw > 17 ? '#4fc3f7' : '#ef5350';
    c.fillRect(120, 16, tw, 8);
    c.fillStyle = '#ccc'; c.font = '10px sans-serif';
    c.fillText(s.relation.trust.toFixed(0), 196, 24);

    // Stored water
    c.fillText(`存水 ${s.resource.stored.toFixed(1)}L`, 240, 20);

    // Personal reserve
    if (s.resource.personalReserve > 0) {
      c.fillStyle = '#ab47bc';
      c.fillText(`私藏 ${s.resource.personalReserve.toFixed(1)}L`, 320, 20);
    }

    // Time
    c.fillStyle = '#888'; c.fillText('时间', 380, 12);
    c.fillStyle = '#444'; c.fillRect(380, 16, 70, 8);
    const tl = s.pressure.timeLeft / 20 * 70;
    c.fillStyle = tl > 17 ? '#66bb6a' : '#ef5350';
    c.fillRect(380, 16, tl, 8);
    c.fillStyle = '#ccc'; c.fillText(s.pressure.timeLeft.toFixed(1), 456, 24);

    // Risk
    c.textAlign = 'right';
    c.fillText(`暴露 ${(s.risk.exposure * 100).toFixed(0)}%`, 632, 20);
    c.textAlign = 'left';
  }

  // --- Phase: QUEUE ---

  _drawQueue() {
    const c = this.ctx, s = this.state, pos = s.pressure.queuePosition, sz = s.pressure.queueSize;
    this.zones = [];

    c.fillStyle = '#ffcc80'; c.font = 'bold 16px sans-serif'; c.textAlign = 'center';
    c.fillText('排队取水 — 等待轮到你', this.W / 2, 64);

    // Well on right
    c.beginPath(); c.arc(560, WELL_Y, 32, 0, Math.PI * 2);
    c.fillStyle = '#78909c'; c.fill();
    c.strokeStyle = '#b0bec5'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#fff'; c.font = '11px sans-serif'; c.fillText('井口', 560, WELL_Y + 4);

    // Queue dots
    for (let i = 0; i < sz; i++) {
      const x = 80 + i * 70, y = WELL_Y;
      const isPlayer = (i + 1) === pos;
      c.beginPath(); c.arc(x, y, isPlayer ? 18 : 13, 0, Math.PI * 2);
      c.fillStyle = isPlayer ? '#4fc3f7' : '#795548'; c.fill();
      if (isPlayer) {
        c.strokeStyle = '#81d4fa'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#fff'; c.font = 'bold 11px sans-serif'; c.fillText('你', x, y + 4);
        const cx = x, cy = y;
        this.zones.push({ hit: (px, py) => (px - cx) ** 2 + (py - cy) ** 2 < 400, action: 'advanceQueue', data: null });
      } else {
        c.fillStyle = '#d7ccc8'; c.font = '10px sans-serif'; c.fillText(`${i + 1}`, x, y + 3);
      }
    }

    c.fillStyle = '#a1887f'; c.font = '12px sans-serif'; c.textAlign = 'center';
    c.fillText('点击你的位置等待前进（前方每少一人，时间 −0.5）', this.W / 2, 360);
  }

  // --- Phase: FILL ---

  _drawFill() {
    const c = this.ctx, s = this.state, fill = s.bucketFill, cap = s.resource.bucketCapacity;
    this.zones = [];

    c.fillStyle = '#81d4fa'; c.font = 'bold 16px sans-serif'; c.textAlign = 'center';
    c.fillText('装水 — 点击水龙头加水', this.W / 2, 64);

    // Tap pipe
    c.fillStyle = '#78909c'; c.fillRect(400, 75, 8, 55);
    c.fillRect(375, 75, 33, 8);
    // Water stream
    c.fillStyle = '#4fc3f7'; c.fillRect(402, 83, 4, 35);
    // Tap zone
    const tapHover = this.hovered && this.hovered.action === 'fillWater';
    if (tapHover) { c.fillStyle = 'rgba(79,195,247,0.2)'; c.fillRect(365, 70, 50, 65); }
    this.zones.push({ hit: (px, py) => px > 365 && px < 415 && py > 70 && py < 140, action: 'fillWater', data: null });

    // Bucket
    const bx = 260, by = 135, bw = 80, bh = 140;
    c.fillStyle = '#5d4037'; c.fillRect(bx, by, bw, bh);
    c.strokeStyle = '#8d6e63'; c.lineWidth = 3; c.strokeRect(bx, by, bw, bh);
    // Handle
    c.beginPath(); c.arc(bx + bw / 2, by - 8, 28, Math.PI, 0);
    c.strokeStyle = '#8d6e63'; c.lineWidth = 2; c.stroke();
    // Water level
    const wh = (fill / cap) * (bh - 6);
    if (wh > 0) {
      c.fillStyle = '#29b6f6'; c.fillRect(bx + 3, by + bh - 3 - wh, bw - 6, wh);
      c.fillStyle = '#4fc3f7'; c.fillRect(bx + 3, by + bh - 3 - wh, bw - 6, 3);
    }
    // Label
    c.fillStyle = '#fff'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center';
    c.fillText(`${fill.toFixed(1)} / ${cap}L`, bx + bw / 2, by + bh + 25);

    // Done button
    const dx = 430, dy = 290, dw = 110, dh = 38;
    const doneHover = this.hovered && this.hovered.action === 'finishFill';
    c.fillStyle = doneHover ? '#388e3c' : '#2e7d32'; c.fillRect(dx, dy, dw, dh);
    c.fillStyle = '#fff'; c.font = 'bold 13px sans-serif';
    c.fillText('装完了', dx + dw / 2, dy + 24);
    this.zones.push({ hit: (px, py) => px > dx && px < dx + dw && py > dy && py < dy + dh, action: 'finishFill', data: null });

    c.fillStyle = '#a1887f'; c.font = '11px sans-serif';
    c.fillText('每次 +2L，时间 −0.5', this.W / 2, 375);
  }

  // --- Phase: ROUTE ---

  _drawRoute() {
    const c = this.ctx, s = this.state;
    this.zones = [];

    c.fillStyle = '#ffcc80'; c.font = 'bold 16px sans-serif'; c.textAlign = 'center';
    c.fillText('选择路线回棚区', this.W / 2, 64);

    // Well & camp markers
    c.beginPath(); c.arc(WELL_X, WELL_Y, 22, 0, Math.PI * 2);
    c.fillStyle = '#78909c'; c.fill();
    c.fillStyle = '#fff'; c.font = '10px sans-serif'; c.fillText('井', WELL_X, WELL_Y + 4);

    c.fillStyle = '#6d4c41'; c.fillRect(CAMP_X - 20, WELL_Y - 18, 40, 36);
    c.fillStyle = '#fff'; c.font = '10px sans-serif'; c.fillText('棚区', CAMP_X, WELL_Y + 4);

    // Routes
    for (const key of ['main', 'shortcut', 'night']) {
      const ry = ROUTE_Y[key], col = ROUTE_COLORS[key], label = ROUTE_LABELS[key];
      const isHov = this.hovered && this.hovered.data === key;

      c.beginPath();
      c.moveTo(WELL_X + 22, WELL_Y);
      c.quadraticCurveTo(320, ry, CAMP_X - 20, WELL_Y);
      c.strokeStyle = col; c.lineWidth = isHov ? 8 : 4; c.globalAlpha = isHov ? 1 : 0.5;
      c.stroke(); c.globalAlpha = 1;

      // Label on path
      c.fillStyle = isHov ? '#fff' : col;
      c.font = `bold ${isHov ? 14 : 12}px sans-serif`;
      c.fillText(`${label}  洒漏 ${ROUTE_SPILL[key]}  耗时 ${ROUTE_TIME[key]}`, 320, ry - 10);

      const ryCap = ry;
      this.zones.push({ hit: (px, py) => py > ryCap - 22 && py < ryCap + 8 && px > WELL_X + 22 && px < CAMP_X - 20, action: 'chooseRoute', data: key });
    }

    c.fillStyle = '#a1887f'; c.font = '11px sans-serif'; c.textAlign = 'center';
    c.fillText('点击路线选择（洒漏越多、耗时越短 vs 越安全）', this.W / 2, 380);
  }

  // --- Phase: CARRY (animated) ---

  _bezier(t, p0, p1, p2) {
    return (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2;
  }

  _carryPos(t) {
    const ry = ROUTE_Y[this.state.chosenRoute] || 250;
    return {
      x: this._bezier(t, WELL_X + 22, 320, CAMP_X - 20),
      y: this._bezier(t, WELL_Y, ry, WELL_Y),
    };
  }

  _animateCarry() {
    const step = () => {
      this.carryT += 0.015;
      if (this.carryT >= 1) {
        this.carryT = 1;
        this._draw();
        this.onAction('arriveCamp', null);
        return;
      }
      // Spawn spillage drop
      if (Math.random() < 0.35) {
        const p = this._carryPos(this.carryT);
        this.drops.push({ x: p.x + (Math.random() - 0.5) * 10, y: p.y, life: 1 });
      }
      this.drops = this.drops.filter(d => { d.life -= 0.015; d.y += 0.4; return d.life > 0; });
      this._draw();
      this.animId = requestAnimationFrame(step);
    };
    this.animId = requestAnimationFrame(step);
  }

  _drawCarry() {
    const c = this.ctx, s = this.state, t = this.carryT;
    const key = s.chosenRoute || 'main', ry = ROUTE_Y[key], col = ROUTE_COLORS[key];

    // Route path
    c.beginPath();
    c.moveTo(WELL_X + 22, WELL_Y);
    c.quadraticCurveTo(320, ry, CAMP_X - 20, WELL_Y);
    c.strokeStyle = col; c.lineWidth = 4; c.globalAlpha = 0.4; c.stroke(); c.globalAlpha = 1;

    // Spillage drops
    for (const d of this.drops) {
      c.beginPath(); c.arc(d.x, d.y, 3, 0, Math.PI * 2);
      c.fillStyle = `rgba(41,182,246,${d.life})`; c.fill();
    }

    // Player
    const pos = this._carryPos(t);
    // Shadow
    c.beginPath(); c.ellipse(pos.x, pos.y + 20, 12, 4, 0, 0, Math.PI * 2);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fill();
    // Body
    c.beginPath(); c.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
    c.fillStyle = '#4fc3f7'; c.fill();
    // Mini bucket
    c.fillStyle = '#5d4037'; c.fillRect(pos.x + 12, pos.y - 8, 10, 12);

    // Progress
    c.fillStyle = '#ffcc80'; c.font = '13px sans-serif'; c.textAlign = 'center';
    c.fillText(`搬运中... ${Math.floor(t * 100)}%`, this.W / 2, 64);
  }

  // --- Phase: DISTRIBUTE ---

  _drawDistribute() {
    const c = this.ctx, s = this.state;
    const bucketLeft = s.bucketFill;
    const pg = this.uiState.pendingGive || 0;
    const ph = this.uiState.pendingHide || 0;
    const remaining = bucketLeft - pg - ph;
    this.zones = [];

    c.fillStyle = '#ffcc80'; c.font = 'bold 16px sans-serif'; c.textAlign = 'center';
    c.fillText('分配或藏水', this.W / 2, 60);

    // Bucket (center top)
    const bx = 280, by = 80, bw = 80, bh = 100;
    c.fillStyle = '#5d4037'; c.fillRect(bx, by, bw, bh);
    c.strokeStyle = '#8d6e63'; c.lineWidth = 2; c.strokeRect(bx, by, bw, bh);
    const rwh = Math.max(0, remaining / s.resource.bucketCapacity * (bh - 6));
    if (rwh > 0) {
      c.fillStyle = '#29b6f6'; c.fillRect(bx + 3, by + bh - 3 - rwh, bw - 6, rwh);
    }
    c.fillStyle = '#fff'; c.font = '12px sans-serif';
    c.fillText(`桶剩 ${remaining.toFixed(1)}L`, bx + bw / 2, by + bh + 18);

    // Camp tank (left)
    const tx = 80, ty = 210, tw = 120, th = 80;
    const tHov = this.hovered && this.hovered.action === 'pourWater';
    c.fillStyle = tHov ? '#4e342e' : '#3e2723'; c.fillRect(tx, ty, tw, th);
    c.strokeStyle = '#8d6e63'; c.lineWidth = 2; c.strokeRect(tx, ty, tw, th);
    // Water level in tank
    const tankLevel = (s.resource.stored + pg) / 30 * (th - 6);
    if (tankLevel > 0) {
      c.fillStyle = '#1565c0'; c.fillRect(tx + 3, ty + th - 3 - tankLevel, tw - 6, tankLevel);
    }
    c.fillStyle = '#66bb6a'; c.font = 'bold 13px sans-serif';
    c.fillText('棚区水罐', tx + tw / 2, ty - 8);
    c.fillStyle = '#fff'; c.font = '11px sans-serif';
    c.fillText(`+${pg.toFixed(1)}L`, tx + tw / 2, ty + th / 2 + 4);
    this.zones.push({ hit: (px, py) => px > tx && px < tx + tw && py > ty && py < ty + th, action: 'pourWater', data: null });

    // Shadow area (right)
    const sx = 440, sy = 210, sw = 120, sh = 80;
    const sHov = this.hovered && this.hovered.action === 'hideWater';
    c.fillStyle = sHov ? '#1a1a2e' : '#121212'; c.fillRect(sx, sy, sw, sh);
    c.strokeStyle = '#424242'; c.lineWidth = 2; c.strokeRect(sx, sy, sw, sh);
    c.fillStyle = '#ab47bc'; c.font = 'bold 13px sans-serif';
    c.fillText('暗处藏水', sx + sw / 2, sy - 8);
    c.fillStyle = '#bbb'; c.font = '11px sans-serif';
    c.fillText(`${ph.toFixed(1)}L`, sx + sw / 2, sy + sh / 2 + 4);
    this.zones.push({ hit: (px, py) => px > sx && px < sx + sw && py > sy && py < sy + sh, action: 'hideWater', data: null });

    // Arrows
    if (pg > 0) { c.fillStyle = '#66bb6a'; c.font = '20px sans-serif'; c.fillText('◀', bx - 10, ty + th / 2); }
    if (ph > 0) { c.fillStyle = '#ab47bc'; c.font = '20px sans-serif'; c.fillText('▶', bx + bw + 15, sy + sh / 2); }

    // Buttons row
    this._drawBtn(200, 330, 90, 32, '重置', 'resetDistribute', '#546e7a');
    this._drawBtn(350, 330, 90, 32, '确认分配', 'confirmDistribute', '#2e7d32');

    c.fillStyle = '#a1887f'; c.font = '11px sans-serif'; c.textAlign = 'center';
    c.fillText(`点击水罐倒水 +1L，点击暗处藏水 +1L | 暴露度 ${(s.risk.exposure * 100).toFixed(0)}%（越高越易被发现）`, this.W / 2, 385);
  }

  // --- Phase: SETTLE ---

  _drawSettle() {
    const c = this.ctx, s = this.state;
    this.zones = [];

    c.fillStyle = '#ffcc80'; c.font = 'bold 16px sans-serif'; c.textAlign = 'center';
    c.fillText(`第 ${s.round.current} 轮结算`, this.W / 2, 80);

    // Stats
    const projStored = s.resource.stored + s.distributedWater;
    const projReserve = s.resource.personalReserve + s.hidWater;
    const stats = [
      { label: '分配出去', value: `${s.distributedWater.toFixed(1)}L`, color: '#66bb6a' },
      { label: '藏水', value: `${s.hidWater.toFixed(1)}L`, color: '#ab47bc' },
      { label: '洒漏', value: `${s.carrySpillage.toFixed(1)}L`, color: '#ef5350' },
      { label: '信任', value: `${s.relation.trust.toFixed(0)}`, color: '#4fc3f7' },
      { label: '存水', value: `${projStored.toFixed(1)}L`, color: '#29b6f6' },
      { label: '私藏', value: `${projReserve.toFixed(1)}L`, color: '#ce93d8' },
    ];
    stats.forEach((st, i) => {
      const y = 120 + i * 36;
      c.fillStyle = '#bbb'; c.font = '13px sans-serif'; c.textAlign = 'right';
      c.fillText(st.label, 280, y);
      c.fillStyle = st.color; c.font = 'bold 14px sans-serif'; c.textAlign = 'left';
      c.fillText(st.value, 300, y);
    });

    this._drawBtn(275, 320, 90, 36, '下一轮', 'nextRound', '#2e7d32');
  }

  // --- Phase: GAME_OVER ---

  _drawGameOver() {
    const c = this.ctx, s = this.state;
    this.zones = [];

    // Determine outcome
    let outcomeLabel = '结算';
    let outcomeColor = '#ffcc80';
    for (let i = s.log.length - 1; i >= 0; i--) {
      const m = s.log[i].msg;
      if (m.includes('挺过')) { outcomeLabel = '挺过轮值'; outcomeColor = '#66bb6a'; break; }
      if (m.includes('勉强')) { outcomeLabel = '勉强撑过'; outcomeColor = '#fdd835'; break; }
      if (m.includes('水量不足')) { outcomeLabel = '水量不足'; outcomeColor = '#ef5350'; break; }
      if (m.includes('水源关闭')) { outcomeLabel = '水源关闭'; outcomeColor = '#ef5350'; break; }
      if (m.includes('赶出')) { outcomeLabel = '被赶出队伍'; outcomeColor = '#ef5350'; break; }
    }

    c.fillStyle = outcomeColor; c.font = 'bold 22px sans-serif'; c.textAlign = 'center';
    c.fillText(outcomeLabel, this.W / 2, 100);

    c.fillStyle = '#ef5350'; c.font = 'bold 16px sans-serif'; c.textAlign = 'center';
    c.fillText('游戏结束', this.W / 2, 130);

    // Final stats
    const stats = [
      { label: '棚区存水', value: `${s.resource.stored.toFixed(1)}L`, color: '#29b6f6' },
      { label: '私藏水量', value: `${s.resource.personalReserve.toFixed(1)}L`, color: '#ce93d8' },
      { label: '信任', value: `${s.relation.trust.toFixed(0)}`, color: '#4fc3f7' },
      { label: '暴露度', value: `${(s.risk.exposure * 100).toFixed(0)}%`, color: '#ef5350' },
    ];
    stats.forEach((st, i) => {
      const y = 170 + i * 30;
      c.fillStyle = '#bbb'; c.font = '13px sans-serif'; c.textAlign = 'right';
      c.fillText(st.label, 300, y);
      c.fillStyle = st.color; c.font = 'bold 14px sans-serif'; c.textAlign = 'left';
      c.fillText(st.value, 320, y);
    });

    c.fillStyle = '#888'; c.font = '12px sans-serif'; c.textAlign = 'center';
    c.fillText(`存活 ${Math.min(s.round.current, s.round.max)} / ${s.round.max} 轮`, this.W / 2, 300);

    this._drawBtn(275, 330, 90, 36, '重新开始', 'restart', '#1565c0');
  }

  // --- Event banner ---

  _drawEventBanner() {
    const s = this.state;
    if (!s.activeEvent) return;
    const c = this.ctx, evt = s.activeEvent;
    const colors = {
      water_level: '#29b6f6',
      spill_trail: '#ef5350',
      queue_unrest: '#ff9800',
      trust_shift: '#ab47bc',
    };
    const accent = colors[evt.feedback?.channel] || '#ffcc80';
    // Dark banner at bottom
    c.fillStyle = 'rgba(0,0,0,0.82)';
    c.fillRect(0, this.H - 24, this.W, 24);
    // Accent line
    c.fillStyle = accent;
    c.fillRect(0, this.H - 24, this.W, 2);
    // Text
    c.fillStyle = accent;
    c.font = '11px sans-serif';
    c.textAlign = 'center';
    const text = evt.text.length > 52 ? evt.text.slice(0, 49) + '...' : evt.text;
    c.fillText(text, this.W / 2, this.H - 7);
    c.textAlign = 'left';
  }

  // --- Shared ---

  _drawBtn(x, y, w, h, text, action, color) {
    const c = this.ctx;
    const hov = this.hovered && this.hovered.action === action;
    c.fillStyle = hov ? this._lighten(color) : color;
    c.fillRect(x, y, w, h);
    c.fillStyle = '#fff'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center';
    c.fillText(text, x + w / 2, y + h / 2 + 5);
    this.zones.push({ hit: (px, py) => px > x && px < x + w && py > y && py < y + h, action, data: null });
  }

  _lighten(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (n >> 16) + 30);
    const g = Math.min(255, ((n >> 8) & 0xff) + 30);
    const b = Math.min(255, (n & 0xff) + 30);
    return `rgb(${r},${g},${b})`;
  }
}
