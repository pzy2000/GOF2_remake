export const LOCALE_STORAGE_KEY = "gof2-by-pzy-locale";

export const locales = ["en", "zh-CN", "zh-TW", "ja", "fr"] as const;
export type Locale = (typeof locales)[number];
export type ContentLocale = Exclude<Locale, "en">;
export type LocalizedText = Partial<Record<ContentLocale, string>>;

export const DEFAULT_LOCALE: Locale = "en";

export const localeOptions: Array<{ value: Locale; label: string; speechLang: string; intlLocale: string }> = [
  { value: "en", label: "English", speechLang: "en-US", intlLocale: "en-US" },
  { value: "zh-CN", label: "简体中文", speechLang: "zh-CN", intlLocale: "zh-CN" },
  { value: "zh-TW", label: "繁體中文", speechLang: "zh-TW", intlLocale: "zh-TW" },
  { value: "ja", label: "日本語", speechLang: "ja-JP", intlLocale: "ja-JP" },
  { value: "fr", label: "Français", speechLang: "fr-FR", intlLocale: "fr-FR" }
];

type I18nParams = Record<string, string | number | boolean | undefined | null>;

const uiMessages = {
  en: {
    "language.label": "Language",
    "language.aria": "Select language",
    "language.current": "Language: {language}"
  },
  "zh-CN": {
    "language.label": "语言",
    "language.aria": "选择语言",
    "language.current": "语言：{language}"
  },
  "zh-TW": {
    "language.label": "語言",
    "language.aria": "選擇語言",
    "language.current": "語言：{language}"
  },
  ja: {
    "language.label": "言語",
    "language.aria": "言語を選択",
    "language.current": "言語: {language}"
  },
  fr: {
    "language.label": "Langue",
    "language.aria": "Choisir la langue",
    "language.current": "Langue : {language}"
  }
} satisfies Record<Locale, Record<string, string>>;

