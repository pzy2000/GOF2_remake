# GOF2 by pzy

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [Français](README.fr.md)

一个可在浏览器中游玩的 WebGL 太空战斗/贸易垂直切片。驾驶第三人称飞船，迎战海盗，开采小行星，回收货物，停靠空间站，进行交易，接受任务，并探索六大前线星系 + PTD Home 专用据点，进度通过浏览器存储保存/读取。

## 截图

| 视图 | 截图 |
| --- | --- |
| 主菜单 | ![主菜单展示六大前线星系 + PTD Home、语言选择和存档槽位](docs/screenshots/zh-CN/main-menu.png) |
| 飞行 HUD | ![第三人称飞行 HUD，包含舰船仪表、新手清单、主线、经济、执法和信号追踪](docs/screenshots/zh-CN/flight-hud.png) |
| 空间站市场 | ![空间站市场和服务界面，包含买卖、任务流程和本地经济状态](docs/screenshots/zh-CN/station-market.png) |
| 银河地图 | ![银河地图显示已发现星系、空间站航线、调度目标、主线目标和 Quiet Signals](docs/screenshots/zh-CN/galaxy-map.png) |
| 职业船坞 | ![船坞卡片展示职业船体、特性、蓝图路线和购买门槛](docs/screenshots/zh-CN/shipyard-careers.png) |

## 运行

```bash
npm install
npm run dev
npm run dev:full
npm run build
npm test
```

`npm run dev:full` 会同时启动本地权威经济后端 `127.0.0.1:19777` 和 Vite 前端。只想使用浏览器内置的经济 fallback 时，可以运行普通的 `npm run dev`。

也可以直接运行一键脚本：

```bash
./start.sh
```

## 操作

- W/S：加/减推力
- A/D：横滚
- 鼠标移动：点击飞行视图后控制俯仰/偏航
- 鼠标左键：发射脉冲激光，靠近小行星时进行采矿
- 鼠标右键或 Space：发射制导导弹
- Shift：加力
- E：停靠、交互、收集战利品
- Tab：切换海盗目标
- M：打开银河地图
- C：切换镜头
- Esc：暂停

## 资源

原始位图资源由 Codex 内置 `$imagegen` 生成，转换为 WebP 后放入 `public/assets/generated/`。应用通过 `public/assets/generated/manifest.json` 加载这些资源。

生成的项目资源包括：

- `key-art.webp`
- `commodity-icons.webp`
- `equipment-icons.webp`
- `nebula-bg.webp`
- `skybox-panorama.webp`
- 每个星系的 `skybox-*.webp`
- 每个可访问行星的 `planet-*.webp`
- 五套生成玩家飞船轮廓的 `ships/*.glb`
- `asteroid-textures.webp`
- `faction-emblems.webp`
- `hud-overlay.webp`

仓库不包含受版权保护的外部图片或模型包。飞行场景使用每星系生成的天空盒作为随相机锁定的内球背景，并保留 `skybox-panorama.webp` 和 `nebula-bg.webp` 作为 fallback。行星使用生成的等距柱状 WebP 纹理贴到大型 Three.js 球体上，让每个空间站都靠近自己的可见星球。玩家飞船模型是本地生成的 GLB 文件，由 `scripts/generate-ship-models.mjs` 生成；运行时通过资源 manifest 加载，缺失时回退到程序化几何体。空间站、小行星、弹体、战利品和 fallback 飞船使用 Three.js 基础体。`public/assets/music/` 下的背景音乐为 CC0 曲目，来源和许可记录在 `public/assets/music/credits.json`。

## 跃迁旅行

银河地图现在以已发现的行星空间站为跃迁目标，而不只是整个星系。飞船离开空间站后会飞向本地跃迁门，启动虫洞航行，并在目标空间站附近退出，而不是自动停靠。已知星系默认揭示主行星；其他行星会在本地飞行中显示为 Unknown Beacon 扫描目标，玩家飞入扫描范围后会解锁为跃迁目的地。导航阶段的手动飞行输入会取消自动导航；一旦开始星门充能或虫洞阶段，航行会完成。

