# 水源轮值

> 玩家在排队取水、搬运损耗和藏水风险之间求生。

## 试玩

公开试玩地址：[https://dengxiaocheng.github.io/BabelMicrogame-ShuiyuanLunzhi/](https://dengxiaocheng.github.io/BabelMicrogame-ShuiyuanLunzhi/)

## 本地运行

```bash
# 用任意静态服务器在仓库根目录启动，例如：
npx serve .
# 或
python3 -m http.server 8000
```

然后打开浏览器访问对应地址即可。

## 测试

```bash
npm test
```

## 核心循环

排队 → 装水 → 选择路线 → 搬回棚区 → 分配或藏水 → 结算信任和存水