const exactText = {
  "zh-CN": {
    "Browser WebGL vertical slice": "浏览器 WebGL 垂直切片",
    "Trade, mine, fight pirates, dock at stations, and explore six frontier systems plus PTD Home.": "贸易、采矿、迎战海盗、停靠空间站，并探索六大前线星系 + PTD Home 专用据点。",
    "New Game": "新游戏",
    "Continue": "继续",
    "Settings": "设置",
    "Credits": "制作人员",
    "Paused": "已暂停",
    "Flight Suspended": "飞行暂停",
    "Systems are stable. Save before risky jumps or bounty contracts.": "系统稳定。高风险跃迁或赏金合约前请先保存。",
    "Resume": "继续飞行",
    "Quick Save": "快速保存",
    "Reload Latest": "重新载入最新存档",
    "Main Menu": "主菜单",
    "Hull Failure": "船体失效",
    "Game Over": "游戏结束",
    "Your ship broke apart under fire. Reload a browser save or start over from Helion Reach.": "你的飞船在炮火下解体。重新载入浏览器存档，或从 Helion Reach 重新开始。",
    "Reload Save": "载入存档",
    "Pilot Preferences": "飞行员偏好",
    "Original Prototype": "原创原型",
    "Keyboard and mouse controls are active in flight. Click the 3D view once to capture mouse movement.": "飞行中启用键盘和鼠标控制。点击一次 3D 视图即可捕获鼠标移动。",
    "Master": "主音量",
    "SFX": "音效",
    "Music": "音乐",
    "Voice": "语音",
    "Mute audio": "静音",
    "Mute when unfocused": "失去焦点后静音",
    "GOF2 by pzy is an original browser-playable space trading/combat prototype built with React, TypeScript, Three.js, and generated project art.": "GOF2 by pzy 是一个可在浏览器中游玩的原创太空贸易/战斗原型，使用 React、TypeScript、Three.js 和项目生成美术构建。",
    "No copyrighted external image packs are included.": "不包含受版权保护的外部图片包。",
    "Back": "返回",
    "Load Game": "载入游戏",
    "Save Slots": "存档槽",
    "Empty slot": "空槽位",
    "Unknown time": "未知时间",
    "Save": "保存",
    "Load": "载入",
    "Delete": "删除",
    "Market": "市场",
    "Hangar": "机库",
    "Shipyard": "船坞",
    "Captain's Log": "舰长日志",
    "Blueprint Workshop": "蓝图工坊",
    "Lounge": "休息区",
    "Galaxy Map": "星图",
    "Auto-save writes to Auto / Quick Slot": "自动存档写入自动 / 快速槽位",
    "Launch": "发射",
    "Commodities": "商品",
    "Equipment": "装备",
    "Buy": "购买",
    "Sell": "出售",
    "Current Ship": "当前飞船",
    "Installed Equipment": "已安装装备",
    "Inventory": "库存",
    "Repair Hull and Refill Missiles": "修复船体并补充导弹",
    "Unload": "卸载",
    "Install": "安装",
    "All": "全部",
    "No spare equipment in inventory.": "库存中没有备用装备。",
    "Purchased ships transfer your active hull into secure storage at PTD Home. Stored ships can be switched there for free.": "购买新船会把当前船体转入 PTD Home 的安全仓储。在那里可免费切换已存放飞船。",
    "Current": "当前",
    "Switch Free": "免费切换",
    "Owned": "已拥有",
    "Confirm Purchase": "确认购买",
    "Default loadout": "默认配置",
    "Slot layout": "槽位布局",
    "Storage station": "仓储空间站",
    "Cancel": "取消",
    "Confirm Buy": "确认购买",
    "Reputation": "声望",
    "Mission already active.": "任务已在进行中。",
    "Mission Board": "任务板",
    "First Flight": "首次飞行",
    "Flight Checklist Complete": "飞行清单完成",
    "First reversal complete. Next: Kuro Resonance, Economy, or Quiet Signals.": "首次反转完成。下一步可继续 Kuro Resonance、经济调度或静默信号。",
    "First Flight Complete": "首次飞行完成",
    "Collapse": "收起",
    "Expand": "展开",
    "Open Board": "打开任务板",
    "Open Map": "打开星图",
    "Open Log": "打开日志",
    "Open Economy": "打开经济",
    "Open Lounge": "打开休息区",
    "Open Workshop": "打开工坊",
    "Open Shipyard": "打开船坞",
    "Next Up": "下一步",
    "Recommended Route": "推荐路线",
    "Best next step": "当前最值得做",
    "Reason": "原因",
    "Target station is not reachable yet. Scan local beacons or advance Quiet Signals first.": "目标空间站尚不可达。请先扫描本地信标，或推进 Quiet Signals。",
    "Move clear of the launch vector and get used to steering.": "离开发射航线，并熟悉转向。",
    "Dock at Helion": "停靠 Helion",
    "Approach Helion Prime Exchange and press F when the dock prompt appears.": "接近 Helion Prime Exchange，在停靠提示出现时按 F。",
    "Accept Clean Carrier": "接取 Clean Carrier",
    "Open the Mission Board and accept Glass Wake 01: Clean Carrier.": "打开任务板并接取 Glass Wake 01: Clean Carrier。",
    "Dock at Helion Prime Exchange; the board will auto-accept Glass Wake 01: Clean Carrier.": "停靠 Helion Prime Exchange；任务板会自动接取 Glass Wake 01: Clean Carrier。",
    "Set the Mirr Route": "设置 Mirr 航线",
    "Set a route to Mirr Lattice from the mission card or Galaxy Map.": "从任务卡或星图设置前往 Mirr Lattice 的航线。",
    "Launch for Mirr": "发射前往 Mirr",
    "Launch with Clean Carrier active and follow the plotted route.": "在 Clean Carrier 已接取时发射，并跟随已规划航线。",
    "Dock at Mirr Lattice": "停靠 Mirr Lattice",
    "Reach Mirr Vale and dock at Mirr Lattice.": "抵达 Mirr Vale 并停靠 Mirr Lattice。",
    "Complete the Delivery": "完成交付",
    "Complete Clean Carrier at Mirr Lattice to unlock the probe recovery lead.": "在 Mirr Lattice 完成 Clean Carrier，解锁探针回收线索。",
    "Dock at Mirr Lattice; the delivery will auto-complete and unlock the probe recovery lead.": "停靠 Mirr Lattice；交付会自动完成，并解锁探针回收线索。",
    "Accept Probe in the Glass": "接取 Probe in the Glass",
    "Accept Glass Wake 02 from Mirr Lattice and launch toward the debris field.": "在 Mirr Lattice 接取 Glass Wake 02，并发射前往残骸场。",
    "Stay at Mirr Lattice while Glass Wake 02 auto-accepts, then launch toward the debris field.": "留在 Mirr Lattice 等待 Glass Wake 02 自动接取，然后发射前往残骸场。",
    "Clear the Glass Echo": "清除 Glass Echo",
    "Destroy the Glass Echo Drone guarding the probe wreck.": "摧毁守卫探针残骸的 Glass Echo Drone。",
    "Defeat Glass Echo Prime": "击败 Glass Echo Prime",
    "Break the Prime signal after it wakes behind the first drone.": "在首个无人机之后唤醒的 Prime 信号，将其击破。",
    "Recover the Probe Core": "回收探针核心",
    "Collect the Glass Wake Probe Core from the debris field.": "从残骸场收集 Glass Wake Probe Core。",
    "Debrief at Mirr Lattice": "在 Mirr Lattice 复盘",
    "Return to Mirr Lattice and complete Glass Wake 02 for the first story reversal.": "返回 Mirr Lattice 并完成 Glass Wake 02，触发首次剧情反转。",
    "Return to Mirr Lattice; Glass Wake 02 will auto-complete for the first story reversal.": "返回 Mirr Lattice；Glass Wake 02 会自动完成并触发首次剧情反转。",
    "Recommended first contract": "推荐首个合约",
    "Accept Clean Carrier to learn delivery, routing, and station completion.": "接取 Clean Carrier，学习交付、航线和空间站完成流程。",
    "Clean Carrier auto-accepts when you dock here; use this board as a fallback.": "停靠这里时 Clean Carrier 会自动接取；这个任务板作为兜底入口。",
    "Select Mirr Lattice and press Set Route to continue Clean Carrier.": "选择 Mirr Lattice 并点击设置航线，继续 Clean Carrier。",
    "Main Story": "主线",
    "Market Gap": "市场缺口",
    "Reward": "奖励",
    "Time": "时间",
    "Failure": "失败",
    "Provided cargo": "提供货物",
    "Required cargo": "所需货物",
    "consumed": "会消耗",
    "Passengers occupy": "乘客占用",
    "cargo space.": "货舱空间。",
    "Escort hull": "护航船体",
    "arrived": "已抵达",
    "Recovery target": "回收目标",
    "recovered": "已回收",
    "Field objective": "现场目标",
    "Story targets": "剧情目标",
    "Story targets clear": "剧情目标已清除",
    "Requires": "需要",
    "Complete": "完成",
    "Accept": "接受",
    "Current Objective": "当前目标",
    "chapters complete": "章节完成",
    "Field Intelligence": "现场情报",
    "Epilogue": "尾声",
    "Chapter": "章节",
    "Signal masked. Complete prior protocol entries to resolve this trace.": "信号被遮蔽。完成前序协议条目以解析这条痕迹。",
    "Reveal": "揭示",
    "Exploration Archive": "探索档案",
    "Quiet Signals": "静默信号",
    "Chain reward": "链路奖励",
    "Hidden content unlocked": "隐藏内容已解锁",
    "signals resolved.": "个信号已解析。",
    "Chain resolved.": "链路已解析。",
    "Next trace locked behind a prior signal.": "下一条痕迹被前序信号锁定。",
    "No exploration logs recovered.": "尚未回收探索日志。",
    "Field intelligence": "现场情报",
    "Comms Archive": "通讯档案",
    "Voiced Dialogue": "语音对白",
    "Unlocked": "已解锁",
    "Available": "可用",
    "Replay": "重放",
    "Research unlocks fabrication rights. Markets and NPC drops still provide physical equipment without requiring blueprints.": "研究会解锁制造权限。市场和 NPC 掉落仍可提供实体装备，无需蓝图。",
    "Filter blueprint path": "筛选蓝图路线",
    "All Paths": "全部路线",
    "Craftable": "可制造",
    "Researchable": "可研究",
    "Locked": "已锁定",
    "Installed": "已安装",
    "Research": "研究",
    "Craft": "制造",
    "Added to equipment inventory after fabrication.": "制造完成后加入装备库存。",
    "No critical station shortages on the public sheet.": "公共清单上没有关键空间站短缺。",
    "Favored live routes": "热门实时航线",
    "Legal Status": "执法状态",
    "Wanted Heat": "悬赏热度",
    "Heat": "热度",
    "Clear": "清白",
    "Watched": "观察名单",
    "Wanted": "通缉",
    "Kill-on-sight": "见即击毁",
    "Fine": "罚款",
    "Outstanding fine": "未缴罚款",
    "Pay Fine": "缴纳罚款",
    "Faction Consequences": "Faction 后果",
    "Friendly fire warning": "误伤警告",
    "Civilian fire violation": "平民火力违规",
    "Security assault": "袭击安保",
    "Civilian vessel destroyed": "平民船只被击毁",
    "Patrol vessel destroyed": "巡逻船被击毁",
    "Contraband citation": "违禁品处罚",
    "Contraband pursuit": "违禁品追捕",
    "Bounty paid": "赏金到账",
    "Fine paid": "罚款已缴",
    "DISTRESS": "求救",
    "Distress call": "求救呼叫",
    "Under attack": "遭受攻击",
    "Responding to distress": "响应求救",
    "Civilian distress": "平民求救",
    "Patrol support wing responding to distress.": "巡逻支援翼正在响应求救。",
    "Watch": "观看",
    "Watching": "正在观看",
    "Cockpit": "驾驶舱",
    "Chase": "追尾",
    "Belt depleted": "矿带耗尽",
    "Mouse look": "鼠标观察",
    "Esc Return": "Esc 返回",
    "Touch flight controls": "触控飞行控制",
    "Landscape flight recommended": "建议横屏飞行",
    "Throttle and roll": "节流与滚转",
    "Look and steer": "观察与转向",
    "Flight toggles": "飞行开关",
    "Weapons and systems": "武器与系统",
    "Interact": "交互",
    "Cycle target": "切换目标",
    "Open map": "打开地图",
    "Fire primary weapon": "主武器开火",
    "Fire secondary weapon": "副武器开火",
    "Toggle camera": "切换镜头",
    "Zoom out": "缩小",
    "Zoom in": "放大",
    "NPC signal lost.": "NPC 信号丢失。",
    "Returned from NPC watch.": "已退出 NPC 观看。",
    "Contract timers use shipboard time, so they keep moving while docked or browsing the map.": "合约计时使用舰载时间，因此停靠或浏览星图时仍会推进。",
    "Reset View": "重置视图",
    "Return": "返回",
    "Unknown Signal": "未知信号",
    "Unknown Beacon": "未知信标",
    "Masked Signal": "遮蔽信号",
    "Locked Signal": "锁定信号",
    "Resolved": "已解析",
    "Discovered": "已发现",
    "Destination": "目的地",
    "Select a scanned planet beacon": "选择已扫描的行星信标",
    "Signal masked": "信号被遮蔽",
    "Stargate Link": "星门链路",
    "Route Planning": "航线规划",
    "Navigation Browse": "导航浏览",
    "Autopilot Active": "自动导航已启动",
    "Current Station": "当前空间站",
    "Activate Jump": "启动跃迁",
    "Set Route": "设置航线",
    "Browse Only": "仅浏览",
    "Select a scanned planet station to jump from the active Stargate.": "选择已扫描的行星空间站，从当前星门跃迁。",
    "Select a scanned planet station to launch a route through the jump engine.": "选择已扫描的行星空间站，通过跃迁引擎启动航线。",
    "Mouse wheel zooms. Drag empty space to pan. Unknown beacons unlock through local flight scans.": "滚轮缩放。拖拽空白区域平移。未知信标通过本地飞行扫描解锁。",
    "GOF2 by pzy": "GOF2 by pzy",
    "Hull": "船体",
    "Shield": "护盾",
    "Energy": "能量",
    "Cargo": "货舱",
    "Missiles": "导弹",
    "Throttle": "节流阀",
    "Speed": "速度",
    "Autopilot": "自动导航",
    "Local space clear": "本地空域清空",
    "No target": "无目标",
    "Tab cycles pirates. Left mouse fires. Hold fire near asteroids to mine.": "Tab 切换海盗目标。鼠标左键开火。靠近小行星时持续开火可采矿。",
    "Active Missions": "活动任务",
    "No active contracts.": "没有活动合约。",
    "Mining vein": "矿脉",
    "Detected vein": "探测到矿脉",
    "Comms": "通讯",
    "Map": "地图",
    "Pause": "暂停",
    "Frequency Scan": "频率扫描",
    "Cancel scan (Esc)": "取消扫描（Esc）",
    "Signal frequency": "信号频率",
    "LOCKED": "已锁定",
    "TUNING": "调谐中",
    "Voice paused": "语音已暂停",
    "Voice playing": "语音播放中",
    "Voice ready": "语音就绪",
    "Voice unavailable": "语音不可用",
    "Voice needs manual play": "需要手动播放",
    "Play/Pause": "播放/暂停",
    "Replay Voice": "重放语音",
    "Dialogue Back": "上一句",
    "Done": "完成",
    "Next": "下一句",
    "Skip": "跳过",
    "Close dialogue": "关闭对白",
    "Dialogue transcript": "对白记录",
    "Glass Wake Protocol": "Glass Wake 协议",
    "Signal source missing from mission registry.": "任务注册表中缺少信号来源。",
    "Complete prior protocol entries to resolve the next trace.": "完成前序协议条目以解析下一条痕迹。",
    "Protocol complete. Glass Wake is quiet for now.": "协议完成。Glass Wake 暂时沉寂。",
    "Risk": "风险",
    "Known": "已知",
    "known": "已知",
    "locked": "已锁定",
    "Uncharted": "未测绘",
    "planets": "行星",
    "exploration signals": "探索信号",
    "Local scan required": "需要本地扫描",
    "Hidden Station Found": "已发现隐藏空间站",
    "Exploration Signals": "探索信号",
    "Follow the prior Quiet Signal stage": "跟进前序静默信号阶段",
    "A faint jump signature sits beyond current registry data.": "当前注册数据之外有微弱跃迁特征。",
    "Station": "空间站",
    "equipment details": "装备详情",
    "Close equipment details": "关闭装备详情",
    "Slot": "槽位",
    "slot": "槽位",
    "used": "已用",
    "Compare": "对比",
    "Replace Preview": "替换预览",
    "Installed Baseline": "已安装基线",
    "Install Preview": "安装预览",
    "No projected stat change for the current hull.": "当前船体没有预计属性变化。",
    "Not stocked at this station": "本站没有库存",
    "Out of stock": "库存不足",
    "Equipment slots": "装备槽位",
    "Filter equipment inventory": "筛选装备库存",
    "Slots": "槽位",
    "purchase": "购买",
    "Stored at": "存放于",
    "Tier": "阶级",
    "Starter research": "初始研究",
    "Unlock": "解锁",
    "No blueprint data.": "没有蓝图数据。",
    "Hidden Arsenal / Exclusive": "隐藏军火库 / 独家",
    "Hidden Arsenal exclusive": "隐藏军火库独家",
    "Exclusive hidden arsenal item.": "隐藏军火库独家物品。",
    "yes": "是",
    "no": "否",
    "offline": "离线",
    "connected": "已连接",
    "HIGH": "高",
    "MEDIUM": "中",
    "LOW": "低",
    "Starter scout": "初始侦察舰",
    "Cargo hauler": "货运船",
    "Industrial mining skiff": "工业采矿艇",
    "Low-signature smuggling courier": "低信号走私快递船",
    "Strike fighter": "突击战斗机",
    "Deep signal explorer": "深层信号探索舰",
    "Light fighter": "轻型战斗机",
    "Heavy gunship": "重型炮艇",
    "Late-game balanced explorer": "后期均衡探索舰",
    "Career": "职业",
    "Trait": "特性",
    "Requirement": "购买门槛",
    "Starter": "新手",
    "Hauler": "货运",
    "Miner": "矿工",
    "Smuggler": "走私",
    "Fighter": "战斗",
    "Gunship": "炮艇",
    "Explorer": "探索",
    "Career: scout, starter bounties, light exploration": "定位：侦察、初始赏金、轻度探索",
    "Career: trade routes, mining support, cargo contracts": "定位：贸易航线、采矿支援、货运合约",
    "Career: mining, ore processing, industrial extraction": "定位：采矿、矿石处理、工业采掘",
    "Career: smuggling, fast courier work, heat management": "定位：走私、快速快递、热度管理",
    "Career: bounty hunting, strike combat, escort interception": "定位：赏金猎杀、突击战斗、护航拦截",
    "Career: deep exploration, signal work, recovery sweeps": "定位：深层探索、信号作业、回收扫描",
    "Career: bounty hunting, fast interception, light combat": "定位：赏金猎杀、快速拦截、轻型战斗",
    "Career: heavy combat, escort duty, hostile lanes": "定位：重型战斗、护航任务、敌对航道",
    "Career: late-game exploration, hybrid trade, advanced systems": "定位：后期探索、混合贸易、高级系统",
    "Recommended blueprints: Exploration Systems + starter Combat": "推荐蓝图：探索系统 + 初始战斗",
    "Recommended blueprints: Engineering & Trade + Exploration Systems": "推荐蓝图：工程与贸易 + 探索系统",
    "Recommended blueprints: Mining Beam -> Industrial Mining Beam -> Ore Processor": "推荐蓝图：采矿光束 -> 工业采矿光束 -> 矿石处理器",
    "Recommended blueprints: Cargo Expansion -> Shielded Holds -> Decoy Transponder": "推荐蓝图：货舱扩展 -> 屏蔽货舱 -> 诱饵应答器",
    "Recommended blueprints: Plasma Cannon + Targeting Computer -> Weapon Amplifier": "推荐蓝图：等离子炮 + 瞄准计算机 -> 武器放大器",
    "Recommended blueprints: Scanner -> Survey Array -> Survey Lab": "推荐蓝图：扫描器 -> 勘测阵列 -> 勘测实验室",
    "Recommended blueprints: Combat Systems + Engineering fire-control": "推荐蓝图：战斗系统 + 工程火控",
    "Recommended blueprints: Defense Systems + heavy Combat": "推荐蓝图：防御系统 + 重型战斗",
    "Recommended blueprints: Exploration Systems + Engineering & Trade": "推荐蓝图：探索系统 + 工程与贸易",
    "Oreline Stabilizers": "矿脉稳定器",
    "Mining progress +20% and mining energy drain -15%.": "采矿进度 +20%，采矿能耗 -15%。",
    "Cold Registry": "冷注册表",
    "Contraband scan progress x0.70.": "违禁品扫描进度 x0.70。",
    "Overtuned Bus": "过载总线",
    "Weapon damage +8% and weapon energy cost +6%.": "武器伤害 +8%，武器能耗 +6%。",
    "Deep Survey Spine": "深层勘测脊柱",
    "Quiet Signal scan rate +12% and loot/salvage range +60m.": "Quiet Signal 扫描速率 +12%，拾取/回收范围 +60m。",
    "Horizon Survey Suite": "地平线勘测套件",
    "Quiet Signal scan range +80m, scan rate +15%, and loot/salvage range +80m.": "Quiet Signal 扫描范围 +80m，扫描速率 +15%，拾取/回收范围 +80m。",
    "Combat Systems": "战斗系统",
    "Defense Systems": "防御系统",
    "Exploration Systems": "探索系统",
    "Engineering & Trade": "工程与贸易"
  },
  "zh-TW": {
    "Browser WebGL vertical slice": "瀏覽器 WebGL 垂直切片",
    "Trade, mine, fight pirates, dock at stations, and explore six frontier systems plus PTD Home.": "貿易、採礦、迎戰海盜、停靠太空站，並探索六大前線星系 + PTD Home 專用據點。",
    "Voice needs manual play": "需要手動播放",
    "Mute when unfocused": "失去焦點後靜音",
    "Dialogue Back": "上一句",
    "Next Up": "下一步",
    "Recommended Route": "推薦路線",
    "Best next step": "目前最值得做",
    "Reason": "原因",
    "Open Log": "開啟日誌",
    "Open Economy": "開啟經濟",
    "Open Lounge": "開啟休息區",
    "Open Workshop": "開啟工坊",
    "Open Shipyard": "開啟船塢",
    "Target station is not reachable yet. Scan local beacons or advance Quiet Signals first.": "目標太空站尚不可達。請先掃描本地信標，或推進 Quiet Signals。"
  },
  ja: {
    "Browser WebGL vertical slice": "ブラウザ WebGL 縦切り版",
    "Trade, mine, fight pirates, dock at stations, and explore six frontier systems plus PTD Home.": "交易、採掘、海賊戦、ステーション寄港をこなし、6つの辺境星系と専用拠点 PTD Home を探索します。",
    "New Game": "ニューゲーム",
    "Continue": "続ける",
    "Settings": "設定",
    "Mute when unfocused": "フォーカス喪失時にミュート",
    "Credits": "クレジット",
    "Language": "言語",
    "Hull": "船体",
    "Shield": "シールド",
    "Energy": "エネルギー",
    "Launch": "発進",
    "Save": "保存",
    "Pause": "一時停止",
    "Market": "マーケット",
    "Hangar": "ハンガー",
    "Mission Board": "ミッションボード",
    "First Flight": "初飛行",
    "Flight Checklist Complete": "飛行チェックリスト完了",
    "First reversal complete. Next: Kuro Resonance, Economy, or Quiet Signals.": "最初の反転完了。次は Kuro Resonance、経済、または Quiet Signals へ。",
    "Collapse": "折りたたむ",
    "Expand": "展開",
    "Open Board": "ボードを開く",
    "Open Map": "マップを開く",
    "Open Log": "ログを開く",
    "Open Economy": "経済を開く",
    "Open Lounge": "ラウンジを開く",
    "Open Workshop": "工房を開く",
    "Open Shipyard": "造船所を開く",
    "Next Up": "次の一手",
    "Recommended Route": "推奨ルート",
    "Best next step": "今の最優先",
    "Reason": "理由",
    "Target station is not reachable yet. Scan local beacons or advance Quiet Signals first.": "目標ステーションはまだ到達不能です。先にローカルビーコンをスキャンするか、Quiet Signals を進めてください。",
    "Galaxy Map": "銀河マップ",
    "Back": "戻る",
    "Load Game": "ゲームをロード",
    "Save Slots": "セーブスロット",
    "Empty slot": "空きスロット",
    "Buy": "購入",
    "Sell": "売却",
    "Accept": "受諾",
    "Complete": "完了",
    "Move clear of the launch vector and get used to steering.": "発進ベクトルから離れ、操縦に慣れる。",
    "Dock at Helion": "Helion にドック",
    "Approach Helion Prime Exchange and press F when the dock prompt appears.": "Helion Prime Exchange に接近し、ドック表示が出たら F を押す。",
    "Accept Clean Carrier": "Clean Carrier を受諾",
    "Open the Mission Board and accept Glass Wake 01: Clean Carrier.": "ミッションボードを開き、Glass Wake 01: Clean Carrier を受諾する。",
    "Dock at Helion Prime Exchange; the board will auto-accept Glass Wake 01: Clean Carrier.": "Helion Prime Exchange にドックすると、ボードが Glass Wake 01: Clean Carrier を自動受諾する。",
    "Set the Mirr Route": "Mirr ルート設定",
    "Set a route to Mirr Lattice from the mission card or Galaxy Map.": "ミッションカードまたは銀河マップから Mirr Lattice へのルートを設定する。",
    "Launch for Mirr": "Mirr へ発進",
    "Launch with Clean Carrier active and follow the plotted route.": "Clean Carrier を有効にしたまま発進し、設定ルートを進む。",
    "Dock at Mirr Lattice": "Mirr Lattice にドック",
    "Reach Mirr Vale and dock at Mirr Lattice.": "Mirr Vale に到達し、Mirr Lattice にドックする。",
    "Complete the Delivery": "配送完了",
    "Complete Clean Carrier at Mirr Lattice to unlock the probe recovery lead.": "Mirr Lattice で Clean Carrier を完了し、探査機回収の手掛かりを解放する。",
    "Dock at Mirr Lattice; the delivery will auto-complete and unlock the probe recovery lead.": "Mirr Lattice にドックすると配送が自動完了し、探査機回収の手掛かりが解放される。",
    "Accept Probe in the Glass": "Probe in the Glass を受諾",
    "Accept Glass Wake 02 from Mirr Lattice and launch toward the debris field.": "Mirr Lattice で Glass Wake 02 を受諾し、残骸域へ発進する。",
    "Stay at Mirr Lattice while Glass Wake 02 auto-accepts, then launch toward the debris field.": "Glass Wake 02 が自動受諾されるまで Mirr Lattice に留まり、その後残骸域へ発進する。",
    "Clear the Glass Echo": "Glass Echo を排除",
    "Destroy the Glass Echo Drone guarding the probe wreck.": "探査機残骸を守る Glass Echo Drone を破壊する。",
    "Defeat Glass Echo Prime": "Glass Echo Prime を撃破",
    "Break the Prime signal after it wakes behind the first drone.": "最初のドローンの背後で目覚めた Prime 信号を破壊する。",
    "Recover the Probe Core": "探査機コアを回収",
    "Collect the Glass Wake Probe Core from the debris field.": "残骸域から Glass Wake Probe Core を回収する。",
    "Debrief at Mirr Lattice": "Mirr Lattice でデブリーフ",
    "Return to Mirr Lattice and complete Glass Wake 02 for the first story reversal.": "Mirr Lattice に戻り、Glass Wake 02 を完了して最初の反転を確認する。",
    "Return to Mirr Lattice; Glass Wake 02 will auto-complete for the first story reversal.": "Mirr Lattice に戻ると、Glass Wake 02 が自動完了して最初の反転が始まる。",
    "Recommended first contract": "最初のおすすめ契約",
    "Accept Clean Carrier to learn delivery, routing, and station completion.": "Clean Carrier で配送、ルート設定、ステーション完了を学ぶ。",
    "Clean Carrier auto-accepts when you dock here; use this board as a fallback.": "ここにドックすると Clean Carrier は自動受諾される。このボードは予備の入口として使える。",
    "Select Mirr Lattice and press Set Route to continue Clean Carrier.": "Mirr Lattice を選び、ルート設定で Clean Carrier を続ける。",
    "Cancel": "キャンセル",
    "Resume": "再開",
    "Main Menu": "メインメニュー",
    "Game Over": "ゲームオーバー",
    "No target": "ターゲットなし",
    "Active Missions": "進行中ミッション",
    "Comms": "通信",
    "Route Planning": "ルート計画",
    "Set Route": "ルート設定",
    "Voice ready": "音声準備完了",
    "Voice needs manual play": "手動再生が必要",
    "Dialogue Back": "前へ",
    "Next": "次へ",
    "Done": "完了",
    "Skip": "スキップ",
    "Close dialogue": "対話を閉じる",
    "Dialogue transcript": "対話履歴",
    "Risk": "リスク",
    "Known": "既知",
    "known": "既知",
    "locked": "ロック中",
    "Station": "ステーション",
    "Equipment slots": "装備スロット",
    "Slot": "スロット",
    "slot": "スロット",
    "used": "使用中",
    "Compare": "比較",
    "Out of stock": "在庫なし",
    "Not stocked at this station": "このステーションでは未入荷",
    "Local scan required": "ローカルスキャンが必要",
    "Exploration Signals": "探索信号",
    "Quiet Signals": "静かな信号",
    "Chain reward": "チェーン報酬",
    "Hidden content unlocked": "隠しコンテンツ解除",
    "signals resolved.": "信号解決済み。",
    "planets": "惑星",
    "purchase": "購入",
    "Tier": "ティア",
    "Unlock": "解除",
    "yes": "はい",
    "no": "いいえ",
    "offline": "オフライン",
    "HIGH": "高",
    "MEDIUM": "中",
    "LOW": "低",
    "All Paths": "すべての系統",
    "Industrial mining skiff": "産業採掘艇",
    "Low-signature smuggling courier": "低シグネチャ密輸輸送船",
    "Strike fighter": "打撃戦闘機",
    "Deep signal explorer": "深層信号探索船",
    "Career": "職業",
    "Trait": "特性",
    "Requirement": "要件",
    "Starter": "スターター",
    "Hauler": "貨物船",
    "Miner": "採掘",
    "Smuggler": "密輸",
    "Fighter": "戦闘機",
    "Gunship": "ガンシップ",
    "Explorer": "探索",
    "Oreline Stabilizers": "鉱脈スタビライザー",
    "Mining progress +20% and mining energy drain -15%.": "採掘進行 +20%、採掘エネルギー消費 -15%。",
    "Cold Registry": "コールド登録",
    "Contraband scan progress x0.70.": "禁制品スキャン進行 x0.70。",
    "Overtuned Bus": "過調整バス",
    "Weapon damage +8% and weapon energy cost +6%.": "武器ダメージ +8%、武器エネルギー消費 +6%。",
    "Deep Survey Spine": "深層調査スパイン",
    "Quiet Signal scan rate +12% and loot/salvage range +60m.": "Quiet Signal スキャン速度 +12%、回収範囲 +60m。",
    "Horizon Survey Suite": "ホライゾン調査スイート",
    "Quiet Signal scan range +80m, scan rate +15%, and loot/salvage range +80m.": "Quiet Signal スキャン範囲 +80m、速度 +15%、回収範囲 +80m。",
    "Combat Systems": "戦闘システム",
    "Defense Systems": "防御システム",
    "Exploration Systems": "探索システム",
    "Watch": "観察",
    "Watching": "観察中",
    "DISTRESS": "救難",
    "Distress call": "救難通信",
    "Under attack": "攻撃中",
    "Responding to distress": "救難対応中",
    "Civilian distress": "民間船救難",
    "Patrol support wing responding to distress.": "巡回支援翼が救難に対応中。",
    "Cockpit": "コックピット",
    "Chase": "追尾",
    "Belt depleted": "鉱脈枯渇",
    "Mouse look": "マウス視点",
    "Esc Return": "Esc 戻る",
    "Touch flight controls": "タッチ飛行コントロール",
    "Landscape flight recommended": "横画面での飛行推奨",
    "Throttle and roll": "スロットルとロール",
    "Look and steer": "視点と操舵",
    "Flight toggles": "飛行切替",
    "Weapons and systems": "武器とシステム",
    "Interact": "インタラクト",
    "Cycle target": "ターゲット切替",
    "Open map": "マップを開く",
    "Fire primary weapon": "主武器発射",
    "Fire secondary weapon": "副武器発射",
    "Toggle camera": "カメラ切替",
    "Zoom out": "縮小",
    "Zoom in": "拡大",
    "NPC signal lost.": "NPC信号をロスト。",
    "Returned from NPC watch.": "NPC観察を終了しました。",
    "Engineering & Trade": "工学と交易"
  },
  fr: {
    "Browser WebGL vertical slice": "Tranche verticale WebGL navigateur",
    "Trade, mine, fight pirates, dock at stations, and explore six frontier systems plus PTD Home.": "Commercez, minez, combattez des pirates, amarrez-vous aux stations et explorez six systèmes frontaliers plus la base dédiée PTD Home.",
    "New Game": "Nouvelle partie",
    "Continue": "Continuer",
    "Settings": "Paramètres",
    "Mute when unfocused": "Muet hors focus",
    "Credits": "Crédits",
    "Language": "Langue",
    "Hull": "Coque",
    "Shield": "Bouclier",
    "Energy": "Énergie",
    "Launch": "Décoller",
    "Save": "Sauvegarder",
    "Pause": "Pause",
    "Market": "Marché",
    "Hangar": "Hangar",
    "Mission Board": "Tableau des missions",
    "First Flight": "Premier vol",
    "Flight Checklist Complete": "Checklist de vol terminee",
    "First reversal complete. Next: Kuro Resonance, Economy, or Quiet Signals.": "Premiere inversion terminee. Ensuite: Kuro Resonance, Economie ou Quiet Signals.",
    "Collapse": "Replier",
    "Expand": "Deplier",
    "Open Board": "Ouvrir tableau",
    "Open Map": "Ouvrir carte",
    "Open Log": "Ouvrir journal",
    "Open Economy": "Ouvrir economie",
    "Open Lounge": "Ouvrir salon",
    "Open Workshop": "Ouvrir atelier",
    "Open Shipyard": "Ouvrir chantier",
    "Next Up": "Suite",
    "Recommended Route": "Route recommandee",
    "Best next step": "Meilleure prochaine etape",
    "Reason": "Raison",
    "Target station is not reachable yet. Scan local beacons or advance Quiet Signals first.": "La station cible n'est pas encore accessible. Scannez les balises locales ou avancez Quiet Signals d'abord.",
    "Galaxy Map": "Carte galactique",
    "Back": "Retour",
    "Load Game": "Charger",
    "Save Slots": "Emplacements",
    "Empty slot": "Emplacement vide",
    "Buy": "Acheter",
    "Sell": "Vendre",
    "Accept": "Accepter",
    "Complete": "Terminer",
    "Move clear of the launch vector and get used to steering.": "Quittez le vecteur de lancement et prenez en main le pilotage.",
    "Dock at Helion": "S'amarrer a Helion",
    "Approach Helion Prime Exchange and press F when the dock prompt appears.": "Approchez Helion Prime Exchange et appuyez sur F quand l'invite d'amarrage apparait.",
    "Accept Clean Carrier": "Accepter Clean Carrier",
    "Open the Mission Board and accept Glass Wake 01: Clean Carrier.": "Ouvrez le tableau des missions et acceptez Glass Wake 01: Clean Carrier.",
    "Dock at Helion Prime Exchange; the board will auto-accept Glass Wake 01: Clean Carrier.": "Amarrez-vous a Helion Prime Exchange ; le tableau acceptera automatiquement Glass Wake 01: Clean Carrier.",
    "Set the Mirr Route": "Definir la route Mirr",
    "Set a route to Mirr Lattice from the mission card or Galaxy Map.": "Definissez une route vers Mirr Lattice depuis la mission ou la carte galactique.",
    "Launch for Mirr": "Decoller vers Mirr",
    "Launch with Clean Carrier active and follow the plotted route.": "Decollez avec Clean Carrier actif et suivez la route tracee.",
    "Dock at Mirr Lattice": "S'amarrer a Mirr Lattice",
    "Reach Mirr Vale and dock at Mirr Lattice.": "Atteignez Mirr Vale et amarrez-vous a Mirr Lattice.",
    "Complete the Delivery": "Terminer la livraison",
    "Complete Clean Carrier at Mirr Lattice to unlock the probe recovery lead.": "Terminez Clean Carrier a Mirr Lattice pour ouvrir la piste de recuperation de la sonde.",
    "Dock at Mirr Lattice; the delivery will auto-complete and unlock the probe recovery lead.": "Amarrez-vous a Mirr Lattice ; la livraison se terminera automatiquement et ouvrira la piste de la sonde.",
    "Accept Probe in the Glass": "Accepter Probe in the Glass",
    "Accept Glass Wake 02 from Mirr Lattice and launch toward the debris field.": "Acceptez Glass Wake 02 a Mirr Lattice puis decollez vers le champ de debris.",
    "Stay at Mirr Lattice while Glass Wake 02 auto-accepts, then launch toward the debris field.": "Restez a Mirr Lattice pendant l'acceptation automatique de Glass Wake 02, puis decollez vers le champ de debris.",
    "Clear the Glass Echo": "Eliminer Glass Echo",
    "Destroy the Glass Echo Drone guarding the probe wreck.": "Detruisez le Glass Echo Drone qui garde l'epave de la sonde.",
    "Defeat Glass Echo Prime": "Vaincre Glass Echo Prime",
    "Break the Prime signal after it wakes behind the first drone.": "Brisez le signal Prime apres son reveil derriere le premier drone.",
    "Recover the Probe Core": "Recuperer le noyau de sonde",
    "Collect the Glass Wake Probe Core from the debris field.": "Recuperez le Glass Wake Probe Core dans le champ de debris.",
    "Debrief at Mirr Lattice": "Debriefing a Mirr Lattice",
    "Return to Mirr Lattice and complete Glass Wake 02 for the first story reversal.": "Revenez a Mirr Lattice et terminez Glass Wake 02 pour la premiere inversion narrative.",
    "Return to Mirr Lattice; Glass Wake 02 will auto-complete for the first story reversal.": "Revenez a Mirr Lattice ; Glass Wake 02 se terminera automatiquement pour la premiere inversion narrative.",
    "Recommended first contract": "Premier contrat recommande",
    "Accept Clean Carrier to learn delivery, routing, and station completion.": "Acceptez Clean Carrier pour apprendre livraison, route et validation en station.",
    "Clean Carrier auto-accepts when you dock here; use this board as a fallback.": "Clean Carrier s'accepte automatiquement a l'amarrage ici ; ce tableau reste une solution de secours.",
    "Select Mirr Lattice and press Set Route to continue Clean Carrier.": "Selectionnez Mirr Lattice puis Definir la route pour continuer Clean Carrier.",
    "Cancel": "Annuler",
    "Resume": "Reprendre",
    "Main Menu": "Menu principal",
    "Game Over": "Partie terminée",
    "No target": "Aucune cible",
    "Active Missions": "Missions actives",
    "Comms": "Communications",
    "Route Planning": "Planification",
    "Set Route": "Définir la route",
    "Voice ready": "Voix prête",
    "Voice needs manual play": "Lecture manuelle requise",
    "Dialogue Back": "Retour",
    "Next": "Suivant",
    "Done": "Terminé",
    "Skip": "Passer",
    "Close dialogue": "Fermer le dialogue",
    "Dialogue transcript": "Transcription du dialogue",
    "Risk": "Risque",
    "Known": "Connu",
    "known": "connu",
    "locked": "verrouillé",
    "Station": "Station",
    "Equipment slots": "Emplacements d'équipement",
    "Slot": "Emplacement",
    "slot": "emplacement",
    "used": "utilisé",
    "Compare": "Comparer",
    "Out of stock": "Rupture de stock",
    "Not stocked at this station": "Non stocké dans cette station",
    "Local scan required": "Scan local requis",
    "Exploration Signals": "Signaux d'exploration",
    "Quiet Signals": "Signaux discrets",
    "Chain reward": "Récompense de chaîne",
    "Hidden content unlocked": "Contenu caché déverrouillé",
    "signals resolved.": "signaux résolus.",
    "planets": "planètes",
    "purchase": "achat",
    "Tier": "Rang",
    "Unlock": "Déverrouiller",
    "yes": "oui",
    "no": "non",
    "offline": "hors ligne",
    "HIGH": "ÉLEVÉ",
    "MEDIUM": "MOYEN",
    "LOW": "FAIBLE",
    "All Paths": "Toutes les voies",
    "Industrial mining skiff": "Skiff minier industriel",
    "Low-signature smuggling courier": "Courrier de contrebande discret",
    "Strike fighter": "Chasseur d'attaque",
    "Deep signal explorer": "Explorateur de signaux profonds",
    "Career": "Carrière",
    "Trait": "Trait",
    "Requirement": "Prérequis",
    "Starter": "Départ",
    "Hauler": "Cargo",
    "Miner": "Mineur",
    "Smuggler": "Contrebandier",
    "Fighter": "Chasseur",
    "Gunship": "Canonnière",
    "Explorer": "Explorateur",
    "Oreline Stabilizers": "Stabilisateurs de filon",
    "Mining progress +20% and mining energy drain -15%.": "Progression minière +20 %, drain minier -15 %.",
    "Cold Registry": "Registre froid",
    "Contraband scan progress x0.70.": "Progression de scan de contrebande x0,70.",
    "Overtuned Bus": "Bus suraccordé",
    "Weapon damage +8% and weapon energy cost +6%.": "Dégâts d'armes +8 %, coût énergétique +6 %.",
    "Deep Survey Spine": "Épine de prospection profonde",
    "Quiet Signal scan rate +12% and loot/salvage range +60m.": "Vitesse Quiet Signal +12 %, portée butin/récupération +60 m.",
    "Horizon Survey Suite": "Suite de prospection Horizon",
    "Quiet Signal scan range +80m, scan rate +15%, and loot/salvage range +80m.": "Portée Quiet Signal +80 m, vitesse +15 %, portée butin/récupération +80 m.",
    "Combat Systems": "Systèmes de combat",
    "Defense Systems": "Systèmes de défense",
    "Exploration Systems": "Systèmes d'exploration",
    "Watch": "Observer",
    "Watching": "Observation",
    "DISTRESS": "DÉTRESSE",
    "Distress call": "Appel de détresse",
    "Under attack": "Sous attaque",
    "Responding to distress": "Réponse à la détresse",
    "Civilian distress": "Détresse civile",
    "Patrol support wing responding to distress.": "Aile de soutien de patrouille en réponse à la détresse.",
    "Cockpit": "Cockpit",
    "Chase": "Poursuite",
    "Belt depleted": "Ceinture épuisée",
    "Mouse look": "Vue souris",
    "Esc Return": "Esc retour",
    "Touch flight controls": "Commandes tactiles de vol",
    "Landscape flight recommended": "Vol conseillé en paysage",
    "Throttle and roll": "Poussée et roulis",
    "Look and steer": "Regarder et piloter",
    "Flight toggles": "Commandes de vol",
    "Weapons and systems": "Armes et systèmes",
    "Interact": "Interagir",
    "Cycle target": "Changer de cible",
    "Open map": "Ouvrir la carte",
    "Fire primary weapon": "Tirer arme principale",
    "Fire secondary weapon": "Tirer arme secondaire",
    "Toggle camera": "Changer de caméra",
    "Zoom out": "Dézoomer",
    "Zoom in": "Zoomer",
    "NPC signal lost.": "Signal PNJ perdu.",
    "Returned from NPC watch.": "Observation PNJ terminée.",
    "Engineering & Trade": "Ingénierie et commerce"
  }
} satisfies Partial<Record<Locale, Record<string, string>>>;

