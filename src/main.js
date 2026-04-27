/**
 * 水源轮值 — Entry Point & Minimal UI
 * Connects DOM to core loop phases.
 */
import {
  Phase, ROUTES,
  createInitialState, startQueue, advanceQueue,
  fillWater, finishFill, chooseRoute,
  carryBack, distributeWater, settleRound, tick,
} from './game.js';

let state;

// --- DOM refs ---
const $ = (sel) => document.querySelector(sel);
const $status = () => $('#status');
const $actions = () => $('#actions');
const $log = () => $('#log');

// --- Render helpers ---

function render() {
  renderStatus();
  renderActions();
  renderLog();
}

function renderStatus() {
  const s = state;
  const phaseLabel = {
    [Phase.QUEUE]: `排队中 (位置 ${s.pressure.queuePosition})`,
    [Phase.FILL]: `装水中 (桶: ${s.bucketFill.toFixed(1)}/${s.resource.bucketCapacity})`,
    [Phase.ROUTE]: '选择路线',
    [Phase.CARRY]: '搬运中...',
    [Phase.DISTRIBUTE]: '分配或藏水',
    [Phase.SETTLE]: '结算中',
    [Phase.GAME_OVER]: '游戏结束',
  }[s.phase] || s.phase;

  $status().innerHTML = `
    <div><strong>第 ${s.round.current}/${s.round.max} 轮</strong> — ${phaseLabel}</div>
    <div>存水: ${s.resource.stored.toFixed(1)} | 信任: ${s.relation.trust.toFixed(0)} | 剩余时间: ${s.pressure.timeLeft.toFixed(1)}</div>
    <div>风险暴露: ${(s.risk.exposure * 100).toFixed(0)}%</div>
  `;
}

function renderActions() {
  const el = $actions();
  el.innerHTML = '';
  const actions = getPhaseActions();
  for (const a of actions) {
    const btn = document.createElement('button');
    btn.textContent = a.label;
    btn.onclick = a.fn;
    el.appendChild(btn);
    el.appendChild(document.createTextNode(' '));
  }
}

function renderLog() {
  const entries = state.log.slice(-8);
  $log().innerHTML = entries
    .map((e) => `<div class="log-entry">[${e.phase}] ${e.msg}</div>`)
    .join('');
}

// --- Phase action generators ---

function getPhaseActions() {
  switch (state.phase) {
    case Phase.QUEUE:
      return [{ label: '等待前进', fn: actionAdvanceQueue }];
    case Phase.FILL:
      return [
        { label: '装满', fn: actionFillMax },
        { label: '装一半', fn: actionFillHalf },
        { label: '装完了', fn: actionFinishFill },
      ];
    case Phase.ROUTE:
      return Object.entries(ROUTES).map(([key, r]) => ({
        label: `${r.name} (洒${(r.spillRate * 100).toFixed(0)}%)`,
        fn: () => actionChooseRoute(key),
      }));
    case Phase.CARRY:
      return [{ label: '继续走', fn: actionCarry }];
    case Phase.DISTRIBUTE:
      return [
        { label: '全部分配', fn: actionGiveAll },
        { label: '分配一半，藏一半', fn: actionGiveHalfHideHalf },
        { label: '全部藏起来', fn: actionHideAll },
      ];
    case Phase.SETTLE:
      return [{ label: '下一轮', fn: actionSettle }];
    case Phase.GAME_OVER:
      return [{ label: '重新开始', fn: initGame }];
    default:
      return [];
  }
}

// --- Action handlers ---

function actionAdvanceQueue() {
  advanceQueue(state);
  tick(state);
  render();
}

function actionFillMax() {
  fillWater(state, state.resource.bucketCapacity);
  render();
}

function actionFillHalf() {
  fillWater(state, Math.ceil(state.resource.bucketCapacity / 2));
  render();
}

function actionFinishFill() {
  finishFill(state);
  render();
}

function actionChooseRoute(key) {
  chooseRoute(state, key);
  tick(state);
  render();
}

function actionCarry() {
  carryBack(state);
  render();
}

function actionGiveAll() {
  distributeWater(state, { give: state.bucketFill, hide: 0 });
  render();
}

function actionGiveHalfHideHalf() {
  const half = state.bucketFill / 2;
  distributeWater(state, { give: half, hide: half });
  render();
}

function actionHideAll() {
  distributeWater(state, { give: 0, hide: state.bucketFill });
  render();
}

function actionSettle() {
  settleRound(state);
  render();
}

// --- Init ---

function initGame() {
  state = createInitialState();
  startQueue(state);
  render();
}

// Boot
document.addEventListener('DOMContentLoaded', initGame);
