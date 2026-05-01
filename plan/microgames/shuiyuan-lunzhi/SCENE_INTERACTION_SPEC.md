# SCENE_INTERACTION_SPEC: 水源轮值

## Scene Objects

- 水桶
- 井口队列
- 路线格
- 漏水标记
- 棚区水罐

## Player Input

- primary_input: 控制水桶装水量并沿路线搬回棚区
- minimum_interaction: 玩家必须选择装水量和路线，移动中 spillage 与 queue_order/trust 同时变化

## Feedback Channels

- 水位线
- 洒漏轨迹
- queue_order 骚动
- trust 变化

## Forbidden UI

- 不允许做开放生存地图
- 不允许只用“多装/少装”按钮

## Acceptance Rule

- 首屏必须让玩家看到至少一个可直接操作的场景对象
- 玩家操作必须产生即时可见反馈，且反馈能追溯到 Required State
- 不得只靠随机事件文本或普通选择按钮完成主循环