const zhTraditionalOverrides: Record<string, string> = {
  "语言": "語言",
  "选择语言": "選擇語言",
  "浏览器": "瀏覽器",
  "垂直切片": "垂直切片",
  "贸易": "貿易",
  "采矿": "採礦",
  "迎战": "迎戰",
  "空间站": "太空站",
  "星系": "星系",
  "边境": "邊境",
  "新游戏": "新遊戲",
  "继续": "繼續",
  "设置": "設定",
  "制作人员": "製作人員",
  "已暂停": "已暫停",
  "飞行": "飛行",
  "暂停": "暫停",
  "保存": "儲存",
  "载入": "載入",
  "存档": "存檔",
  "主菜单": "主選單",
  "船体": "船體",
  "游戏结束": "遊戲結束",
  "重新": "重新",
  "开始": "開始",
  "偏好": "偏好",
  "音效": "音效",
  "语音": "語音",
  "静音": "靜音",
  "返回": "返回",
  "空槽位": "空槽位",
  "未知": "未知",
  "删除": "刪除",
  "市场": "市場",
  "机库": "機庫",
  "船坞": "船塢",
  "任务": "任務",
  "日志": "日誌",
  "蓝图": "藍圖",
  "工坊": "工坊",
  "休息区": "休息區",
  "星图": "星圖",
  "自动": "自動",
  "发射": "發射",
  "商品": "商品",
  "装备": "裝備",
  "购买": "購買",
  "出售": "出售",
  "当前": "目前",
  "已安装": "已安裝",
  "库存": "庫存",
  "修复": "修復",
  "导弹": "飛彈",
  "卸载": "卸載",
  "安装": "安裝",
  "全部": "全部",
  "拥有": "擁有",
  "确认": "確認",
  "配置": "配置",
  "槽位": "槽位",
  "取消": "取消",
  "声望": "聲望",
  "主线": "主線",
  "奖励": "獎勵",
  "失败": "失敗",
  "货物": "貨物",
  "乘客": "乘客",
  "护航": "護航",
  "抵达": "抵達",
  "回收": "回收",
  "目标": "目標",
  "完成": "完成",
  "接受": "接受",
  "章节": "章節",
  "信号": "訊號",
  "遮蔽": "遮蔽",
  "探索": "探索",
  "通讯": "通訊",
  "重放": "重播",
  "研究": "研究",
  "制造": "製造",
  "锁定": "鎖定",
  "星门": "星門",
  "航线": "航線",
  "导航": "導航",
  "自动导航": "自動導航",
  "护盾": "護盾",
  "能量": "能量",
  "信用点": "信用點",
  "货舱": "貨艙",
  "节流阀": "節流閥",
  "速度": "速度"
};

