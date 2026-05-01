/**
 * 水源轮值 — Entry Point & Scene Controller
 * Connects canvas scene to core game loop.
 */
import { Scene } from './ui/scene.js';
import {
  Phase, ROUTES,
  createInitialState, startQueue, advanceQueue,
  fillWater, finishFill, chooseRoute,
  carryBack, distributeWater, settleRound, tick,
  getOutcome,
} from './game.js';

let state, scene;
let pendingGive = 0, pendingHide = 0;

// --- DOM setup ---

function setupDOM() {
  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    body { font-family: sans-serif; max-width: 660px; margin: 1rem auto; padding: 0 0.5rem; background: #1a1a2e; color: #e0e0e0; }
    h1 { color: #4fc3f7; font-size: 1.2rem; margin: 0 0 0.5rem; }
    #scene { width: 100%; max-width: 640px; border-radius: 6px; display: block; background: #3e2723; }
    #log { background: #0a0a1a; padding: 0.6rem; border-radius: 6px; margin-top: 0.5rem; min-height: 80px; font-size: 0.8rem; line-height: 1.5; max-height: 120px; overflow-y: auto; }
    .log-entry { border-bottom: 1px solid #222; padding: 1px 0; }
  `;
  document.head.appendChild(style);

  // Hide old elements
  const oldStatus = document.getElementById('status');
  const oldActions = document.getElementById('actions');
  if (oldStatus) oldStatus.style.display = 'none';
  if (oldActions) oldActions.style.display = 'none';

  // Insert canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'scene';
  const h1 = document.querySelector('h1');
  h1.after(canvas);
}

// --- Action dispatcher ---

function handleAction(action, data) {
  switch (action) {
    case 'advanceQueue':
      advanceQueue(state);
      tick(state);
      break;
    case 'fillWater':
      fillWater(state, 2);
      break;
    case 'finishFill':
      finishFill(state);
      break;
    case 'chooseRoute':
      chooseRoute(state, data);
      // Don't tick — let carry animation play
      break;
    case 'arriveCamp':
      carryBack(state);
      pendingGive = 0;
      pendingHide = 0;
      break;
    case 'pourWater':
      if (pendingGive + pendingHide < state.bucketFill) {
        pendingGive = Math.min(state.bucketFill - pendingHide, pendingGive + 1);
      }
      break;
    case 'hideWater':
      if (pendingGive + pendingHide < state.bucketFill) {
        pendingHide = Math.min(state.bucketFill - pendingGive, pendingHide + 1);
      }
      break;
    case 'resetDistribute':
      pendingGive = 0;
      pendingHide = 0;
      break;
    case 'confirmDistribute':
      distributeWater(state, { give: pendingGive, hide: pendingHide });
      break;
    case 'nextRound':
      settleRound(state);
      pendingGive = 0;
      pendingHide = 0;
      break;
    case 'restart':
      initGame();
      return;
  }
  render();
}

// --- Render ---

function render() {
  scene.update(state, { pendingGive, pendingHide });
  renderLog();
}

function renderLog() {
  const el = document.getElementById('log');
  if (!el) return;
  const entries = state.log.slice(-8);
  el.innerHTML = entries
    .map(e => `<div class="log-entry"><span style="color:#666">[${e.round}]</span> ${e.msg}</div>`)
    .join('');
  el.scrollTop = el.scrollHeight;
}

// --- Init ---

function initGame() {
  state = createInitialState();
  pendingGive = 0;
  pendingHide = 0;
  startQueue(state);
  render();
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  setupDOM();
  scene = new Scene('scene', handleAction);
  initGame();
});
