# MECHANIC_SPEC: 水源轮值

## Primary Mechanic
- mechanic: 水桶容量(10L) + 排队秩序 + 搬运洒漏
- primary_input: 控制水桶装水量并沿路线搬回棚区
- minimum_interaction: 玩家选择装水量(点击加水)和路线(点击路线)，搬运中 spillage 与 trust 同时变化

## Mechanic Steps & Formulas

### 1. 排队取水 (QUEUE)
- queuePosition = random(1, queueSize), queueSize=6
- 每次点击前进一位, queuePosition--, timeLeft -= 0.5
- queuePosition 到 0 时进入 FILL

### 2. 控制装水量 (FILL)
- 每次点击水龙头 +2L, 不超过 bucketCapacity(10L)
- 每次装水 timeLeft -= 0.5
- 点"装完了"进入 ROUTE

### 3. 选择搬运路线 (ROUTE)
- 3 条路线，点击路线曲线选择：

| 路线 | spillRate | riskMod | timeCost |
|---|---|---|---|
| 大路 main | 0.15 | 0 | 2 |
| 小路 shortcut | 0.35 | +0.2 | 1 |
| 夜路 night | 0.25 | +0.3 | 1 |

### 4. 搬运结算 (CARRY)
- 自动动画：贝塞尔曲线移动 + 洒水粒子
- spillage = bucketFill × route.spillRate
- bucketFill -= spillage
- exposure = min(1, exposure + route.riskMod)
- timeLeft -= route.timeCost（在 chooseRoute 时已扣）

### 5. 分配或藏水 (DISTRIBUTE)
- 点击棚区水罐 pourWater +1L，点击暗处 hideWater +1L
- give + hide <= bucketFill
- 藏水检测: detected = random() < exposure
  - 检测到: trust -= hide × 5
  - 未检测到: 无后果
- 点击"确认分配" → SETTLE

### 6. 结算 (SETTLE)
- stored += give; personalReserve += hide
- trust = min(100, trust + give × 2)
- game over: timeLeft ≤ 0 或 trust ≤ 0
- round.current++; 若 > max(5) → 结局判定

## State Coupling

每次有效操作必须同时推动两类后果：
- 生存/资源/进度压力：water、spillage、timeLeft、stored 至少一个直接变化
- 关系/风险/秩序压力：trust、exposure、queuePosition 至少一个直接变化

验证矩阵：
| Phase | 资源压力 | 关系压力 |
|-------|----------|----------|
| QUEUE | timeLeft ↓ | queuePosition ↓ |
| FILL | water ↑, timeLeft ↓ | — |
| ROUTE | timeLeft ↓（按 timeCost） | — |
| CARRY | spillage ↑, water ↓ | exposure ↑ |
| DISTRIBUTE | stored/reserve 变化 | trust ↓（检测到藏水）|
| SETTLE | stored 累计 | trust ↑（分配奖励）|

## Not A Choice List
- 不能只展示 2-4 个文字按钮让玩家选择
- UI worker 必须把 primary input 映射到场景对象操作（水龙头、路线曲线、水罐、暗处区域）
- integration worker 必须让这个操作进入状态结算，而不是只写叙事反馈

## Event Pool (content worker 职责)
- 排队冲突事件: 影响 queuePosition 或 trust
- 搬运随机事件: 额外 spillage 或 exposure 变化
- 藏水发现事件: 替代或补充随机检测
- 事件必须直接修改 Required State，不能只输出文字