const phraseGlossaries = {
  "zh-CN": [
    ["Tech Level", "科技等级"],
    ["Auto / Quick Slot", "自动 / 快速槽位"],
    ["Manual Slot", "手动槽位"],
    ["In flight", "飞行中"],
    ["Unknown system", "未知星系"],
    ["Credits", "信用点"],
    ["Cargo", "货舱"],
    ["Stock", "库存"],
    ["Demand", "需求"],
    ["Licensed", "许可"],
    ["Restricted", "受限"],
    ["Local law", "本地法律"],
    ["Primary Weapon", "主武器"],
    ["Secondary Weapon", "副武器"],
    ["Utility", "通用"],
    ["Defense", "防御"],
    ["Engineering", "工程"],
    ["Combat", "战斗"],
    ["Exploration", "探索"],
    ["Research", "研究"],
    ["Blueprint", "蓝图"],
    ["Standing", "声望等级"],
    ["Faction bonus", "阵营奖励"],
    ["Mission bonus", "任务奖励"],
    ["Repair discount", "修理折扣"],
    ["Repair surcharge", "修理加价"],
    ["Free", "免费"],
    ["Interdiction risk", "拦截风险"],
    ["Amnesty", "赎罪"],
    ["Broker Amnesty", "黑市赎罪"],
    ["Mission", "任务"],
    ["Story", "剧情"],
    ["Signal", "信号"],
    ["Station", "空间站"],
    ["Stargate", "星门"],
    ["Autopilot", "自动导航"],
    ["pirate", "海盗"],
    ["pirates", "海盗"],
    ["Local space clear", "本地空域清空"],
    ["Launch vector clear", "发射航向清空"],
    ["Flight systems online", "飞行系统上线"],
    ["Cargo hold full", "货舱已满"],
    ["Not enough credits", "信用点不足"],
    ["Equipment", "装备"],
    ["Installed", "已安装"],
    ["Inventory", "库存"],
    ["Unlocked", "已解锁"],
    ["Locked", "已锁定"],
    ["Available", "可用"],
    ["Allied", "同盟"],
    ["Friendly", "友好"],
    ["Neutral", "中立"],
    ["Hostile", "敌对"],
    ["Complete", "完成"],
    ["Accepted", "已接受"],
    ["Bought", "已购买"],
    ["Sold", "已出售"],
    ["Recovered", "已回收"],
    ["resolved", "已解析"],
    ["Scan", "扫描"],
    ["Tuning", "调谐"],
    ["Waypoint", "航点"],
    ["Dock", "停靠"],
    ["Activate", "启动"],
    ["Unknown", "未知"],
    ["None", "无"]
  ],
  "zh-TW": [],
  ja: [
    ["Tech Level", "技術レベル"],
    ["Auto / Quick Slot", "自動 / クイックスロット"],
    ["Manual Slot", "手動スロット"],
    ["In flight", "飛行中"],
    ["Unknown system", "未知の星系"],
    ["Credits", "クレジット"],
    ["Cargo", "貨物"],
    ["Stock", "在庫"],
    ["Demand", "需要"],
    ["Licensed", "許可済み"],
    ["Restricted", "制限品"],
    ["Local law", "現地法"],
    ["Primary Weapon", "主兵装"],
    ["Secondary Weapon", "副兵装"],
    ["Utility", "ユーティリティ"],
    ["Defense", "防御"],
    ["Engineering", "エンジニアリング"],
    ["Standing", "評価"],
    ["Faction bonus", "勢力ボーナス"],
    ["Mission bonus", "任務ボーナス"],
    ["Repair discount", "修理割引"],
    ["Repair surcharge", "修理割増"],
    ["Free", "無料"],
    ["Interdiction risk", "迎撃リスク"],
    ["Amnesty", "恩赦"],
    ["Broker Amnesty", "闇市場恩赦"],
    ["Mission", "ミッション"],
    ["Signal", "信号"],
    ["Station", "ステーション"],
    ["Stargate", "スターゲート"],
    ["Autopilot", "オートパイロット"],
    ["pirate", "海賊"],
    ["pirates", "海賊"],
    ["Launch vector clear", "発進ベクトル良好"],
    ["Flight systems online", "飛行システム起動"],
    ["Cargo hold full", "貨物室が満杯"],
    ["Not enough credits", "クレジット不足"],
    ["Equipment", "装備"],
    ["Installed", "装備中"],
    ["Inventory", "インベントリ"],
    ["Unlocked", "解除済み"],
    ["Locked", "ロック中"],
    ["Available", "利用可能"],
    ["Allied", "同盟"],
    ["Friendly", "友好"],
    ["Neutral", "中立"],
    ["Hostile", "敵対"],
    ["Complete", "完了"],
    ["Accepted", "受諾済み"],
    ["Bought", "購入済み"],
    ["Sold", "売却済み"],
    ["Recovered", "回収済み"],
    ["resolved", "解決済み"],
    ["Scan", "スキャン"],
    ["Waypoint", "ウェイポイント"],
    ["Dock", "ドック"],
    ["Activate", "起動"],
    ["Unknown", "未知"],
    ["None", "なし"]
  ],
  fr: [
    ["Tech Level", "Niveau tech"],
    ["Auto / Quick Slot", "Auto / rapide"],
    ["Manual Slot", "Emplacement manuel"],
    ["In flight", "En vol"],
    ["Unknown system", "Système inconnu"],
    ["Credits", "Crédits"],
    ["Cargo", "Cargaison"],
    ["Stock", "Stock"],
    ["Demand", "Demande"],
    ["Licensed", "Autorisé"],
    ["Restricted", "Restreint"],
    ["Local law", "Loi locale"],
    ["Primary Weapon", "Arme principale"],
    ["Secondary Weapon", "Arme secondaire"],
    ["Utility", "Utilitaire"],
    ["Defense", "Défense"],
    ["Engineering", "Ingénierie"],
    ["Standing", "Réputation"],
    ["Faction bonus", "Bonus de faction"],
    ["Mission bonus", "Bonus de mission"],
    ["Repair discount", "Remise réparation"],
    ["Repair surcharge", "Supplément réparation"],
    ["Free", "Gratuit"],
    ["Interdiction risk", "Risque d'interception"],
    ["Amnesty", "Amnistie"],
    ["Broker Amnesty", "Négocier amnistie"],
    ["Mission", "Mission"],
    ["Signal", "Signal"],
    ["Station", "Station"],
    ["Stargate", "Portail"],
    ["Autopilot", "Pilote auto"],
    ["pirate", "pirate"],
    ["pirates", "pirates"],
    ["Launch vector clear", "Vecteur de décollage dégagé"],
    ["Flight systems online", "Systèmes de vol en ligne"],
    ["Cargo hold full", "Soute pleine"],
    ["Not enough credits", "Crédits insuffisants"],
    ["Equipment", "Équipement"],
    ["Installed", "Installé"],
    ["Inventory", "Inventaire"],
    ["Unlocked", "Déverrouillé"],
    ["Locked", "Verrouillé"],
    ["Available", "Disponible"],
    ["Allied", "Allié"],
    ["Friendly", "Amical"],
    ["Neutral", "Neutre"],
    ["Hostile", "Hostile"],
    ["Complete", "Terminer"],
    ["Accepted", "Accepté"],
    ["Bought", "Acheté"],
    ["Sold", "Vendu"],
    ["Recovered", "Récupéré"],
    ["resolved", "résolu"],
    ["Scan", "Scanner"],
    ["Waypoint", "Point de route"],
    ["Dock", "S'amarrer"],
    ["Activate", "Activer"],
    ["Unknown", "Inconnu"],
    ["None", "Aucun"]
  ]
} satisfies Record<Exclude<Locale, "en">, Array<[string, string]>>;

