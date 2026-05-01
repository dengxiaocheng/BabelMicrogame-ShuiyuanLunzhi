# MECHANIC_SPEC: 水源轮值

## Primary Mechanic

- mechanic: 水桶容量 + 排队秩序 + 搬运洒漏
- primary_input: 控制水桶装水量并沿路线搬回棚区
- minimum_interaction: 玩家必须选择装水量和路线，移动中 spillage 与 queue_order/trust 同时变化

## Mechanic Steps

1. 排队取水
2. 控制装水量
3. 选择搬运路线
4. 分配或藏水并结算 trust

## State Coupling

每次有效操作必须同时推动两类后果：

- 生存/资源/进度压力：从 Required State 中选择至少一个直接变化
- 关系/风险/秩序压力：从 Required State 中选择至少一个直接变化

## Not A Choice List

- 不能只展示 2-4 个文字按钮让玩家选择
- UI worker 必须把 primary input 映射到场景对象操作
- integration worker 必须让这个操作进入状态结算，而不是只写叙事反馈
