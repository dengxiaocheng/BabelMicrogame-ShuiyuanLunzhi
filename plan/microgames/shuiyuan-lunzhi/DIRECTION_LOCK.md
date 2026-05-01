# Direction Lock: 水源轮值

## One Sentence
玩家在排队取水、搬运损耗和藏水风险之间求生。

## Core Loop
1. 执行核心循环：排队 → 装水 → 选择路线 → 搬回棚区 → 分配或藏水 → 结算信任和存水
2. 按 20 分钟节奏推进：取水往返 → 排队冲突 → 漏桶和偷藏 → 水源关闭倒计时

## Must Keep
- 核心机制必须保持：水桶容量 + 排队秩序 + 搬运洒漏
- 核心循环必须保持：排队 → 装水 → 选择路线 → 搬回棚区 → 分配或藏水 → 结算信任和存水
- 20 分钟结构只作为节奏，不扩成大项目

## Must Not Add
- 不做开放生存；核心是水的重量和秩序
- 不新增第二套主循环
- 不把小游戏扩成长期经营或开放世界

## Required State
- `water` — 当前桶中水量 (resource.water)
- `queue_order` — 排队位置 (pressure.queuePosition)
- `spillage` — 搬运洒漏量 (carrySpillage)
- `trust` — 信任值 0–100 (relation.trust)
- `day` — 当前轮次 (round.current / round.max)

## Numeric Targets (锁定)
- bucketCapacity = 10L
- trust 起始 = 50, 范围 [0, 100]
- timeLeft 起始 = 20, 每轮扣 0.5(queue)+0.5(fill)+1~2(route)
- 存活结局：total >= 20L 且 trust >= 40 → "挺过轮值"
- 勉强结局：total >= 10L → "勉强撑过"
- 失败：trust <= 0 → "被赶出队伍"；timeLeft <= 0 → "水源关闭"

## Phase Order
QUEUE → FILL → ROUTE → CARRY → DISTRIBUTE → SETTLE → (next round or GAME_OVER)

## Success
在限定时长内完成主循环，并稳定进入至少一个可结算结局

## Failure
关键状态崩溃，或在本轮主循环中被系统淘汰