type LocalizedCatalog = Record<string, Partial<Record<ContentLocale, string>>>;

const commodityNames: LocalizedCatalog = {
  "basic-food": { "zh-CN": "基础食品", ja: "基礎食料", fr: "Rations de base" },
  "drinking-water": { "zh-CN": "饮用水", ja: "飲料水", fr: "Eau potable" },
  electronics: { "zh-CN": "电子元件", ja: "電子部品", fr: "Électronique" },
  "medical-supplies": { "zh-CN": "医疗用品", ja: "医療物資", fr: "Fournitures médicales" },
  "luxury-goods": { "zh-CN": "奢侈品", ja: "高級品", fr: "Produits de luxe" },
  nanofibers: { "zh-CN": "纳米纤维", ja: "ナノファイバー", fr: "Nanofibres" },
  "energy-cells": { "zh-CN": "能量电池", ja: "エネルギーセル", fr: "Cellules d'énergie" },
  "mechanical-parts": { "zh-CN": "机械零件", ja: "機械部品", fr: "Pièces mécaniques" },
  microchips: { "zh-CN": "微芯片", ja: "マイクロチップ", fr: "Micropuces" },
  plastics: { "zh-CN": "塑料", ja: "プラスチック", fr: "Plastiques" },
  chemicals: { "zh-CN": "化学品", ja: "化学薬品", fr: "Produits chimiques" },
  "rare-plants": { "zh-CN": "稀有植物", ja: "希少植物", fr: "Plantes rares" },
  "rare-animals": { "zh-CN": "稀有动物", ja: "希少動物", fr: "Animaux rares" },
  "radioactive-materials": { "zh-CN": "放射性材料", ja: "放射性物質", fr: "Matières radioactives" },
  "noble-gas": { "zh-CN": "惰性气体", ja: "希ガス", fr: "Gaz noble" },
  "ship-components": { "zh-CN": "舰船组件", ja: "艦船部品", fr: "Composants de vaisseau" },
  optics: { "zh-CN": "光学元件", ja: "光学部品", fr: "Optiques" },
  hydraulics: { "zh-CN": "液压件", ja: "油圧部品", fr: "Hydrauliques" },
  "data-cores": { "zh-CN": "数据核心", ja: "データコア", fr: "Cœurs de données" },
  "illegal-contraband": { "zh-CN": "非法违禁品", ja: "違法禁制品", fr: "Contrebande illégale" },
  iron: { "zh-CN": "铁矿", ja: "鉄鉱石", fr: "Fer" },
  titanium: { "zh-CN": "钛矿", ja: "チタン鉱", fr: "Titane" },
  cesogen: { "zh-CN": "赛索根晶体", ja: "セソゲン結晶", fr: "Césogène" },
  gold: { "zh-CN": "黄金", ja: "金", fr: "Or" },
  voidglass: { "zh-CN": "虚空玻璃", ja: "虚空ガラス", fr: "Verre du vide" }
};

const equipmentNames: LocalizedCatalog = {
  "pulse-laser": { "zh-CN": "脉冲激光器", ja: "パルスレーザー", fr: "Laser à impulsions" },
  "plasma-cannon": { "zh-CN": "等离子炮", ja: "プラズマ砲", fr: "Canon plasma" },
  railgun: { "zh-CN": "轨道炮", ja: "レールガン", fr: "Canon électromagnétique" },
  "homing-missile": { "zh-CN": "制导导弹", ja: "誘導ミサイル", fr: "Missile à tête chercheuse" },
  "torpedo-rack": { "zh-CN": "鱼雷架", ja: "魚雷ラック", fr: "Rack de torpilles" },
  "mining-beam": { "zh-CN": "采矿光束", ja: "採掘ビーム", fr: "Rayon minier" },
  "industrial-mining-beam": { "zh-CN": "工业采矿光束", ja: "産業採掘ビーム", fr: "Rayon minier industriel" },
  "shield-booster": { "zh-CN": "护盾增幅器", ja: "シールドブースター", fr: "Amplificateur de bouclier" },
  "shield-matrix": { "zh-CN": "护盾矩阵", ja: "シールドマトリクス", fr: "Matrice de bouclier" },
  "cargo-expansion": { "zh-CN": "货舱扩展模块", ja: "貨物拡張モジュール", fr: "Extension de soute" },
  "ore-processor": { "zh-CN": "矿石处理器", ja: "鉱石処理機", fr: "Processeur de minerai" },
  "shielded-holds": { "zh-CN": "屏蔽货舱", ja: "遮蔽貨物庫", fr: "Soutes blindées" },
  afterburner: { "zh-CN": "加力燃烧器", ja: "アフターバーナー", fr: "Postcombustion" },
  scanner: { "zh-CN": "扫描器", ja: "スキャナー", fr: "Analyseur" },
  "survey-array": { "zh-CN": "勘测阵列", ja: "調査アレイ", fr: "Réseau de prospection" },
  "decoy-transponder": { "zh-CN": "诱饵应答器", ja: "デコイトランスポンダー", fr: "Transpondeur leurre" },
  "weapon-amplifier": { "zh-CN": "武器放大器", ja: "武器増幅器", fr: "Amplificateur d'armes" },
  "survey-lab": { "zh-CN": "勘测实验室", ja: "調査ラボ", fr: "Laboratoire de prospection" },
  "armor-plating": { "zh-CN": "装甲板", ja: "装甲プレート", fr: "Blindage" },
  "energy-reactor": { "zh-CN": "能量反应堆", ja: "エネルギー炉", fr: "Réacteur énergétique" },
  "quantum-reactor": { "zh-CN": "量子反应堆", ja: "量子炉", fr: "Réacteur quantique" },
  "repair-drone": { "zh-CN": "维修无人机", ja: "修理ドローン", fr: "Drone de réparation" },
  "targeting-computer": { "zh-CN": "瞄准计算机", ja: "照準コンピューター", fr: "Ordinateur de ciblage" },
  "echo-nullifier": { "zh-CN": "回声消隐器", ja: "エコー・ヌリファイア", fr: "Neutraliseur d'écho" },
  "relic-cartographer": { "zh-CN": "遗物制图仪", ja: "遺物カートグラファー", fr: "Cartographe relique" },
  "obsidian-bulwark": { "zh-CN": "黑曜壁垒", ja: "オブシディアン・ブルワーク", fr: "Rempart d'obsidienne" },
  "parallax-lance": { "zh-CN": "视差长枪炮", ja: "パララックス・ランス", fr: "Lance parallaxe" },
  "moth-choir-torpedo": { "zh-CN": "蛾群合唱鱼雷", ja: "モス・コーラス魚雷", fr: "Torpille Chœur de Moth" },
  "crownshade-singularity-core": { "zh-CN": "冠影奇点核心", ja: "クラウンシェイド特異点コア", fr: "Cœur de singularité Crownshade" }
};

const shipNames: LocalizedCatalog = {
  "sparrow-mk1": { "zh-CN": "麻雀 MK-I", ja: "スパロー MK-I", fr: "Épervier MK-I" },
  "mule-lx": { "zh-CN": "骡马 LX", ja: "ミュール LX", fr: "Mulet LX" },
  "prospector-rig": { "zh-CN": "勘探者钻架", ja: "プロスペクター・リグ", fr: "Plateforme Prospector" },
  "veil-runner": { "zh-CN": "纱幕奔行者", ja: "ヴェイルランナー", fr: "Coureur du Voile" },
  "talon-s": { "zh-CN": "利爪-S", ja: "タロン-S", fr: "Serre-S" },
  "wayfarer-x": { "zh-CN": "远行者-X", ja: "ウェイファーラー-X", fr: "Voyageur-X" },
  "raptor-v": { "zh-CN": "猛禽 V", ja: "ラプター V", fr: "Rapace V" },
  "bastion-7": { "zh-CN": "堡垒-7", ja: "バスティオン-7", fr: "Bastion 7" },
  "horizon-ark": { "zh-CN": "地平线方舟", ja: "ホライゾン・アーク", fr: "Arche Horizon" }
};

const factionNames: LocalizedCatalog = {
  "ptd-company": { "zh-CN": "PTD 公司", "zh-TW": "PTD 公司", ja: "PTD社", fr: "Compagnie PTD" },
  "solar-directorate": { "zh-CN": "太阳理事会", ja: "太陽理事会", fr: "Directorat solaire" },
  "vossari-clans": { "zh-CN": "沃萨里氏族", ja: "ヴォッサリ氏族", fr: "Clans vossari" },
  "mirr-collective": { "zh-CN": "米尔联合体", ja: "ミル共同体", fr: "Collectif Mirr" },
  "free-belt-union": { "zh-CN": "自由带联盟", ja: "自由帯同盟", fr: "Union de la ceinture libre" },
  "independent-pirates": { "zh-CN": "独立海盗", ja: "独立海賊", fr: "Pirates indépendants" },
  "unknown-drones": { "zh-CN": "未知无人机", ja: "未知ドローン", fr: "Drones inconnus" }
};

const systemNames: LocalizedCatalog = {
  "helion-reach": { "zh-CN": "赫利昂星域", ja: "ヘリオン宙域", fr: "Portée d'Hélion" },
  "kuro-belt": { "zh-CN": "黑炉带", ja: "クロ帯", fr: "Ceinture de Kuro" },
  vantara: { "zh-CN": "凡塔拉", ja: "ヴァンタラ", fr: "Système Vantara" },
  "mirr-vale": { "zh-CN": "米尔谷", ja: "ミル谷", fr: "Val Mirr" },
  "ashen-drift": { "zh-CN": "灰烬漂流带", ja: "灰燼漂流域", fr: "Dérive cendrée" },
  "celest-gate": { "zh-CN": "天穹之门", ja: "セレストゲート", fr: "Porte céleste" },
  "ptd-home": { "zh-CN": "PTD 母港", ja: "PTDホーム", fr: "Dépôt PTD Home" }
};

const planetNames: LocalizedCatalog = {
  "helion-prime-world": { "zh-CN": "赫利昂主星", ja: "ヘリオン・プライム", fr: "Hélion Prime" },
  "aurora-shepherd": { "zh-CN": "极光牧月", ja: "オーロラ・シェパード", fr: "Berger d'aurore" },
  "vale-cinder": { "zh-CN": "谷烬", ja: "ヴェイル・シンダー", fr: "Cendre du val" },
  "meridian-lumen": { "zh-CN": "子午辉光", ja: "メリディアン・ルーメン", fr: "Lumen méridien" },
  "kuro-anvil": { "zh-CN": "黑炉砧星", ja: "クロの金床", fr: "Enclume de Kuro" },
  "lode-minor": { "zh-CN": "小矿脉", ja: "ロード・マイナー", fr: "Filon mineur" },
  "niobe-ice": { "zh-CN": "尼俄柏冰原", ja: "ニオベ氷原", fr: "Glace de Niobé" },
  "bracken-dust": { "zh-CN": "蕨尘", ja: "ブラッケン・ダスト", fr: "Poussière de Bracken" },
  "vantara-command": { "zh-CN": "凡塔拉指挥星", ja: "ヴァンタラ司令星", fr: "Commandement Vantara" },
  "redoubt-moon": { "zh-CN": "棱堡月", ja: "リダウト月", fr: "Lune Redoute" },
  "gryphon-reef": { "zh-CN": "狮鹫礁", ja: "グリフォン礁", fr: "Récif Griffon" },
  "sentry-ash": { "zh-CN": "哨戒灰月", ja: "歩哨の灰月", fr: "Cendre sentinelle" },
  "mirr-glass": { "zh-CN": "米尔晶原", ja: "ミル・グラス", fr: "Verre Mirr" },
  "optic-tide": { "zh-CN": "光潮", ja: "オプティック潮", fr: "Marée optique" },
  "hush-orbit": { "zh-CN": "静默轨道", ja: "沈黙軌道", fr: "Orbite silencieuse" },
  "viridian-ruins": { "zh-CN": "翠绿遗迹", ja: "ヴィリジアン遺跡", fr: "Ruines viridiennes" },
  "ashen-harbor": { "zh-CN": "灰烬港", ja: "灰燼港", fr: "Port cendré" },
  "black-arc": { "zh-CN": "黑弧", ja: "ブラックアーク", fr: "Arc noir" },
  emberfall: { "zh-CN": "余烬陨落", ja: "エンバーフォール", fr: "Chute d'ambre" },
  "grave-moon": { "zh-CN": "坟场月", ja: "墓場月", fr: "Lune cimetière" },
  "voss-kel": { "zh-CN": "沃斯凯尔", ja: "ヴォス・ケル", fr: "Monde Voss Kel" },
  "celest-crown": { "zh-CN": "天穹王冠", ja: "セレスト王冠", fr: "Couronne céleste" },
  aurelia: { "zh-CN": "奥蕾莉亚", ja: "アウレリア", fr: "Aurélia" },
  "opal-minor": { "zh-CN": "小欧泊", ja: "オパール・マイナー", fr: "Opale mineure" },
  "zenith-gas": { "zh-CN": "天顶气巨星", ja: "ゼニスガス", fr: "Gaz zénith" },
  "pearl-night": { "zh-CN": "珍珠夜", ja: "パールナイト", fr: "Nuit perlière" },
  "ptd-home-world": { "zh-CN": "PTD 母港世界", ja: "PTDホーム世界", fr: "Monde PTD Home" }
};

