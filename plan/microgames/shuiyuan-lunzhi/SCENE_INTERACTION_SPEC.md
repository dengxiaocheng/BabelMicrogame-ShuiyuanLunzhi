# SCENE_INTERACTION_SPEC: 水源轮值

## Scene Objects
- 水桶 — 显示水位，FILL/DISTRIBUTE 阶段可见
- 井口队列 — QUEUE 阶段排队点
- 路线曲线 — ROUTE 阶段三条贝塞尔路径
- 洒水粒子 — CARRY 阶段漏水标记
- 棚区水罐 — DISTRIBUTE 阶段给水目标
- 暗处区域 — DISTRIBUTE 阶段藏水目标

## Player Input
- primary_input: 控制水桶装水量并沿路线搬回棚区
- minimum_interaction: 玩家必须选择装水量和路线，移动中 spillage 与 queue_order/trust 同时变化

## Scene Layout (Canvas 640×400)

### Constants
- WELL_X=60, WELL_Y=250, CAMP_X=580
- HUD: top 32px bar (轮次、信任条、存水、时间条、暴露度)
- Route Y: main=170, shortcut=250, night=330
- Route colors: main=#66bb6a, shortcut=#fdd835, night=#ab47bc

### Per-Phase Click Zones

#### QUEUE
- 井口圆(560, 250, r=32) — 装饰
- 队列点：横排间距 70px，玩家点为蓝色大圆(r=18)
- **Click zone**: 玩家圆形区域(radius<20)，action=`advanceQueue`
- 反馈：前移一位，log 显示等待文字

#### FILL
- 水龙头(365~415, 70~140) — **Click zone**: action=`fillWater`, 每次 +2L
- 水桶(260~340, 135~275) — 装饰，显示水位高度
- "装完了"按钮(430~540, 290~328) — **Click zone**: action=`finishFill`
- 反馈：水位实时上升，HUD timeLeft 减少

#### ROUTE
- 井口(60, 250, r=22) — 装饰
- 棚区(560~600, 232~268) — 装饰
- 三条贝塞尔曲线 — **Click zone**: `py ±22 of routeY, px between WELL+22 and CAMP-20`
  - action=`chooseRoute`, data=routeKey
- 反馈：hover 高亮，选中后进入 CARRY 动画

#### CARRY
- 自动动画，无玩家操作
- 贝塞尔曲线移动 + 洒水粒子(p=0.35/frame)
- 动画完成自动触发 `arriveCamp`

#### DISTRIBUTE
- 中央水桶(280~360, 80~180) — 显示剩余水量
- 棚区水罐(80~200, 210~290) — **Click zone**: action=`pourWater`，+1L
- 暗处区域(440~560, 210~290) — **Click zone**: action=`hideWater`，+1L
- "重置"按钮(200~290, 330~362) — action=`resetDistribute`
- "确认分配"按钮(350~440, 330~362) — action=`confirmDistribute`
- 反馈：水罐/暗处数字变化，箭头指示

#### SETTLE
- 结算数据列表 — 装饰
- "下一轮"按钮(275~365, 320~356) — action=`nextRound`

#### GAME_OVER
- 结局标题 — 装饰
- 最终数据列表 — 装饰
- "重新开始"按钮(275~365, 330~366) — action=`restart`

## Feedback Channels
- 水位线: 桶内蓝色填充高度实时反映 bucketFill
- 洒漏轨迹: CARRY 阶段蓝色水滴粒子，透明度渐消
- queue_order 变化: 玩家圆点前移
- trust 变化: HUD 信任条颜色(≤25 红色 #ef5350，>25 蓝色 #4fc3f7)
- exposure 变化: HUD 右侧暴露度百分比
- timeLeft 变化: HUD 时间条颜色(≤5 红色，>5 绿色 #66bb6a)

## Forbidden UI
- 不允许做开放生存地图
- 不允许只用"多装/少装"文字按钮
- 所有核心操作必须通过 canvas 点击区域完成，不用 HTML 按钮

## Acceptance Rule
- 首屏必须让玩家看到至少一个可直接操作的场景对象（QUEUE 阶段玩家圆点）
- 玩家操作必须产生即时可见反馈，且反馈能追溯到 Required State
- 不得只靠随机事件文本或普通选择按钮完成主循环
