/**
 * 水源轮值 — Core Game State & Loop
 * Direction Lock: 排队 -> 装水 -> 选择路线 -> 搬回棚区 -> 分配或藏水 -> 结算信任和存水
 */

// --- Phase enum ---
export const Phase = {
  QUEUE: 'QUEUE',
  FILL: 'FILL',
  ROUTE: 'ROUTE',
  CARRY: 'CARRY',
  DISTRIBUTE: 'DISTRIBUTE',
  SETTLE: 'SETTLE',
  GAME_OVER: 'GAME_OVER',
};

const PHASE_ORDER = [
  Phase.QUEUE,
  Phase.FILL,
  Phase.ROUTE,
  Phase.CARRY,
  Phase.DISTRIBUTE,
  Phase.SETTLE,
];

// --- Route definitions ---
export const ROUTES = {
  main: { name: '大路', spillRate: 0.15, riskMod: 0, timeCost: 2 },
  shortcut: { name: '小路', spillRate: 0.35, riskMod: 0.2, timeCost: 1 },
  night: { name: '夜路', spillRate: 0.25, riskMod: 0.3, timeCost: 1 },
};

// --- Default state factory ---
export function createInitialState() {
  return {
    // Required state per Direction Lock
    resource: { water: 0, stored: 0, personalReserve: 0, bucketCapacity: 10 },
    pressure: { queuePosition: 0, queueSize: 6, timeLeft: 20 },
    risk: { exposure: 0, routeDanger: 0 },
    relation: { trust: 50 },
    round: { current: 1, max: 5 },

    // Internal
    phase: Phase.QUEUE,
    bucketFill: 0,
    chosenRoute: null,
    carrySpillage: 0,
    hidWater: 0,
    distributedWater: 0,
    log: [],
  };
}

// --- Phase logic ---

export function startQueue(state) {
  state.phase = Phase.QUEUE;
  state.pressure.queuePosition = Math.floor(Math.random() * state.pressure.queueSize) + 1;
  pushLog(state, `第 ${state.round.current} 轮 — 你排在第 ${state.pressure.queuePosition} 位`);
  return state;
}

export function advanceQueue(state) {
  if (state.phase !== Phase.QUEUE) return state;
  state.pressure.queuePosition--;
  state.pressure.timeLeft = Math.max(0, state.pressure.timeLeft - 0.5);
  // State coupling: relation pressure — waiting erodes group patience
  state.relation.trust = Math.max(0, state.relation.trust - 0.5);
  if (state.pressure.queuePosition <= 0) {
    state.phase = Phase.FILL;
    pushLog(state, '排到了！开始装水。');
  } else {
    pushLog(state, `等待中... 前面还有 ${state.pressure.queuePosition} 人`);
  }
  return state;
}

export function fillWater(state, amount) {
  if (state.phase !== Phase.FILL) return state;
  const maxFill = state.resource.bucketCapacity - state.bucketFill;
  const fill = Math.min(amount, maxFill);
  state.bucketFill += fill;
  state.pressure.timeLeft = Math.max(0, state.pressure.timeLeft - 0.5);
  // State coupling: risk pressure — drawing water increases exposure
  state.risk.exposure = Math.min(1, state.risk.exposure + 0.02);
  pushLog(state, `装水 ${fill.toFixed(1)} 升，桶里有 ${state.bucketFill.toFixed(1)} 升`);
  return state;
}

export function finishFill(state) {
  if (state.phase !== Phase.FILL) return state;
  state.phase = Phase.ROUTE;
  pushLog(state, `装水完毕，桶里有 ${state.bucketFill.toFixed(1)} 升。选择路线回棚区。`);
  return state;
}

export function chooseRoute(state, routeKey) {
  if (state.phase !== Phase.ROUTE) return state;
  const route = ROUTES[routeKey];
  if (!route) return state;
  state.chosenRoute = routeKey;
  state.phase = Phase.CARRY;
  state.pressure.timeLeft = Math.max(0, state.pressure.timeLeft - route.timeCost);
  pushLog(state, `选择了${route.name}，搬运中...`);
  return state;
}

