# CREATIVE_CARD: 水源轮值

- slug: `shuiyuan-lunzhi`
- creative_line: 水源轮值
- target_runtime: web
- target_minutes: 20
- core_emotion: 水桶容量 + 排队秩序 + 搬运洒漏
- core_loop: 排队 -> 装水 -> 选择路线 -> 搬回棚区 -> 分配或藏水 -> 结算信任和存水
- failure_condition: 关键状态崩溃，或在本轮主循环中被系统淘汰
- success_condition: 在限定时长内完成主循环，并稳定进入至少一个可结算结局

## Intent

- 做一个 Babel 相关的单创意线微游戏
- 只保留一个主循环，不扩成大项目
- 让 Claude worker 能按固定 packet 稳定并行