## 交易和任务

空间站市场会保存库存、需求和基线恢复状态。购买会降低本地库存并推高买入价格；出售会增加库存并降低需求。本地 REST + SSE 经济后端会全局模拟 NPC 矿工、信使、货船、商人和走私者，然后把市场事件和可见 NPC 航线流式同步回游戏。空间站的 Economy 标签页同时也是 Dispatch Board：合法补给与走私调度可接取、设航线、在 HUD/星图追踪，并在完成后回写市场压力。

合约使用已保存的舰载时间。信使、货运、客运、采矿、悬赏、护航、回收和调度任务都有截止时间和声望后果。客运合约会预留货舱容量，货运任务交付时会消耗玩家提供的货物，护航任务会在飞行中生成护航船队，回收任务会生成可回收箱。可见经济 NPC 可 Hail、Escort、Rob、Rescue 或 Report；本地服务在线时，劫掠、救援和上报会写入后端后果。

主线剧情是 Glass Wake Protocol，一条 13 章任务链，围绕 Mirr 探针、伪造贸易信标、Ashen 中继海盗、Unknown Drones、Echo Lock 目标和 Listener Scar 展开。空间站包含 Captain's Log 标签页，用于追踪章节进度、当前目标、可重试失败和已解锁剧情日志，不需要新增独立剧情存档状态。

## 飞船和装备

装备系统使用飞船装载 + 库存模型。主武器、副武器、功能、防御和工程模块会占用对应槽位；安装会从装备库存消耗一个物品，卸载会返回库存，当前武器由已安装装载顺序决定。Blueprint Workshop 的制造会消耗信用点和货物材料，并把成品加入库存，而不是自动安装。职业装备路线支持采矿、走私、战斗和探索构筑。

深层 Quiet Signals 揭示的隐藏空间站拥有独家终局军火库：Obsidian Foundry、Parallax Hermitage、Moth Vault 和 Crownshade Observatory 会各自少量售卖无法制造、不会掉落的超模神器装备，面向完成探索链后的高价终局构筑。

舰队包含 9 个可玩船体，复用 5 套生成 GLB 外形轮廓；starter、hauler、miner、smuggler、fighter、gunship 和 explorer 职业现在拥有不同属性、槽位、特性、默认装载和购买门槛。购买新船会装备其默认装载，并把旧船体和已安装装备存放到专用的 PTD Home 空间站。已存放飞船只能在 PTD Home 免费切换。

## 存档、数据和音频

浏览器存档系统提供三个手动槽位和一个自动/快速槽位。旧的单槽 v1 存档会在首次读取 v2 存档索引时迁移到自动槽。槽位元数据显示星系、空间站/飞行状态、信用点、游戏时间、保存日期和版本。

游戏内容拆分为强类型数据模块，涵盖商品、飞船/装备、星系/空间站、派系和任务，并通过校验测试检查重复 ID 和断裂引用。

音频采用混合运行时：SFX、警告音和 fallback 音乐由 Web Audio API 合成，CC0 背景曲按当前星系、空间站类型和战斗状态路由。资源 manifest 把飞行主题、空间站主题和战斗音乐映射到 `public/assets/music/` 文件；外部曲目无法播放时，程序化音乐层会接管。设置包含主音量、SFX、音乐、语音和静音控制。

## 已知限制

这是一个垂直切片，不是完整战役。权威经济后端是本地开发服务；如果它离线，浏览器会回退到本地市场模拟，保证交易仍可游玩，依赖后端的 NPC/经济事件会平滑降级。商品、装备和派系精灵图在 UI 中通过 CSS 图集定位裁切。程序化 SFX 和 fallback 音乐刻意保持轻量，而人工整理的 BGM 覆盖范围仍限于当前 CC0 曲目集。
