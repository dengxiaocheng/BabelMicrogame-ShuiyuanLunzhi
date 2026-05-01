/**
 * 水源轮值 — Content Event Pool
 * Minimum content pool reinforcing core emotions:
 *   水桶容量 + 排队秩序 + 搬运洒漏
 *
 * Events tie to Scene Objects (水桶, 井口队列, 路线格, 棚区水罐)
 * and produce feedback through Feedback Channels (水位线, 洒漏轨迹, 队列骚动, 信任变化).
 */

// Phase strings inlined to break circular import (game.js → events.js → game.js)
const Phase = { QUEUE: 'QUEUE', FILL: 'FILL', ROUTE: 'ROUTE', CARRY: 'CARRY', DISTRIBUTE: 'DISTRIBUTE', SETTLE: 'SETTLE' };

// --- Feedback channels (mapped to Scene Objects) ---

export const FeedbackChannel = {
  WATER_LEVEL: 'water_level',    // 水位线 → 水桶, 棚区水罐
  SPILL_TRAIL: 'spill_trail',    // 洒漏轨迹 → 路线格, 漏水标记
  QUEUE_UNREST: 'queue_unrest',  // 队列骚动 → 井口队列
  TRUST_SHIFT: 'trust_shift',    // 信任变化 → HUD trust bar
};

// --- Event definitions ---
// apply(state) mutates state and returns narrative text.

