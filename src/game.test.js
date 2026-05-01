/**
 * 水源轮值 — Core loop tests
 * Validates Direction Lock phases: QUEUE → FILL → ROUTE → CARRY → DISTRIBUTE → SETTLE
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Phase, ROUTES,
  createInitialState, startQueue, advanceQueue,
  fillWater, finishFill, chooseRoute,
  carryBack, distributeWater, settleRound,
} from './game.js';

// --- Helpers ---

function playToFill() {
  const s = createInitialState();
  startQueue(s);
  while (s.phase !== Phase.FILL) advanceQueue(s);
  return s;
}

function playToRoute() {
  const s = playToFill();
  fillWater(s, s.resource.bucketCapacity);
  finishFill(s);
  assert.equal(s.phase, Phase.ROUTE);
  return s;
}

function playToCarry() {
  const s = playToRoute();
  chooseRoute(s, 'main');
  assert.equal(s.phase, Phase.CARRY);
  return s;
}

function playToDistribute() {
  const s = playToCarry();
  carryBack(s);
  assert.equal(s.phase, Phase.DISTRIBUTE);
  return s;
}

function playToSettle() {
  const s = playToDistribute();
  distributeWater(s, { give: s.bucketFill, hide: 0 });
  assert.equal(s.phase, Phase.SETTLE);
  return s;
}

// --- Tests ---

describe('createInitialState', () => {
  it('has all 5 required state keys', () => {
    const s = createInitialState();
    assert.ok(s.resource);
    assert.ok(s.pressure);
    assert.ok(s.risk);
    assert.ok(s.relation);
    assert.ok(s.round);
  });

  it('starts with round 1 of 5', () => {
    const s = createInitialState();
    assert.equal(s.round.current, 1);
    assert.equal(s.round.max, 5);
  });
});

describe('QUEUE phase', () => {
  it('advances until queuePosition reaches 0, then enters FILL', () => {
    const s = createInitialState();
    startQueue(s);
    assert.equal(s.phase, Phase.QUEUE);
    const pos = s.pressure.queuePosition;
    for (let i = 0; i < pos; i++) advanceQueue(s);
    assert.equal(s.phase, Phase.FILL);
  });

  it('no-ops if not in QUEUE phase', () => {
    const s = playToFill();
    const before = { ...s };
    advanceQueue(s);
    assert.equal(s.phase, before.phase);
  });
});

describe('FILL phase', () => {
  it('fills water up to bucket capacity', () => {
    const s = playToFill();
    fillWater(s, 100);
    assert.equal(s.bucketFill, s.resource.bucketCapacity);
  });

  it('finishFill transitions to ROUTE', () => {
    const s = playToFill();
    fillWater(s, 5);
    finishFill(s);
    assert.equal(s.phase, Phase.ROUTE);
  });
});

describe('ROUTE phase', () => {
  it('chooseRoute transitions to CARRY and sets chosenRoute', () => {
    const s = playToRoute();
    chooseRoute(s, 'shortcut');
    assert.equal(s.phase, Phase.CARRY);
    assert.equal(s.chosenRoute, 'shortcut');
  });

  it('invalid route key is no-op', () => {
    const s = playToRoute();
    chooseRoute(s, 'nonexistent');
    assert.equal(s.phase, Phase.ROUTE);
  });
});

describe('CARRY phase', () => {
  it('applies spillage from chosen route', () => {
    const s = playToCarry();
    const beforeFill = s.bucketFill;
    carryBack(s);
    const expectedSpill = beforeFill * ROUTES.main.spillRate;
    assert.equal(s.bucketFill, beforeFill - expectedSpill);
    assert.equal(s.carrySpillage, expectedSpill);
  });

  it('transitions to DISTRIBUTE', () => {
    const s = playToCarry();
    carryBack(s);
    assert.equal(s.phase, Phase.DISTRIBUTE);
  });
});

describe('DISTRIBUTE phase', () => {
  it('giving all water transitions to SETTLE', () => {
    const s = playToDistribute();
    distributeWater(s, { give: s.bucketFill, hide: 0 });
    assert.equal(s.phase, Phase.SETTLE);
    assert.equal(s.distributedWater, s.bucketFill);
  });

  it('cannot distribute more water than bucket holds', () => {
    const s = playToDistribute();
    const fill = s.bucketFill;
    distributeWater(s, { give: fill + 10, hide: 0 });
    assert.equal(s.phase, Phase.DISTRIBUTE, 'should stay in DISTRIBUTE');
  });

  it('hiding water adds stored resource and may reduce trust', () => {
    const s = playToDistribute();
    const trustBefore = s.relation.trust;
    const fill = s.bucketFill;
    // Force detection by setting exposure high
    s.risk.exposure = 1;
    distributeWater(s, { give: 0, hide: fill });
    assert.equal(s.phase, Phase.SETTLE);
    assert.ok(s.relation.trust <= trustBefore, 'trust should not increase when hiding detected');
  });
});

describe('SETTLE phase', () => {
  it('advances to next round and resets per-round state', () => {
    const s = playToSettle();
    settleRound(s);
    assert.equal(s.round.current, 2);
    assert.equal(s.bucketFill, 0);
    assert.equal(s.chosenRoute, null);
    assert.equal(s.phase, Phase.QUEUE, 'should start queue for next round');
  });

  it('game over after max rounds', () => {
    const s = playToSettle();
    s.round.current = s.round.max;
    settleRound(s);
    assert.equal(s.phase, Phase.GAME_OVER);
  });

  it('game over when trust hits 0 with no water given', () => {
    const s = playToDistribute();
    s.relation.trust = 0;
    distributeWater(s, { give: 0, hide: s.bucketFill });
    // Trust stays 0 since give=0 means no recovery, but detection could lower it further
    // Force trust to 0 after distribute
    s.relation.trust = 0;
    settleRound(s);
    assert.equal(s.phase, Phase.GAME_OVER);
  });

  it('game over when time runs out', () => {
    const s = playToSettle();
    s.pressure.timeLeft = 0;
    settleRound(s);
    assert.equal(s.phase, Phase.GAME_OVER);
  });
});

describe('full loop', () => {
  it('completes one full cycle through all 6 phases', () => {
    const s = playToSettle();
    settleRound(s);
    assert.equal(s.round.current, 2);
    assert.equal(s.resource.stored > 0, true, 'should have stored water after giving');
  });
});

// --- State coupling: every effective operation pushes both pressure categories ---

describe('state coupling', () => {
  it('advanceQueue erodes trust (relation pressure) while consuming time (resource pressure)', () => {
    const s = createInitialState();
    startQueue(s);
    const trustBefore = s.relation.trust;
    const timeBefore = s.pressure.timeLeft;
    advanceQueue(s);
    assert.ok(s.relation.trust < trustBefore, 'trust should decrease when waiting in queue');
    assert.ok(s.pressure.timeLeft < timeBefore, 'time should decrease when waiting');
  });

  it('fillWater increases exposure (risk pressure) while filling bucket (resource pressure)', () => {
    const s = playToFill();
    const expBefore = s.risk.exposure;
    const fillBefore = s.bucketFill;
    fillWater(s, 2);
    assert.ok(s.risk.exposure > expBefore, 'exposure should increase when drawing water');
    assert.ok(s.bucketFill > fillBefore, 'bucket should fill');
  });

  it('exposure decays between rounds in settleRound', () => {
    const s = playToSettle();
    s.risk.exposure = 0.8;
    settleRound(s);
    assert.ok(s.risk.exposure < 0.8, 'exposure should decay after settling a round');
    assert.ok(s.risk.exposure > 0, 'exposure should not vanish completely');
  });

  it('carryBack applies spillage (resource) and exposure (risk) simultaneously', () => {
    const s = playToCarry();
    const fillBefore = s.bucketFill;
    const expBefore = s.risk.exposure;
    carryBack(s);
    assert.ok(s.bucketFill < fillBefore, 'water should spill during carry');
    assert.ok(s.risk.exposure >= expBefore, 'exposure should not decrease during carry');
  });
});
