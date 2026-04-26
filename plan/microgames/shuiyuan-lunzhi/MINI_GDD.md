# MINI_GDD: 水源轮值

## Scope

- runtime: web
- duration: 20min
- project_line: 水源轮值
- single_core_loop: 排队 -> 装水 -> 选择路线 -> 搬回棚区 -> 分配或藏水 -> 结算信任和存水

## Core Loop
1. 执行核心循环：排队 -> 装水 -> 选择路线 -> 搬回棚区 -> 分配或藏水 -> 结算信任和存水
2. 按 20 分钟节奏推进：取水往返 -> 排队冲突 -> 漏桶和偷藏 -> 水源关闭倒计时

## State

- resource
- pressure
- risk
- relation
- round

## UI

- 只保留主界面、结果反馈、结算入口
- 不加多余菜单和后台页

## Content

- 用小型事件池支撑主循环
- 一次只验证一条 Babel 创意线

## Constraints

- 总体规模目标控制在 5000 行以内
- 单个 worker 任务必须服从 packet budget
- 如需扩线，交回 manager 重新拆