const stationNames: LocalizedCatalog = {
  "helion-prime": { "zh-CN": "赫利昂主星交易所", ja: "ヘリオン・プライム取引所", fr: "Bourse d'Hélion Prime" },
  "aurora-ring": { "zh-CN": "极光环站", ja: "オーロラリング", fr: "Anneau d'aurore" },
  "cinder-yard": { "zh-CN": "灰烬船坞", ja: "シンダーヤード", fr: "Chantier Cendre" },
  "meridian-dock": { "zh-CN": "子午码头", ja: "メリディアン・ドック", fr: "Dock Méridien" },
  "kuro-deep": { "zh-CN": "黑炉深工站", ja: "クロ深工場", fr: "Fonderie profonde Kuro" },
  "lode-spindle": { "zh-CN": "矿脉纺锤站", ja: "ロード・スピンドル", fr: "Fuseau du filon" },
  "niobe-refinery": { "zh-CN": "尼俄柏气体精炼站", ja: "ニオベガス精製所", fr: "Raffinerie Niobé" },
  "bracken-claim": { "zh-CN": "蕨尘采权站", ja: "ブラッケン採掘権", fr: "Concession Bracken" },
  "vantara-bastion": { "zh-CN": "凡塔拉堡垒", ja: "ヴァンタラ砦", fr: "Bastion Vantara" },
  "redoubt-arsenal": { "zh-CN": "棱堡军械库", ja: "リダウト兵器庫", fr: "Arsenal Redoute" },
  "gryphon-carrier": { "zh-CN": "狮鹫航母泊位", ja: "グリフォン空母ドック", fr: "Dock Griffon" },
  "sentry-listening-post": { "zh-CN": "哨戒监听站", ja: "歩哨聴音所", fr: "Poste d'écoute Sentinelle" },
  "mirr-lattice": { "zh-CN": "米尔晶格站", ja: "ミル格子", fr: "Treillis Mirr" },
  "optic-garden": { "zh-CN": "光学花园站", ja: "光学庭園", fr: "Jardin optique" },
  "hush-array": { "zh-CN": "静默阵列", ja: "沈黙アレイ", fr: "Réseau silencieux" },
  "viridian-lab": { "zh-CN": "翠绿实验室", ja: "ヴィリジアン研究所", fr: "Laboratoire viridien" },
  "parallax-hermitage": { "zh-CN": "视差隐修所", ja: "パララックス隠棲所", fr: "Ermitage Parallaxe" },
  "obsidian-foundry": { "zh-CN": "黑曜铸造所", ja: "黒曜鋳造所", fr: "Fonderie d'obsidienne" },
  "ashen-freeport": { "zh-CN": "灰烬自由港", ja: "灰燼自由港", fr: "Port libre cendré" },
  "black-arcade": { "zh-CN": "黑弧集市", ja: "ブラックアーケード", fr: "Arcade noire" },
  "emberfall-relay": { "zh-CN": "余烬中继站", ja: "エンバーフォール中継", fr: "Relais Emberfall" },
  "graveyard-spindle": { "zh-CN": "坟场纺锤站", ja: "墓場スピンドル", fr: "Fuseau cimetière" },
  "voss-kel-market": { "zh-CN": "沃斯凯尔市场", ja: "ヴォス・ケル市場", fr: "Marché Voss Kel" },
  "moth-vault": { "zh-CN": "蛾影金库", ja: "モス・ヴォールト", fr: "Coffre Moth" },
  "celest-vault": { "zh-CN": "天穹宝库", ja: "セレスト金庫", fr: "Coffre céleste" },
  "aurelia-exchange": { "zh-CN": "奥蕾莉亚交易所", ja: "アウレリア取引所", fr: "Bourse Aurelia" },
  "opal-drydock": { "zh-CN": "欧泊干船坞", ja: "オパール乾ドック", fr: "Cale sèche Opale" },
  "zenith-skydock": { "zh-CN": "天顶天港", ja: "ゼニス天空港", fr: "Skydock Zénith" },
  "pearl-consulate": { "zh-CN": "珍珠领事馆", ja: "パール領事館", fr: "Consulat Perle" },
  "crownshade-observatory": { "zh-CN": "冠影观测站", ja: "クラウンシェード観測所", fr: "Observatoire Crownshade" },
  "ptd-home": { "zh-CN": "PTD 母港", ja: "PTDホーム", fr: "Dépôt PTD Home" }
};

const stationArchetypeNames: LocalizedCatalog = {
  "Trade Hub": { "zh-CN": "贸易枢纽", ja: "交易ハブ", fr: "Plateforme commerciale" },
  "Mining Station": { "zh-CN": "采矿站", ja: "採掘ステーション", fr: "Station minière" },
  "Research Station": { "zh-CN": "研究站", ja: "研究ステーション", fr: "Station de recherche" },
  "Military Outpost": { "zh-CN": "军事前哨", ja: "軍事前哨", fr: "Avant-poste militaire" },
  "Frontier Port": { "zh-CN": "边境港", ja: "辺境港", fr: "Port frontalier" },
  "Pirate Black Market": { "zh-CN": "海盗黑市", ja: "海賊闇市場", fr: "Marché noir pirate" }
};

const marketTagNames: LocalizedCatalog = {
  Export: { "zh-CN": "出口", ja: "輸出", fr: "À exporter" },
  Import: { "zh-CN": "进口", ja: "輸入", fr: "À importer" },
  Scarce: { "zh-CN": "稀缺", ja: "不足", fr: "Rare" },
  Balanced: { "zh-CN": "均衡", ja: "均衡", fr: "Équilibré" }
};

const combatAiProfileNames: LocalizedCatalog = {
  raider: { "zh-CN": "袭击者", ja: "レイダー", fr: "Pillard" },
  interceptor: { "zh-CN": "拦截者", ja: "迎撃機", fr: "Intercepteur" },
  gunner: { "zh-CN": "炮手", ja: "砲手", fr: "Canonnier" },
  "law-patrol": { "zh-CN": "执法巡逻队", ja: "法執行パトロール", fr: "Patrouille légale" },
  "patrol-support": { "zh-CN": "巡逻支援", ja: "巡回支援", fr: "Soutien de patrouille" },
  hauler: { "zh-CN": "运输船", ja: "輸送船", fr: "Transporteur" },
  freighter: { "zh-CN": "货运船", ja: "貨物船", fr: "Cargo lourd" },
  courier: { "zh-CN": "信使船", ja: "連絡船", fr: "Courrier" },
  miner: { "zh-CN": "矿船", ja: "採掘船", fr: "Mineur" },
  smuggler: { "zh-CN": "走私者", ja: "密輸船", fr: "Contrebandier" },
  "elite-ace": { "zh-CN": "精英王牌", ja: "精鋭エース", fr: "As d'élite" },
  "boss-warlord": { "zh-CN": "海盗军阀", ja: "海賊軍閥", fr: "Seigneur pirate" },
  "drone-hunter": { "zh-CN": "未知无人机", ja: "未知ドローン", fr: "Drone inconnu" },
  "relay-core": { "zh-CN": "中继核心", ja: "中継コア", fr: "Cœur relais" }
};

const combatLoadoutNames: LocalizedCatalog = {
  "ptd-escort": { "zh-CN": "PTD 护航套件", "zh-TW": "PTD 護航套件", ja: "PTD護衛キット", fr: "Kit escorte PTD" },
  "ptd-support": { "zh-CN": "PTD 支援套件", "zh-TW": "PTD 支援套件", ja: "PTD支援キット", fr: "Kit soutien PTD" },
  "pirate-raider": { "zh-CN": "刀翼袭击套件", ja: "ナイフ翼レイダーキット", fr: "Kit pillard Aile-couteau" },
  "pirate-interceptor": { "zh-CN": "刀翼拦截套件", ja: "ナイフ翼迎撃キット", fr: "Kit intercepteur Aile-couteau" },
  "pirate-gunner": { "zh-CN": "刀翼炮手套件", ja: "ナイフ翼砲手キット", fr: "Kit canonnier Aile-couteau" },
  "pirate-elite-ace": { "zh-CN": "王牌过载套件", ja: "エース過負荷キット", fr: "Kit d'as surchargé" },
  "pirate-boss-warlord": { "zh-CN": "军阀攻城套件", ja: "軍閥攻城キット", fr: "Kit de siège du seigneur" },
  "directorate-patrol": { "zh-CN": "理事会精确套件", ja: "理事会精密キット", fr: "Kit de précision du Directorat" },
  "directorate-support": { "zh-CN": "理事会支援套件", ja: "理事会支援キット", fr: "Kit de soutien du Directorat" },
  "directorate-courier": { "zh-CN": "理事会信使套件", ja: "理事会連絡キット", fr: "Kit courrier du Directorat" },
  "union-hauler": { "zh-CN": "联盟运输套件", ja: "同盟輸送キット", fr: "Kit transport de l'Union" },
  "union-freighter": { "zh-CN": "联盟重货防御套件", ja: "同盟重貨物防御キット", fr: "Kit défense cargo de l'Union" },
  "union-miner": { "zh-CN": "联盟切割套件", ja: "同盟カッターキット", fr: "Kit découpeur de l'Union" },
  "vossari-smuggler": { "zh-CN": "沃萨里爆发套件", ja: "ヴォッサリ瞬発キット", fr: "Kit rafale vossari" },
  "mirr-defender": { "zh-CN": "米尔晶格套件", ja: "ミル格子キット", fr: "Kit treillis Mirr" },
  "unknown-drone": { "zh-CN": "玻璃猎手阵列", ja: "グラスハンターアレイ", fr: "Réseau chasseur de verre" },
  "unknown-relay": { "zh-CN": "中继长枪阵列", ja: "中継ランスアレイ", fr: "Réseau lance-relais" }
};

const flightRoleNames: LocalizedCatalog = {
  pirate: { "zh-CN": "海盗", ja: "海賊", fr: "Pirate" },
  patrol: { "zh-CN": "巡逻队", ja: "パトロール", fr: "Patrouille" },
  trader: { "zh-CN": "贸易船", ja: "交易船", fr: "Marchand" },
  freighter: { "zh-CN": "货运船", ja: "貨物船", fr: "Cargo" },
  courier: { "zh-CN": "信使船", ja: "連絡船", fr: "Courrier" },
  miner: { "zh-CN": "矿船", ja: "採掘船", fr: "Mineur" },
  smuggler: { "zh-CN": "走私船", ja: "密輸船", fr: "Contrebandier" },
  drone: { "zh-CN": "无人机", ja: "ドローン", fr: "Drone" },
  relay: { "zh-CN": "中继体", ja: "中継体", fr: "Relais" }
};

const flightStateNames: LocalizedCatalog = {
  patrol: { "zh-CN": "巡逻", ja: "巡回", fr: "patrouille" },
  scan: { "zh-CN": "扫描", ja: "スキャン", fr: "scan" },
  intercept: { "zh-CN": "拦截", ja: "迎撃", fr: "interception" },
  attack: { "zh-CN": "攻击", ja: "攻撃", fr: "attaque" },
  evade: { "zh-CN": "规避", ja: "回避", fr: "évasion" },
  retreat: { "zh-CN": "撤退", ja: "退避", fr: "retraite" }
};

const missionTypeNames: LocalizedCatalog = {
  "Courier delivery": { "zh-CN": "信使递送", ja: "配達任務", fr: "Livraison courrier" },
  "Cargo transport": { "zh-CN": "货物运输", ja: "貨物輸送", fr: "Transport de fret" },
  "Passenger transport": { "zh-CN": "客运运输", ja: "旅客輸送", fr: "Transport passagers" },
  "Pirate bounty": { "zh-CN": "海盗赏金", ja: "海賊賞金", fr: "Prime pirate" },
  "Escort convoy": { "zh-CN": "护航船队", ja: "護衛船団", fr: "Escorte de convoi" },
  "Mining contract": { "zh-CN": "采矿合约", ja: "採掘契約", fr: "Contrat minier" },
  "Recovery/salvage": { "zh-CN": "回收/打捞", ja: "回収/サルベージ", fr: "Récupération/sauvetage" }
};

const genericNames: LocalizedCatalog = {
  BOSS: { "zh-CN": "首领", ja: "ボス", fr: "BOSS" },
  ELITE: { "zh-CN": "精英", ja: "エリート", fr: "ÉLITE" },
  LOCK: { "zh-CN": "锁定", ja: "ロック", fr: "VERROU" },
  STORY: { "zh-CN": "剧情", ja: "ストーリー", fr: "HISTOIRE" },
  SUPPORT: { "zh-CN": "支援", ja: "支援", fr: "SOUTIEN" },
  "SUPPORT WING": { "zh-CN": "支援编队", ja: "支援小隊", fr: "AILE DE SOUTIEN" },
  FREIGHTER: { "zh-CN": "货运船", ja: "貨物船", fr: "CARGO" },
  JAMMER: { "zh-CN": "干扰器", ja: "ジャマー", fr: "BROUILLEUR" },
  RELAY: { "zh-CN": "中继器", ja: "リレー", fr: "RELAIS" },
  ESCORT: { "zh-CN": "护航", ja: "護衛", fr: "ESCORTE" },
  SALVAGE: { "zh-CN": "打捞物", ja: "サルベージ", fr: "SAUVETAGE" },
  SCANNING: { "zh-CN": "扫描中", ja: "スキャン中", fr: "SCAN" },
  "UNKNOWN BEACON": { "zh-CN": "未知信标", ja: "未知ビーコン", fr: "BALISE INCONNUE" },
  "JUMP GATE": { "zh-CN": "跃迁星门", ja: "ジャンプゲート", fr: "PORTAIL DE SAUT" },
  IDLE: { "zh-CN": "空闲", ja: "待機", fr: "INACTIF" },
  MINING: { "zh-CN": "采矿", ja: "採掘", fr: "EXTRACTION" },
  RETURNING: { "zh-CN": "返航", ja: "帰還", fr: "RETOUR" },
  BUYING: { "zh-CN": "采购", ja: "購入", fr: "ACHAT" },
  HAULING: { "zh-CN": "运输", ja: "輸送", fr: "TRANSPORT" },
  SELLING: { "zh-CN": "出售", ja: "販売", fr: "VENTE" },
  DESTROYED: { "zh-CN": "已摧毁", ja: "撃破", fr: "DÉTRUIT" },
  Ore: { "zh-CN": "矿石", ja: "鉱石", fr: "Minerai" }
};

