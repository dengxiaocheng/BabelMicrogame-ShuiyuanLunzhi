# ACCEPTANCE_PLAYTHROUGH: 水源轮值

## Scripted Playthrough

### Round 1: 大路全分配
1. 开局显示 water / queue_order / spillage / trust / day
2. QUEUE: 点击自己前进到 0, phase->FILL
3. FILL: 点击水龙头 5 次装满 10L, 点"装完了", phase->ROUTE
4. ROUTE: 点击大路, phase->CARRY
5. CARRY: 自动到达, spillage=1.5L, bucketFill=8.5L, phase->DISTRIBUTE
6. DISTRIBUTE: 点棚区水罐 8 次(+8L), 确认, phase->SETTLE
7. SETTLE: stored=8, trust=66, 点"下一轮", phase->QUEUE(round 2)

### Round 2: 小路+藏水
1. QUEUE: 点击前进, phase->FILL
2. FILL: 装满 10L
3. ROUTE: 点击小路, spillage=3.5L, exposure+=0.2
4. DISTRIBUTE: 给 4L, 藏 2L (假设未检测到)
5. SETTLE: stored=12, personalReserve=2, trust=74

### 结局验证
- 挺过轮值: total>=20 且 trust>=40
- 勉强撑过: total>=10
- 水量不足: total<10
- 被赶出队伍: trust<=0 (立即)
- 水源关闭: timeLeft<=0 (立即)

## Direction Gate
- integration worker 必须让这个流程可试玩
- qa worker 必须用测试或手工记录验证这个流程
- 如试玩要求需要偏离 Direction Lock，停止并回交 manager

## 验收检查清单
- [ ] 首屏 QUEUE: 能看到蓝色"你"圆点并点击
- [ ] FILL: 点击水龙头水位上升，点击完成进入 ROUTE
- [ ] ROUTE: 3 条路线可点击，hover 高亮
- [ ] CARRY: 自动动画有水滴效果，到达后状态正确
- [ ] DISTRIBUTE: 能分配水量到水罐和暗处，确认后有结算
- [ ] SETTLE: 显示本轮数据，能进入下一轮
- [ ] GAME_OVER: 显示结局和最终数据，能重新开始
- [ ] 5 轮后或 trust/timeLeft 归零时正确触发结局