export function carryBack(state) {
  if (state.phase !== Phase.CARRY) return state;
  const route = ROUTES[state.chosenRoute];
  const spillage = state.bucketFill * route.spillRate;
  state.carrySpillage = spillage;
  state.risk.exposure = Math.min(1, state.risk.exposure + route.riskMod);
  state.bucketFill = Math.max(0, state.bucketFill - spillage);
  state.phase = Phase.DISTRIBUTE;
  pushLog(state, `搬回棚区，洒了 ${spillage.toFixed(1)} 升，剩 ${state.bucketFill.toFixed(1)} 升`);
  return state;
}

export function distributeWater(state, { give, hide }) {
  if (state.phase !== Phase.DISTRIBUTE) return state;
  const total = give + hide;
  if (total > state.bucketFill + 0.01) {
    pushLog(state, '水量不够，重新分配。');
    return state;
  }
  state.distributedWater = give;
  state.hidWater = hide;
  const leftover = state.bucketFill - total;
  state.resource.water = Math.max(0, leftover);
  // Hiding water risks trust loss if detected
  if (hide > 0) {
    const detected = Math.random() < state.risk.exposure;
    if (detected) {
      state.relation.trust = Math.max(0, state.relation.trust - hide * 5);
      pushLog(state, `藏水被发现！信任降至 ${state.relation.trust.toFixed(0)}`);
    } else {
      pushLog(state, `藏了 ${hide.toFixed(1)}L，暂时没被发现。`);
    }
  }
  state.phase = Phase.SETTLE;
  return state;
}

export function settleRound(state) {
  if (state.phase !== Phase.SETTLE) return state;

  // Add distributed water to stored
  state.resource.stored += state.distributedWater;
  // Accumulate hidden water to personal reserve
  state.resource.personalReserve += state.hidWater;

  pushLog(state, `结算：分配 ${state.distributedWater.toFixed(1)}L → 棚区，私藏 ${state.hidWater.toFixed(1)}L`);

  // Trust recovery from giving
  state.relation.trust = Math.min(100, state.relation.trust + state.distributedWater * 2);

  // Exposure decays between rounds — not everything carries over
  state.risk.exposure = Math.max(0, state.risk.exposure * 0.6);

  // Check end conditions
  const gameOver = checkGameOver(state);
  if (gameOver) {
    state.phase = Phase.GAME_OVER;
    pushLog(state, `游戏结束: ${gameOver}`);
    pushLog(state, `最终 — 存水 ${state.resource.stored.toFixed(1)}L，私藏 ${state.resource.personalReserve.toFixed(1)}L，信任 ${state.relation.trust.toFixed(0)}`);
    return state;
  }

  // Advance round
  state.round.current++;
  if (state.round.current > state.round.max) {
    state.phase = Phase.GAME_OVER;
    const outcome = getOutcome(state);
    pushLog(state, `所有轮次结束 — ${outcome.label}`);
    pushLog(state, `最终 — 存水 ${state.resource.stored.toFixed(1)}L，私藏 ${state.resource.personalReserve.toFixed(1)}L，信任 ${state.relation.trust.toFixed(0)}`);
    return state;
  }

  // Reset per-round state
  state.bucketFill = 0;
  state.chosenRoute = null;
  state.carrySpillage = 0;
  state.hidWater = 0;
  state.distributedWater = 0;

  pushLog(state, `--- 第 ${state.round.current} 轮开始 ---`);
  startQueue(state);
  return state;
}

// --- Helpers ---

function checkGameOver(state) {
  if (state.pressure.timeLeft <= 0) return '水源关闭，时间耗尽';
  if (state.relation.trust <= 0) return '信任崩塌，被赶出队伍';
  return null;
}

export function getOutcome(state) {
  if (state.pressure.timeLeft <= 0) return { type: 'timeout', label: '水源关闭' };
  if (state.relation.trust <= 0) return { type: 'expelled', label: '被赶出队伍' };
  const total = state.resource.stored + state.resource.personalReserve;
  if (state.round.current > state.round.max) {
    if (total >= 20 && state.relation.trust >= 40) return { type: 'survive', label: '挺过轮值' };
    if (total >= 10) return { type: 'scrape', label: '勉强撑过' };
    return { type: 'deplete', label: '水量不足' };
  }
  return { type: 'end', label: '结算' };
}

function pushLog(state, msg) {
  state.log.push({ round: state.round.current, phase: state.phase, msg });
}

// --- Tick: auto-advance carry phase ---
export function tick(state) {
  if (state.phase === Phase.CARRY) {
    carryBack(state);
  }
}