const displayNameAliases: LocalizedCatalog = {
  "Basic Food": commodityNames["basic-food"],
  "Drinking Water": commodityNames["drinking-water"],
  Electronics: commodityNames.electronics,
  "Medical Supplies": commodityNames["medical-supplies"],
  "Luxury Goods": commodityNames["luxury-goods"],
  Nanofibers: commodityNames.nanofibers,
  "Energy Cells": commodityNames["energy-cells"],
  "Mechanical Parts": commodityNames["mechanical-parts"],
  Microchips: commodityNames.microchips,
  Plastics: commodityNames.plastics,
  Chemicals: commodityNames.chemicals,
  "Rare Plants": commodityNames["rare-plants"],
  "Rare Animals": commodityNames["rare-animals"],
  "Radioactive Materials": commodityNames["radioactive-materials"],
  "Noble Gas": commodityNames["noble-gas"],
  "Ship Components": commodityNames["ship-components"],
  Optics: commodityNames.optics,
  Hydraulics: commodityNames.hydraulics,
  "Data Cores": commodityNames["data-cores"],
  "Illegal Contraband": commodityNames["illegal-contraband"],
  Iron: commodityNames.iron,
  Titanium: commodityNames.titanium,
  Cesogen: commodityNames.cesogen,
  Gold: commodityNames.gold,
  Voidglass: commodityNames.voidglass,
  "Pulse Laser": equipmentNames["pulse-laser"],
  "Plasma Cannon": equipmentNames["plasma-cannon"],
  Railgun: equipmentNames.railgun,
  "Homing Missile": equipmentNames["homing-missile"],
  "Torpedo Rack": equipmentNames["torpedo-rack"],
  "Mining Beam": equipmentNames["mining-beam"],
  "Industrial Mining Beam": equipmentNames["industrial-mining-beam"],
  "Shield Booster": equipmentNames["shield-booster"],
  "Shield Matrix": equipmentNames["shield-matrix"],
  "Cargo Expansion": equipmentNames["cargo-expansion"],
  "Ore Processor": equipmentNames["ore-processor"],
  "Shielded Holds": equipmentNames["shielded-holds"],
  Afterburner: equipmentNames.afterburner,
  Scanner: equipmentNames.scanner,
  "Survey Array": equipmentNames["survey-array"],
  "Decoy Transponder": equipmentNames["decoy-transponder"],
  "Weapon Amplifier": equipmentNames["weapon-amplifier"],
  "Survey Lab": equipmentNames["survey-lab"],
  "Armor Plating": equipmentNames["armor-plating"],
  "Energy Reactor": equipmentNames["energy-reactor"],
  "Quantum Reactor": equipmentNames["quantum-reactor"],
  "Repair Drone": equipmentNames["repair-drone"],
  "Targeting Computer": equipmentNames["targeting-computer"],
  "Echo Nullifier": equipmentNames["echo-nullifier"],
  "Relic Cartographer": equipmentNames["relic-cartographer"],
  "Obsidian Bulwark": equipmentNames["obsidian-bulwark"],
  "Parallax Lance": equipmentNames["parallax-lance"],
  "Moth Choir Torpedo": equipmentNames["moth-choir-torpedo"],
  "Crownshade Singularity Core": equipmentNames["crownshade-singularity-core"],
  "Sparrow MK-I": shipNames["sparrow-mk1"],
  "Mule LX": shipNames["mule-lx"],
  "Prospector Rig": shipNames["prospector-rig"],
  "Veil Runner": shipNames["veil-runner"],
  "Talon-S": shipNames["talon-s"],
  "Wayfarer-X": shipNames["wayfarer-x"],
  "Raptor V": shipNames["raptor-v"],
  "Bastion-7": shipNames["bastion-7"],
  "Horizon Ark": shipNames["horizon-ark"],
  "Solar Directorate": factionNames["solar-directorate"],
  "PTD Company": factionNames["ptd-company"],
  "Vossari Clans": factionNames["vossari-clans"],
  "Mirr Collective": factionNames["mirr-collective"],
  "Free Belt Union": factionNames["free-belt-union"],
  "Independent Pirates": factionNames["independent-pirates"],
  "Unknown Drones": factionNames["unknown-drones"],
  "Helion Reach": systemNames["helion-reach"],
  "Kuro Belt": systemNames["kuro-belt"],
  Vantara: systemNames.vantara,
  "Mirr Vale": systemNames["mirr-vale"],
  "Ashen Drift": systemNames["ashen-drift"],
  "Celest Gate": systemNames["celest-gate"],
  "PTD Home": systemNames["ptd-home"],
  "Helion Prime Exchange": stationNames["helion-prime"],
  "Aurora Ring": stationNames["aurora-ring"],
  "Cinder Yard": stationNames["cinder-yard"],
  "Meridian Dock": stationNames["meridian-dock"],
  "Kuro Deepworks": stationNames["kuro-deep"],
  "Lode Spindle": stationNames["lode-spindle"],
  "Niobe Gas Refinery": stationNames["niobe-refinery"],
  "Bracken Claim": stationNames["bracken-claim"],
  "Vantara Bastion": stationNames["vantara-bastion"],
  "Redoubt Arsenal": stationNames["redoubt-arsenal"],
  "Gryphon Carrier Dock": stationNames["gryphon-carrier"],
  "Sentry Listening Post": stationNames["sentry-listening-post"],
  "Mirr Lattice": stationNames["mirr-lattice"],
  "Optic Garden": stationNames["optic-garden"],
  "Hush Array": stationNames["hush-array"],
  "Viridian Lab": stationNames["viridian-lab"],
  "Parallax Hermitage": stationNames["parallax-hermitage"],
  "Obsidian Foundry": stationNames["obsidian-foundry"],
  "Ashen Freeport": stationNames["ashen-freeport"],
  "Black Arcade": stationNames["black-arcade"],
  "Emberfall Relay": stationNames["emberfall-relay"],
  "Graveyard Spindle": stationNames["graveyard-spindle"],
  "Voss Kel Market": stationNames["voss-kel-market"],
  "Moth Vault": stationNames["moth-vault"],
  "Celest Vault": stationNames["celest-vault"],
  "Aurelia Exchange": stationNames["aurelia-exchange"],
  "Opal Drydock": stationNames["opal-drydock"],
  "Zenith Skydock": stationNames["zenith-skydock"],
  "Pearl Consulate": stationNames["pearl-consulate"],
  "Crownshade Observatory": stationNames["crownshade-observatory"],
  "Trade Hub": stationArchetypeNames["Trade Hub"],
  "Mining Station": stationArchetypeNames["Mining Station"],
  "Research Station": stationArchetypeNames["Research Station"],
  "Military Outpost": stationArchetypeNames["Military Outpost"],
  "Frontier Port": stationArchetypeNames["Frontier Port"],
  "Pirate Black Market": stationArchetypeNames["Pirate Black Market"],
  "Law Patrol": combatAiProfileNames["law-patrol"],
  "Directorate precision kit": combatLoadoutNames["directorate-patrol"],
  "Directorate Patrol": { "zh-CN": "理事会巡逻队", ja: "理事会パトロール", fr: "Patrouille du Directorat" },
  "Ore Cutter": { "zh-CN": "矿石切割船", ja: "鉱石カッター", fr: "Découpeur de minerai" }
};

function storage(): Storage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function readLocalePreference(store: Storage | undefined = storage()): Locale {
  return normalizeLocale(store?.getItem(LOCALE_STORAGE_KEY));
}

export function saveLocalePreference(locale: Locale, store: Storage | undefined = storage()): Locale {
  const next = normalizeLocale(locale);
  store?.setItem(LOCALE_STORAGE_KEY, next);
  return next;
}

export function getLocaleOption(locale: Locale) {
  return localeOptions.find((option) => option.value === locale) ?? localeOptions[0];
}

export function speechLangForLocale(locale: Locale): string {
  return getLocaleOption(locale).speechLang;
}

export function intlLocaleFor(locale: Locale): string {
  return getLocaleOption(locale).intlLocale;
}

export function t(locale: Locale, key: keyof (typeof uiMessages)["en"] | string, params: I18nParams = {}): string {
  const messages = uiMessages as Record<Locale, Record<string, string>>;
  const template = messages[locale]?.[key] ?? messages.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_match: string, name: string) => String(params[name] ?? ""));
}

export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(intlLocaleFor(locale)).format(value);
}

export function formatDateTime(locale: Locale, value: string | number | Date, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat(intlLocaleFor(locale), options).format(new Date(value));
}

export function formatGameDuration(locale: Locale, seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  if (locale === "zh-CN" || locale === "zh-TW") return `${minutes}分${remainder}秒`;
  if (locale === "ja") return `${minutes}分${remainder}秒`;
  if (locale === "fr") return `${minutes} min ${remainder} s`;
  return `${minutes}:${remainder}`;
}

