# ACCEPTANCE_PLAYTHROUGH: 水源轮值

## Scripted Playthrough

### Initial State
1. 开局显示 HUD：第 1/5 轮、信任 50、存水 0.0L、时间 20.0、暴露 0%
2. 场景显示：排队取水，玩家高亮标记"你"，排在随机位置

### Round 1: Queue → Fill → Route → Carry → Distribute → Settle

**QUEUE (排队)**
3. 玩家点击自己的蓝色圆点，queuePosition 逐次减 1
4. 每次点击，时间 −0.5，HUD 时间条缩短
5. 排到后自动进入 FILL 阶段

**FILL (装水)**
6. 显示水桶和水龙头，桶内水位为空
7. 玩家点击水龙头，每次装水 +2L，时间 −0.5
8. 水位线随装水上升，桶内显示 "4.0 / 10L"
9. 玩家点击"装完了"→ 进入 ROUTE

**ROUTE (选择路线)**
10. 显示三条路线：大路（洒漏 15%，耗时 2）、小路（洒漏 35%，耗时 1）、夜路（洒漏 25%，耗时 1）
11. 玩家点击一条路线 → 进入 CARRY

**CARRY (搬回棚区)**
12. 动画：玩家沿路线从井口移动到棚区
13. 移动中洒出水滴（蓝色小圆点），rate 由路线决定
14. 到达后自动触发 arriveCamp → carryBack()
15. 状态反馈：洒了 X.X 升，剩 X.X 升。暴露度根据路线增加

**DISTRIBUTE (分配或藏水)**
16. 显示：桶中剩余水量、棚区水罐（点击倒水 +1L）、暗处（点击藏水 +1L）
17. HUD 和底部提示显示当前暴露度（越高藏水越易被发现）
18. 玩家分配水量：例如倒 6L 到水罐，藏 2L
19. 点击"确认分配"
20. 系统结算：藏水根据暴露度概率判定是否被发现
    - 被发现 → 信任降低（藏水量 × 5）
    - 未发现 → 仅日志提示"暂时没被发现"

**SETTLE (结算)**
21. 显示本轮统计：分配出去、藏水、洒漏、信任、存水（含本轮累积）、私藏（含本轮累积）
22. 存水 = 历史累积 + 本轮分配；私藏 = 历史累积 + 本轮藏水
23. 点击"下一轮"→ settleRound() → 进入下一轮 QUEUE 或 GAME_OVER

### State Feedback Per Round
24. 资源压力变化：water/stored/personalReserve 随分配和藏水变化
25. 关系压力变化：trust 随分配增加（give × 2），随藏水被发现减少（hide × 5）
26. 暴露度累积：route.riskMod 加到 exposure，影响后续藏水被发现概率

### Ending Conditions
- **所有 5 轮完成** → GAME_OVER，根据存水 + 私藏 + 信任判定结局：
  - 挺过轮值：总水量 ≥ 20 且信任 ≥ 40
  - 勉强撑过：总水量 ≥ 10
  - 水量不足：总水量 < 10
- **信任 ≤ 0** → 被赶出队伍
- **时间 ≤ 0** → 水源关闭

### GAME_OVER
27. 显示结局标签（颜色区分）、最终统计（存水、私藏、信任、暴露度）、存活轮数
28. 点击"重新开始"→ initGame() 重置所有状态

## Direction Gate
- 主循环完整闭环：QUEUE → FILL → ROUTE → CARRY → DISTRIBUTE → SETTLE → (回 QUEUE 或 GAME_OVER)
- Primary input 真实驱动状态：装水量 → bucketFill，路线选择 → spillage + exposure，分配/藏水 → stored + personalReserve + trust
- 不得只靠文字选项或通用按钮列表；所有操作通过场景对象交互
- integration worker 必须让这个流程可试玩
- qa worker 必须用测试或手工记录验证这个流程
- 如试玩要求需要偏离 Direction Lock，停止并回交 manager
