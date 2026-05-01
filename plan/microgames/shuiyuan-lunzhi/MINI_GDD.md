# MINI_GDD: 水源轮值

## Scope

- runtime: web (canvas 640×400)
- duration: 20min (timeLeft countdown from 20)
- project_line: 水源轮值
- single_core_loop: 排队 → 装水 → 选择路线 → 搬回棚区 → 分配或藏水 → 结算信任和存水

## Core Loop

1. 执行核心循环：排队 → 装水 → 选择路线 → 搬回棚区 → 分配或藏水 → 结算信任和存水
2. 按 20 分钟节奏推进：取水往返 → 排队冲突 → 漏桶和偷藏 → 水源关闭倒计时
3. 每轮消耗 timeLeft：排队 −0.5/步、装水 −0.5/次、路线按 timeCost（大路 2、小路/夜路 1）

## State Registry

| Key | Variable | Range | Description |
|-----|----------|-------|-------------|
| water | resource.water | 0–bucketCapacity | 桶中剩余水量 |
| queue_order | pressure.queuePosition | 1–queueSize | 排队位置 |
| spillage | carrySpillage | 0–bucketFill×spillRate | 本轮洒漏量 |
| trust | relation.trust | 0–100 | 队伍信任值 |
| day | round.current | 1–round.max (5) | 当前轮次 |

Derived state:
- resource.stored — 棚区累计存水
- resource.personalReserve — 个人私藏累计
- risk.exposure — 暴露度 0–1，影响藏水被发现概率
- pressure.timeLeft — 剩余时间，归零则 GAME_OVER

## Route Table

| Route | spillRate | riskMod | timeCost |
|-------|-----------|---------|----------|
| main (大路) | 0.15 | 0 | 2 |
| shortcut (小路) | 0.35 | 0.2 | 1 |
| night (夜路) | 0.25 | 0.3 | 1 |

## Outcome Table

| Condition | Outcome |
|-----------|---------|
| timeLeft ≤ 0 | 水源关闭 |
| trust ≤ 0 | 被赶出队伍 |
| round > max & stored+reserve ≥ 20 & trust ≥ 40 | 挺过轮值 |
| round > max & stored+reserve ≥ 10 | 勉强撑过 |
| round > max & stored+reserve < 10 | 水量不足 |

## Visual Style
- 暗色调土棕色背景 (#3e2723)，夜空渐变顶部
- 水用蓝色 (#29b6f6/#4fc3f7)
- 棚区用深木色，暗处用深紫/黑
- 所有交互通过 canvas 点击区域完成，无 HTML 按钮

## UI

- Canvas 640×400 作为唯一游戏画面
- HUD 固定顶部 32px：轮次、信任条、存水、时间条、暴露度
- 底部 log 面板显示最近 8 条操作记录
- 不加多余菜单和后台页

## Content

- 用小型事件池支撑主循环（当前未实现事件池，executor 可扩展但不得替换核心循环）
- 一次只验证一条 Babel 创意线

## Constraints

- 总体规模目标控制在 5000 行以内
- 单个 worker 任务必须服从 packet budget
- 如需扩线，交回 manager 重新拆