function titleizeId(id: string): string {
  return id
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function localizeFromCatalog(catalog: LocalizedCatalog, id: string | undefined, locale: Locale, fallback?: string): string {
  const source = fallback ?? (id ? titleizeId(id) : "");
  if (locale === "en") return source;
  const entry = id ? catalog[id] : undefined;
  const localized = entry?.[locale === "zh-TW" ? "zh-TW" : locale] ?? (locale === "zh-TW" ? entry?.["zh-CN"] : undefined);
  if (localized) return locale === "zh-TW" ? toTraditional(localized) : localized;
  return translateText(source, locale);
}

export function localizeCommodityName(id: string, locale: Locale, fallback?: string): string {
  return localizeFromCatalog(commodityNames, id, locale, fallback);
}

export function localizeEquipmentName(id: string, locale: Locale, fallback?: string): string {
  return localizeFromCatalog(equipmentNames, id, locale, fallback);
}

export function localizeShipName(id: string, locale: Locale, fallback?: string): string {
  return localizeFromCatalog(shipNames, id, locale, fallback);
}

export function localizeFactionName(id: string, locale: Locale, fallback?: string): string {
  return localizeFromCatalog(factionNames, id, locale, fallback);
}

export function localizeSystemName(id: string, locale: Locale, fallback?: string): string {
  return localizeFromCatalog(systemNames, id, locale, fallback);
}

export function localizePlanetName(id: string, locale: Locale, fallback?: string): string {
  return localizeFromCatalog(planetNames, id, locale, fallback);
}

export function localizeStationName(id: string, locale: Locale, fallback?: string): string {
  return localizeFromCatalog(stationNames, id, locale, fallback);
}

export function localizeStationArchetype(archetype: string, locale: Locale): string {
  return localizeFromCatalog(stationArchetypeNames, archetype, locale, archetype);
}

export function localizeMarketTag(tag: string, locale: Locale): string {
  return localizeFromCatalog(marketTagNames, tag, locale, tag);
}

export function localizeCombatAiProfile(id: string, locale: Locale, fallback?: string): string {
  return localizeFromCatalog(combatAiProfileNames, id, locale, fallback);
}

export function localizeCombatLoadout(id: string, locale: Locale, fallback?: string): string {
  return localizeFromCatalog(combatLoadoutNames, id, locale, fallback);
}

export function localizeFlightRole(id: string, locale: Locale, fallback?: string): string {
  return localizeFromCatalog(flightRoleNames, id, locale, fallback);
}

export function localizeFlightState(id: string, locale: Locale, fallback?: string): string {
  return localizeFromCatalog(flightStateNames, id, locale, fallback);
}

export function localizeMissionType(id: string, locale: Locale, fallback?: string): string {
  return localizeFromCatalog(missionTypeNames, id, locale, fallback);
}

export function localizeGenericName(id: string, locale: Locale, fallback?: string): string {
  return localizeFromCatalog(genericNames, id, locale, fallback);
}

export function formatCredits(locale: Locale, value: number, compact = false): string {
  const amount = formatNumber(locale, Math.round(value));
  if (compact) return `${amount} cr`;
  if (locale === "zh-CN") return `${amount} 信用点`;
  if (locale === "zh-TW") return `${amount} 信用點`;
  if (locale === "ja") return `${amount} クレジット`;
  if (locale === "fr") return `${amount} crédits`;
  return `${amount} credits`;
}

export function formatCargoLabel(locale: Locale, current: number, capacity?: number): string {
  const value = capacity === undefined ? formatNumber(locale, current) : `${formatNumber(locale, current)}/${formatNumber(locale, capacity)}`;
  if (locale === "zh-CN") return `货舱 ${value}`;
  if (locale === "zh-TW") return `貨艙 ${value}`;
  if (locale === "ja") return `貨物 ${value}`;
  if (locale === "fr") return `Cargaison ${value}`;
  return `Cargo ${value}`;
}

export function formatTechLevel(locale: Locale, level: number, short = false): string {
  const value = formatNumber(locale, level);
  if (locale === "zh-CN") return short ? `科技 ${value}` : `科技等级 ${value}`;
  if (locale === "zh-TW") return short ? `科技 ${value}` : `科技等級 ${value}`;
  if (locale === "ja") return short ? `技術 ${value}` : `技術レベル ${value}`;
  if (locale === "fr") return short ? `Tech ${value}` : `Niveau tech ${value}`;
  return short ? `Tech ${value}` : `Tech Level ${value}`;
}

export function formatDistance(locale: Locale, meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${new Intl.NumberFormat(intlLocaleFor(locale), { maximumFractionDigits: 1 }).format(km)}km`;
  }
  return `${formatNumber(locale, Math.round(meters))}m`;
}

export function formatCommodityAmount(locale: Locale, id: string, amount: number, fallback?: string): string {
  const name = localizeCommodityName(id, locale, fallback);
  if (locale === "ja") return `${name} ${formatNumber(locale, amount)}個`;
  return `${name}: ${formatNumber(locale, amount)}`;
}

export function formatCargoContents(locale: Locale, cargo: Record<string, number | undefined>): string {
  return Object.entries(cargo)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([id, amount]) => formatCommodityAmount(locale, id, amount ?? 0))
    .join(", ");
}

export function formatRuntimeText(locale: Locale, source: string | undefined | null): string {
  if (!source) return "";
  if (locale === "en") return source;
  const piratesGrace = source.match(/^Pirates are sizing you up · weapons free in (\d+)s$/);
  if (piratesGrace) {
    if (locale === "zh-CN") return `海盗正在评估你 · ${piratesGrace[1]}秒后解除武器限制`;
    if (locale === "zh-TW") return `海盜正在評估你 · ${piratesGrace[1]}秒後解除武器限制`;
    if (locale === "ja") return `海賊が様子見中 · ${piratesGrace[1]}秒後に武器解禁`;
    return `Les pirates vous jaugeront · armes libres dans ${piratesGrace[1]} s`;
  }
  const economyFallback = source.match(/^Economy (.+) · local fallback$/);
  if (economyFallback) {
    const status = translateText(economyFallback[1], locale);
    if (locale === "zh-CN") return `经济 ${status} · 使用本地模拟`;
    if (locale === "zh-TW") return `經濟 ${status} · 使用本地模擬`;
    if (locale === "ja") return `経済 ${status} · ローカル代替`;
    return `Économie ${status} · simulation locale`;
  }
  const patrolSupport = source.match(/^Patrol support active: (\d+)$/);
  if (patrolSupport) {
    if (locale === "zh-CN") return `巡逻支援已启动：${patrolSupport[1]}`;
    if (locale === "zh-TW") return `巡邏支援已啟動：${patrolSupport[1]}`;
    if (locale === "ja") return `巡回支援稼働中: ${patrolSupport[1]}`;
    return `Soutien de patrouille actif : ${patrolSupport[1]}`;
  }
  const distressCall = source.match(/^Distress call: (.+) under attack by (.+)\.$/);
  if (distressCall) {
    const civilian = translateDisplayName(distressCall[1], locale);
    const threat = translateDisplayName(distressCall[2], locale);
    if (locale === "zh-CN") return `求救呼叫：${civilian} 正遭受 ${threat} 攻击。`;
    if (locale === "zh-TW") return `求救呼叫：${civilian} 正遭受 ${threat} 攻擊。`;
    if (locale === "ja") return `救難通信: ${civilian} が ${threat} から攻撃中。`;
    return `Appel de détresse : ${civilian} sous attaque de ${threat}.`;
  }
  const launchMatch = source.match(/^Launch vector clear(?: from (.+))?\.$/);
  if (launchMatch) {
    const station = launchMatch[1] ? translateDisplayName(launchMatch[1], locale) : "";
    if (locale === "zh-CN") return station ? `${station} 发射航向清空。` : "发射航向清空。";
    if (locale === "zh-TW") return station ? `${station} 發射航向清空。` : "發射航向清空。";
    if (locale === "ja") return station ? `${station} からの発進ベクトル良好。` : "発進ベクトル良好。";
    return station ? `Vecteur de décollage dégagé depuis ${station}.` : "Vecteur de décollage dégagé.";
  }
  const destroyedMatch = source.match(/^(.+) destroyed\. Boss cargo scattered\.$/);
  if (destroyedMatch) {
    const name = translateDisplayName(destroyedMatch[1], locale);
    if (locale === "zh-CN") return `${name} 已摧毁。首领货物已散落。`;
    if (locale === "zh-TW") return `${name} 已摧毀。首領貨物已散落。`;
    if (locale === "ja") return `${name} 撃破。ボス貨物が散乱しました。`;
    return `${name} détruit. Cargaison du chef dispersée.`;
  }
  const economyStatusMatch = source.match(/^(MINING|RETURNING|BUYING|HAULING|SELLING|DESTROYED|IDLE)(?: · (.+))?$/);
  if (economyStatusMatch) {
    const status = localizeGenericName(economyStatusMatch[1], locale);
    const detail = economyStatusMatch[2] ? translateDisplayName(economyStatusMatch[2], locale) : "";
    return detail ? `${status} · ${detail}` : status;
  }
  const locateSignalMatch = source.match(/^Locate (.+) in (.+)\.$/);
  if (locateSignalMatch) {
    const signal = translateDisplayName(locateSignalMatch[1], locale);
    const system = translateDisplayName(locateSignalMatch[2], locale);
    if (locale === "zh-CN") return `在 ${system} 定位 ${signal}。`;
    if (locale === "zh-TW") return `在 ${system} 定位 ${signal}。`;
    if (locale === "ja") return `${system} で ${signal} を特定。`;
    return `Localiser ${signal} dans ${system}.`;
  }
  const returnSignalMatch = source.match(/^Return to (.+) and complete the scan\.$/);
  if (returnSignalMatch) {
    const signal = translateDisplayName(returnSignalMatch[1], locale);
    if (locale === "zh-CN") return `返回 ${signal} 并完成扫描。`;
    if (locale === "zh-TW") return `返回 ${signal} 並完成掃描。`;
    if (locale === "ja") return `${signal} に戻ってスキャン完了。`;
    return `Retourner vers ${signal} et terminer le scan.`;
  }
  const scanningSignalMatch = source.match(/^Scanning (.+): tune frequency to finish the trace\.$/);
  if (scanningSignalMatch) {
    const signal = translateDisplayName(scanningSignalMatch[1], locale);
    if (locale === "zh-CN") return `正在扫描 ${signal}：调谐频率以完成痕迹解析。`;
    if (locale === "zh-TW") return `正在掃描 ${signal}：調諧頻率以完成痕跡解析。`;
    if (locale === "ja") return `${signal} をスキャン中: 周波数を合わせて痕跡を完了。`;
    return `Scan de ${signal} : réglez la fréquence pour finaliser la trace.`;
  }
  const lockedSignalMatch = source.match(/^Complete the prior Quiet Signal stage to resolve (.+)\.$/);
  if (lockedSignalMatch) {
    const signal = translateDisplayName(lockedSignalMatch[1], locale);
    if (locale === "zh-CN") return `完成前序静默信号阶段以解析 ${signal}。`;
    if (locale === "zh-TW") return `完成前序靜默訊號階段以解析 ${signal}。`;
    if (locale === "ja") return `前段階の Quiet Signal を完了して ${signal} を解決。`;
    return `Terminez l'étape Quiet Signal précédente pour résoudre ${signal}.`;
  }
  const chainCompleteMatch = source.match(/^Chain complete: (.+)\. (.+) blueprint unlocked\.$/);
  if (chainCompleteMatch) {
    const chain = translateDisplayName(chainCompleteMatch[1], locale);
    const blueprint = translateDisplayName(chainCompleteMatch[2], locale);
    if (locale === "zh-CN") return `链路完成：${chain}。${blueprint} 蓝图已解锁。`;
    if (locale === "zh-TW") return `鏈路完成：${chain}。${blueprint} 藍圖已解鎖。`;
    if (locale === "ja") return `チェーン完了: ${chain}。${blueprint} の設計図を解除。`;
    return `Chaîne terminée : ${chain}. Plan ${blueprint} déverrouillé.`;
  }
  const holdingNearMatch = source.match(/^Holding near (.+)$/);
  if (holdingNearMatch) {
    const station = translateDisplayName(holdingNearMatch[1], locale);
    if (locale === "zh-CN") return `停泊于 ${station} 附近`;
    if (locale === "zh-TW") return `停泊於 ${station} 附近`;
    if (locale === "ja") return `${station} 付近で待機`;
    return `En attente près de ${station}`;
  }
  const freightMatch = source.match(/^FREIGHTER · (\d+)\/(\d+)$/);
  if (freightMatch) return `${localizeGenericName("FREIGHTER", locale)} · ${freightMatch[1]}/${freightMatch[2]}`;
  return translateText(source, locale);
}

export function translateDisplayName(source: string, locale: Locale): string {
  if (locale === "en") return source;
  const alias = displayNameAliases[source];
  if (alias) {
    const localized = alias[locale === "zh-TW" ? "zh-TW" : locale] ?? (locale === "zh-TW" ? alias["zh-CN"] : undefined);
    if (localized) return locale === "zh-TW" ? toTraditional(localized) : localized;
  }
  const tables = [commodityNames, equipmentNames, shipNames, factionNames, systemNames, planetNames, stationNames, stationArchetypeNames, combatAiProfileNames, combatLoadoutNames, genericNames];
  for (const table of tables) {
    for (const [id, entry] of Object.entries(table)) {
      const english = titleizeId(id);
      if (source === english || source === id) return localizeFromCatalog(table, id, locale, source);
    }
  }
  return translateText(source, locale);
}

function replaceEvery(text: string, source: string, target: string): string {
  return text.split(source).join(target);
}

function toTraditional(text: string): string {
  return Object.entries(zhTraditionalOverrides).reduce((next, [source, target]) => replaceEvery(next, source, target), text);
}

function localeExactMap(locale: Locale): Record<string, string> {
  if (locale === "zh-TW") {
    return {
      ...Object.fromEntries(Object.entries(exactText["zh-CN"]).map(([source, target]) => [source, toTraditional(target)])),
      ...exactText["zh-TW"]
    };
  }
  if (locale === "en") return {};
  const maps = exactText as Partial<Record<Exclude<Locale, "en">, Record<string, string>>>;
  return maps[locale] ?? {};
}

function applyGlossary(source: string, locale: Exclude<Locale, "en">): string {
  const glossary = locale === "zh-TW" ? phraseGlossaries["zh-CN"] : phraseGlossaries[locale];
  let next = source;
  for (const [from, to] of [...glossary].sort((a, b) => b[0].length - a[0].length)) {
    const target = locale === "zh-TW" ? toTraditional(to) : to;
    next = replaceEvery(next, from, target);
  }
  return locale === "zh-TW" ? toTraditional(next) : next;
}

function translatePattern(source: string, locale: Exclude<Locale, "en">): string | undefined {
  const stationMatch = source.match(/^Auto-saved to Auto \/ Quick Slot · (.+)$/);
  if (stationMatch) {
    if (locale === "zh-CN") return `已自动保存到自动 / 快速槽位 · ${stationMatch[1]}`;
    if (locale === "zh-TW") return `已自動儲存到自動 / 快速槽位 · ${stationMatch[1]}`;
    if (locale === "ja") return `自動 / クイックスロットに保存済み · ${stationMatch[1]}`;
    return `Sauvegarde auto dans Auto / rapide · ${stationMatch[1]}`;
  }
  const savedMatch = source.match(/^Game saved to (.+)\.$/);
  if (savedMatch) {
    if (locale === "zh-CN") return `游戏已保存到 ${savedMatch[1]}。`;
    if (locale === "zh-TW") return `遊戲已儲存到 ${savedMatch[1]}。`;
    if (locale === "ja") return `${savedMatch[1]} に保存しました。`;
    return `Partie sauvegardée dans ${savedMatch[1]}.`;
  }
  const deletedMatch = source.match(/^Deleted (.+)\.$/);
  if (deletedMatch) {
    if (locale === "zh-CN") return `已删除 ${deletedMatch[1]}。`;
    if (locale === "zh-TW") return `已刪除 ${deletedMatch[1]}。`;
    if (locale === "ja") return `${deletedMatch[1]} を削除しました。`;
    return `${deletedMatch[1]} supprimé.`;
  }
  const techMatch = source.match(/^Tech Level (\d+)$/);
  if (techMatch) {
    if (locale === "zh-CN") return `科技等级 ${techMatch[1]}`;
    if (locale === "zh-TW") return `科技等級 ${techMatch[1]}`;
    if (locale === "ja") return `技術レベル ${techMatch[1]}`;
    return `Niveau tech ${techMatch[1]}`;
  }
  const riskMatch = source.match(/^Risk (\d+)%$/);
  if (riskMatch) {
    if (locale === "zh-CN") return `风险 ${riskMatch[1]}%`;
    if (locale === "zh-TW") return `風險 ${riskMatch[1]}%`;
    if (locale === "ja") return `リスク ${riskMatch[1]}%`;
    return `Risque ${riskMatch[1]}%`;
  }
  const boughtMatch = source.match(/^Bought (\d+) (.+)\.$/);
  if (boughtMatch) {
    const itemName = translateDisplayName(boughtMatch[2], locale);
    if (locale === "zh-CN") return `已购买 ${boughtMatch[1]} ${itemName}。`;
    if (locale === "zh-TW") return `已購買 ${boughtMatch[1]} ${itemName}。`;
    if (locale === "ja") return `${itemName}を ${boughtMatch[1]} 個購入しました。`;
    return `${boughtMatch[1]} ${itemName} acheté(s).`;
  }
  const soldMatch = source.match(/^Sold (\d+) (.+)\.$/);
  if (soldMatch) {
    const itemName = translateDisplayName(soldMatch[2], locale);
    if (locale === "zh-CN") return `已出售 ${soldMatch[1]} ${itemName}。`;
    if (locale === "zh-TW") return `已出售 ${soldMatch[1]} ${itemName}。`;
    if (locale === "ja") return `${itemName}を ${soldMatch[1]} 個売却しました。`;
    return `${soldMatch[1]} ${itemName} vendu(s).`;
  }
  const acceptedMatch = source.match(/^Accepted (.+)\.$/);
  if (acceptedMatch) {
    if (locale === "zh-CN") return `已接受 ${acceptedMatch[1]}。`;
    if (locale === "zh-TW") return `已接受 ${acceptedMatch[1]}。`;
    if (locale === "ja") return `${acceptedMatch[1]}を受諾しました。`;
    return `${acceptedMatch[1]} accepté.`;
  }
  const jumpedMatch = source.match(/^Jumped to (.+)\.$/);
  if (jumpedMatch) {
    const name = translateDisplayName(jumpedMatch[1], locale);
    if (locale === "zh-CN") return `已跃迁至 ${name}。`;
    if (locale === "zh-TW") return `已躍遷至 ${name}。`;
    if (locale === "ja") return `${name}へジャンプしました。`;
    return `Saut effectué vers ${name}.`;
  }
  return undefined;
}

export function translateText(source: string | undefined | null, locale: Locale): string {
  if (!source || locale === "en") return source ?? "";
  const exact = localeExactMap(locale)[source];
  if (exact) return exact;
  const pattern = translatePattern(source, locale);
  if (pattern) return pattern;
  const glossed = applyGlossary(source, locale);
  return glossed;
}

export function localizeTextEntry(source: string, localized: LocalizedText | undefined, locale: Locale): string {
  if (locale === "en") return source;
  const direct = localized?.[locale];
  if (direct) return locale === "zh-TW" ? toTraditional(direct) : direct;
  const simplified = locale === "zh-TW" ? localized?.["zh-CN"] : undefined;
  if (simplified) return toTraditional(simplified);
  return translateText(source, locale);
}

export function hasExactTranslation(source: string, locale: Locale): boolean {
  if (locale === "en") return true;
  return !!localeExactMap(locale)[source] || !!translatePattern(source, locale) || applyGlossary(source, locale) !== source;
}