const EVENT_POOL = [

  // ===== QUEUE — 排队秩序 =====

  {
    id: 'queue_cut_in',
    phase: Phase.QUEUE,
    condition: (s) => s.pressure.queuePosition > 2,
    apply: (s) => {
      s.pressure.queuePosition += 1;
      s.pressure.timeLeft = Math.max(0, s.pressure.timeLeft - 0.3);
      s.relation.trust = Math.max(0, s.relation.trust - 3);
      return '有人插队到你前面！排队秩序被打乱了。';
    },
    feedback: { channel: FeedbackChannel.QUEUE_UNREST, intensity: 0.7 },
  },
  {
    id: 'queue_argument',
    phase: Phase.QUEUE,
    condition: (s) => s.pressure.queuePosition > 1 && s.relation.trust < 45,
    apply: (s) => {
      s.pressure.timeLeft = Math.max(0, s.pressure.timeLeft - 0.4);
      s.relation.trust = Math.max(0, s.relation.trust - 2);
      return '前面两人为取水顺序争吵，队伍前进变慢了。';
    },
    feedback: { channel: FeedbackChannel.QUEUE_UNREST, intensity: 0.5 },
  },
  {
    id: 'queue_kind_stranger',
    phase: Phase.QUEUE,
    condition: (s) => s.pressure.queuePosition > 3 && s.pressure.timeLeft > 6,
    apply: (s) => {
      s.pressure.queuePosition = Math.max(1, s.pressure.queuePosition - 1);
      return '一位老人示意你站到他前面，位置前移了。';
    },
    feedback: { channel: FeedbackChannel.TRUST_SHIFT, intensity: 0.3 },
  },
  {
    id: 'queue_guard_rush',
    phase: Phase.QUEUE,
    condition: (s) => s.round.current >= 3 && s.pressure.timeLeft < 12,
    apply: (s) => {
      s.pressure.timeLeft = Math.max(0, s.pressure.timeLeft - 0.5);
      return '守卫吼道"快点！"——水源快要关了。';
    },
    feedback: { channel: FeedbackChannel.QUEUE_UNREST, intensity: 0.8 },
  },

  // ===== FILL — 水桶容量 =====

  {
    id: 'fill_crack',
    phase: Phase.FILL,
    condition: (s) => s.bucketFill > 3 && s.round.current >= 2,
    apply: (s) => {
      const leak = +(s.bucketFill * 0.12).toFixed(1);
      s.bucketFill = Math.max(0, s.bucketFill - leak);
      return `桶底有裂缝！漏掉了 ${leak} 升。水桶越来越不耐用。`;
    },
    feedback: { channel: FeedbackChannel.WATER_LEVEL, intensity: 0.6 },
  },
  {
    id: 'fill_splash_over',
    phase: Phase.FILL,
    condition: (s) => s.bucketFill >= s.resource.bucketCapacity * 0.85,
    apply: (s) => {
      const spill = +(s.bucketFill * 0.08).toFixed(1);
      s.bucketFill = Math.max(0, s.bucketFill - spill);
      return `装太满了，水从桶沿溅出 ${spill} 升！贪心反而浪费。`;
    },
    feedback: { channel: FeedbackChannel.SPILL_TRAIL, intensity: 0.5 },
  },
  {
    id: 'fill_low_pressure',
    phase: Phase.FILL,
    condition: (s) => s.pressure.timeLeft < 10 && s.round.current >= 2,
    apply: (s) => {
      s.pressure.timeLeft = Math.max(0, s.pressure.timeLeft - 0.3);
      return '水压骤降，出水流变得更细了。';
    },
    feedback: { channel: FeedbackChannel.WATER_LEVEL, intensity: 0.3 },
  },
  {
    id: 'fill_bucket_heavy',
    phase: Phase.FILL,
    condition: (s) => s.bucketFill > s.resource.bucketCapacity * 0.7,
    apply: (s) => {
      s.pressure.timeLeft = Math.max(0, s.pressure.timeLeft - 0.2);
      return '桶越来越沉，提起来都费劲了。';
    },
    feedback: { channel: FeedbackChannel.WATER_LEVEL, intensity: 0.2 },
  },

  // ===== CARRY — 搬运洒漏 =====

  {
    id: 'carry_pothole',
    phase: Phase.CARRY,
    condition: (s) => s.chosenRoute === 'shortcut' && s.bucketFill > 2,
    apply: (s) => {
      const extra = +(s.bucketFill * 0.12).toFixed(1);
      s.bucketFill = Math.max(0, s.bucketFill - extra);
      s.carrySpillage += extra;
      return `小路上踩到坑洼，又洒了 ${extra} 升！`;
    },
    feedback: { channel: FeedbackChannel.SPILL_TRAIL, intensity: 0.7 },
  },
  {
    id: 'carry_night_stumble',
    phase: Phase.CARRY,
    condition: (s) => s.chosenRoute === 'night' && s.bucketFill > 1,
    apply: (s) => {
      const extra = +(s.bucketFill * 0.08).toFixed(1);
      s.bucketFill = Math.max(0, s.bucketFill - extra);
      s.carrySpillage += extra;
      s.risk.exposure = Math.min(1, s.risk.exposure + 0.05);
      return `黑暗中绊了一跤，洒了 ${extra} 升，桶差点翻了。`;
    },
    feedback: { channel: FeedbackChannel.SPILL_TRAIL, intensity: 0.6 },
  },
  {
    id: 'carry_help',
    phase: Phase.CARRY,
    condition: (s) => s.chosenRoute === 'main' && s.relation.trust > 35 && s.bucketFill > 3,
    apply: (s) => {
      const saved = +(s.carrySpillage * 0.3).toFixed(1);
      s.bucketFill += saved;
      s.carrySpillage = Math.max(0, s.carrySpillage - saved);
      return `路上有人帮你扶了一把桶，少洒了 ${saved} 升。`;
    },
    feedback: { channel: FeedbackChannel.TRUST_SHIFT, intensity: 0.4 },
  },
  {
    id: 'carry_patrol',
    phase: Phase.CARRY,
    condition: (s) => s.round.current >= 3 && s.risk.exposure > 0.3,
    apply: (s) => {
      s.risk.exposure = Math.min(1, s.risk.exposure + 0.1);
      return '远处有巡逻队的灯光，你不得不绕路。暴露风险增加。';
    },
    feedback: { channel: FeedbackChannel.SPILL_TRAIL, intensity: 0.4 },
  },

  // ===== DISTRIBUTE — 分配与藏水 =====

  {
    id: 'dist_suspicious_look',
    phase: Phase.DISTRIBUTE,
    condition: (s) => s.risk.exposure > 0.4 && s.hidWater > 0,
    apply: (s) => {
      s.risk.exposure = Math.min(1, s.risk.exposure + 0.08);
      return '有人盯着你的桶看了一眼——他们起疑了。';
    },
    feedback: { channel: FeedbackChannel.TRUST_SHIFT, intensity: 0.5 },
  },
  {
    id: 'dist_extra_demand',
    phase: Phase.DISTRIBUTE,
    condition: (s) => s.resource.stored < 5 && s.round.current >= 2,
    apply: (s) => {
      s.relation.trust = Math.max(0, s.relation.trust - 2);
      return '棚区有人喊："今天多给点！"——期望在升高。';
    },
    feedback: { channel: FeedbackChannel.TRUST_SHIFT, intensity: 0.4 },
  },
  {
    id: 'dist_grateful',
    phase: Phase.DISTRIBUTE,
    condition: (s) => s.distributedWater > s.bucketFill * 0.7 && s.distributedWater > 3,
    apply: (s) => {
      s.relation.trust = Math.min(100, s.relation.trust + 3);
      return '大家看到你大方分水，信任悄然回升。';
    },
    feedback: { channel: FeedbackChannel.TRUST_SHIFT, intensity: 0.6 },
  },
  {
    id: 'dist_water_mismatch',
    phase: Phase.DISTRIBUTE,
    condition: (s) => s.hidWater > 0 && s.risk.exposure > 0.5,
    apply: (s) => {
      s.risk.exposure = Math.min(1, s.risk.exposure + 0.15);
      s.relation.trust = Math.max(0, s.relation.trust - 4);
      return '有人嘀咕："怎么带回来的水少了？"——质疑声四起。';
    },
    feedback: { channel: FeedbackChannel.TRUST_SHIFT, intensity: 0.7 },
  },
];

// --- Event engine ---

/**
 * Roll for a random event based on current game state.
 * Fires only while state.phase matches the event's phase.
 * Base probability ~28%, rising ~5% per round after round 2.
 * Returns null if nothing fires, or { id, text, feedback }.
 */
export function rollEvent(state) {
  const candidates = EVENT_POOL.filter(
    (e) => e.phase === state.phase && e.condition(state)
  );
  if (candidates.length === 0) return null;

  const prob = 0.28 + Math.max(0, state.round.current - 2) * 0.05;
  if (Math.random() > prob) return null;

  const event = candidates[Math.floor(Math.random() * candidates.length)];
  const text = event.apply(state);
  return { id: event.id, text, feedback: event.feedback };
}
