# TASK_BREAKDOWN: 水源轮值

## 当前实现状态
骨架已搭建: game.js(核心逻辑), main.js(入口), scene.js(canvas渲染), game.test.js(测试)
后续 worker 在此基础上完善，不从零开始。

## Core Loop Service Map

每个 worker 包必须说明它如何服务 primary input（控制水桶装水量并沿路线搬回棚区）和核心循环（排队→装水→选择路线→搬回棚区→分配或藏水→结算信任和存水）：

| Worker | 服务 primary input | 服务核心循环 |
|--------|-------------------|-------------|
| state | 提供事件池让每次装水/搬运/分配产生状态变化 | 事件池直接推动每个 phase 的 Required State |
| content | 事件描述文本让操作有叙事反馈 | 文本强化排队冲突和搬运洒漏的紧迫感 |
| ui | 点击涟漪/闪烁让操作反馈可见 | 视觉反馈映射到 trust/timeLeft 压力 |
| integration | 端到端连接确保操作→状态→反馈完整 | 主循环 5 轮可完成，结局可触发 |
| qa | 测试验证操作确实改变状态 | 覆盖每个 phase 和每种结局路径 |

## Worker Bundle

### 1. `shuiyuan-lunzhi-state`
- lane: logic
- level: M
- goal: 强化状态层深度——事件池、轮次变化、难度递进
- reads: DIRECTION_LOCK.md, MECHANIC_SPEC.md
- writes: src/game.js
- deliverables: 事件池系统(排队冲突/搬运事件), 轮次递进(queueSize随round增加), 信任阈值效果
- acceptance: `node --test src/game.test.js` 全部通过; 新增事件测试; 不破坏核心公式
- forbidden: 不改 scene.js/main.js; 不改锁定数值(bucketCapacity=10, spillRate, riskMod); 不添加新 phase 或路线

### 2. `shuiyuan-lunzhi-content`
- lane: content
- level: M
- goal: 用事件池强化「水桶容量 + 排队秩序 + 搬运洒漏」
- reads: DIRECTION_LOCK.md, MECHANIC_SPEC.md, MINI_GDD.md
- writes: src/game.js(事件文本), src/ui/scene.js(渲染文本)
- deliverables: 事件描述文本(排队冲突3~5条,搬运事件3~5条,藏水检测2~3条), 结局变体文本, HUD警告文案
- acceptance: 所有新文本在 log 中正确显示; 不影响状态计算
- forbidden: 不改核心公式; 不添加新 state 变量; 不添加新 phase

### 3. `shuiyuan-lunzhi-ui`
- lane: ui
- level: M
- goal: 让玩家看见核心压力、可选操作和后果反馈
- reads: DIRECTION_LOCK.md, SCENE_INTERACTION_SPEC.md
- writes: src/ui/scene.js, src/main.js
- deliverables: phase 过渡淡入, 点击涟漪效果, trust<25闪烁, timeLeft<5闪烁, 结局色调
- acceptance: ACCEPTANCE_PLAYTHROUGH 脚本可完整走完; 所有 phase 渲染正确; hover/click 反馈即时
- forbidden: 不改 game.js 状态逻辑; 不添加新 phase; 不替换为 HTML 按钮

### 4. `shuiyuan-lunzhi-integration`
- lane: integration
- level: M
- goal: 把已有 state/content/ui 接成单一主循环
- reads: 所有 plan 文件
- writes: src/main.js, src/game.js(只修 bug), src/ui/scene.js
- deliverables: 端到端试玩可完成 5 轮; 事件池事件在 scene 有反馈; UI 数值与 state 一致
- acceptance: 手动跑完 5 轮不报错; trust=0 和 timeLeft=0 触发 GAME_OVER; 重新开始 state 重置
- forbidden: 不改锁定数值; 不添加新 phase/路线; 方向问题写 report 不自行改

### 5. `shuiyuan-lunzhi-qa`
- lane: qa
- level: S
- goal: 用测试和 scripted playthrough 确认方向没跑偏
- reads: 所有 plan 文件, ACCEPTANCE_PLAYTHROUGH.md
- writes: src/game.test.js, qa 报告
- deliverables: 事件池测试; 每种结局类型测试; 边界测试(trust=0,timeLeft=0,bucketFill=0,round=max); QA 报告
- acceptance: `node --test` 全部通过; QA 报告覆盖 ACCEPTANCE_PLAYTHROUGH 检查清单
- forbidden: 不改实现代码; 发现问题写 report 不自行修
