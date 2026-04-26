# TASKS: 水源轮值

本文件保留给旧入口兼容；任务真源见 `TASK_BREAKDOWN.md`。

# TASK_BREAKDOWN: 水源轮值

## Standard Worker Bundle

1. `shuiyuan-lunzhi-foundation`
   - lane: foundation
   - level: M
   - goal: 建立只服务「排队 -> 装水 -> 选择路线 -> 搬回棚区 -> 分配或藏水 -> 结算信任和存水」的可运行骨架

2. `shuiyuan-lunzhi-state`
   - lane: logic
   - level: M
   - goal: 实现 Direction Lock 状态的一次分配/操作结算

3. `shuiyuan-lunzhi-content`
   - lane: content
   - level: M
   - goal: 用事件池强化「水桶容量 + 排队秩序 + 搬运洒漏」

4. `shuiyuan-lunzhi-ui`
   - lane: ui
   - level: M
   - goal: 让玩家看见核心压力、可选操作和后果反馈

5. `shuiyuan-lunzhi-integration`
   - lane: integration
   - level: M
   - goal: 把已有 state/content/ui 接成单一主循环

6. `shuiyuan-lunzhi-qa`
   - lane: qa
   - level: S
   - goal: 用测试和 scripted playthrough 确认方向没跑偏
