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
    "Trade, mine, fight pirates, dock at stations, and push across a six-system frontier.": "贸易、采矿、迎战海盗、停靠空间站，并穿越六个星系的边境。",
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
    "Watch": "观看",
    "Watching": "正在观看",
    "Cockpit": "驾驶舱",
    "Chase": "追尾",
    "Belt depleted": "矿带耗尽",
    "Mouse look": "鼠标观察",
    "Esc Return": "Esc 返回",
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
    "Play/Pause": "播放/暂停",
    "Replay Voice": "重放语音",
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
    "yes": "是",
    "no": "否",
    "offline": "离线",
    "connected": "已连接",
    "HIGH": "高",
    "MEDIUM": "中",
    "LOW": "低",
    "Starter scout": "初始侦察舰",
    "Cargo hauler": "货运船",
    "Light fighter": "轻型战斗机",
    "Heavy gunship": "重型炮艇",
    "Late-game balanced explorer": "后期均衡探索舰",
    "Career: scout, starter bounties, light exploration": "定位：侦察、初始赏金、轻度探索",
    "Career: trade routes, mining support, cargo contracts": "定位：贸易航线、采矿支援、货运合约",
    "Career: bounty hunting, fast interception, light combat": "定位：赏金猎杀、快速拦截、轻型战斗",
    "Career: heavy combat, escort duty, hostile lanes": "定位：重型战斗、护航任务、敌对航道",
    "Career: late-game exploration, hybrid trade, advanced systems": "定位：后期探索、混合贸易、高级系统",
    "Recommended blueprints: Exploration Systems + starter Combat": "推荐蓝图：探索系统 + 初始战斗",
    "Recommended blueprints: Engineering & Trade + Exploration Systems": "推荐蓝图：工程与贸易 + 探索系统",
    "Recommended blueprints: Combat Systems + Engineering fire-control": "推荐蓝图：战斗系统 + 工程火控",
    "Recommended blueprints: Defense Systems + heavy Combat": "推荐蓝图：防御系统 + 重型战斗",
    "Recommended blueprints: Exploration Systems + Engineering & Trade": "推荐蓝图：探索系统 + 工程与贸易",
    "Combat Systems": "战斗系统",
    "Defense Systems": "防御系统",
    "Exploration Systems": "探索系统",
    "Engineering & Trade": "工程与贸易"
  },
  "zh-TW": {},
  ja: {
    "New Game": "ニューゲーム",
    "Continue": "続ける",
    "Settings": "設定",
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
    "Galaxy Map": "銀河マップ",
    "Back": "戻る",
    "Load Game": "ゲームをロード",
    "Save Slots": "セーブスロット",
    "Empty slot": "空きスロット",
    "Buy": "購入",
    "Sell": "売却",
    "Accept": "受諾",
    "Complete": "完了",
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
    "Combat Systems": "戦闘システム",
    "Defense Systems": "防御システム",
    "Exploration Systems": "探索システム",
    "Watch": "観察",
    "Watching": "観察中",
    "Cockpit": "コックピット",
    "Chase": "追尾",
    "Belt depleted": "鉱脈枯渇",
    "Mouse look": "マウス視点",
    "Esc Return": "Esc 戻る",
    "NPC signal lost.": "NPC信号をロスト。",
    "Returned from NPC watch.": "NPC観察を終了しました。",
    "Engineering & Trade": "工学と交易"
  },
  fr: {
    "New Game": "Nouvelle partie",
    "Continue": "Continuer",
    "Settings": "Paramètres",
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
    "Galaxy Map": "Carte galactique",
    "Back": "Retour",
    "Load Game": "Charger",
    "Save Slots": "Emplacements",
    "Empty slot": "Emplacement vide",
    "Buy": "Acheter",
    "Sell": "Vendre",
    "Accept": "Accepter",
    "Complete": "Terminer",
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
    "Combat Systems": "Systèmes de combat",
    "Defense Systems": "Systèmes de défense",
    "Exploration Systems": "Systèmes d'exploration",
    "Watch": "Observer",
    "Watching": "Observation",
    "Cockpit": "Cockpit",
    "Chase": "Poursuite",
    "Belt depleted": "Ceinture épuisée",
    "Mouse look": "Vue souris",
    "Esc Return": "Esc retour",
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
  "shield-booster": { "zh-CN": "护盾增幅器", ja: "シールドブースター", fr: "Amplificateur de bouclier" },
  "shield-matrix": { "zh-CN": "护盾矩阵", ja: "シールドマトリクス", fr: "Matrice de bouclier" },
  "cargo-expansion": { "zh-CN": "货舱扩展模块", ja: "貨物拡張モジュール", fr: "Extension de soute" },
  afterburner: { "zh-CN": "加力燃烧器", ja: "アフターバーナー", fr: "Postcombustion" },
  scanner: { "zh-CN": "扫描器", ja: "スキャナー", fr: "Analyseur" },
  "survey-array": { "zh-CN": "勘测阵列", ja: "調査アレイ", fr: "Réseau de prospection" },
  "armor-plating": { "zh-CN": "装甲板", ja: "装甲プレート", fr: "Blindage" },
  "energy-reactor": { "zh-CN": "能量反应堆", ja: "エネルギー炉", fr: "Réacteur énergétique" },
  "quantum-reactor": { "zh-CN": "量子反应堆", ja: "量子炉", fr: "Réacteur quantique" },
  "repair-drone": { "zh-CN": "维修无人机", ja: "修理ドローン", fr: "Drone de réparation" },
  "targeting-computer": { "zh-CN": "瞄准计算机", ja: "照準コンピューター", fr: "Ordinateur de ciblage" }
};

const shipNames: LocalizedCatalog = {
  "sparrow-mk1": { "zh-CN": "麻雀 MK-I", ja: "スパロー MK-I", fr: "Épervier MK-I" },
  "mule-lx": { "zh-CN": "骡马 LX", ja: "ミュール LX", fr: "Mulet LX" },
  "raptor-v": { "zh-CN": "猛禽 V", ja: "ラプター V", fr: "Rapace V" },
  "bastion-7": { "zh-CN": "堡垒-7", ja: "バスティオン-7", fr: "Bastion 7" },
  "horizon-ark": { "zh-CN": "地平线方舟", ja: "ホライゾン・アーク", fr: "Arche Horizon" }
};

const factionNames: LocalizedCatalog = {
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
  "ashen-freeport": { "zh-CN": "灰烬自由港", ja: "灰燼自由港", fr: "Port libre cendré" },
  "black-arcade": { "zh-CN": "黑弧集市", ja: "ブラックアーケード", fr: "Arcade noire" },
  "emberfall-relay": { "zh-CN": "余烬中继站", ja: "エンバーフォール中継", fr: "Relais Emberfall" },
  "graveyard-spindle": { "zh-CN": "坟场纺锤站", ja: "墓場スピンドル", fr: "Fuseau cimetière" },
  "voss-kel-market": { "zh-CN": "沃斯凯尔市场", ja: "ヴォス・ケル市場", fr: "Marché Voss Kel" },
  "celest-vault": { "zh-CN": "天穹宝库", ja: "セレスト金庫", fr: "Coffre céleste" },
  "aurelia-exchange": { "zh-CN": "奥蕾莉亚交易所", ja: "アウレリア取引所", fr: "Bourse Aurelia" },
  "opal-drydock": { "zh-CN": "欧泊干船坞", ja: "オパール乾ドック", fr: "Cale sèche Opale" },
  "zenith-skydock": { "zh-CN": "天顶天港", ja: "ゼニス天空港", fr: "Skydock Zénith" },
  "pearl-consulate": { "zh-CN": "珍珠领事馆", ja: "パール領事館", fr: "Consulat Perle" },
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
  "Shield Booster": equipmentNames["shield-booster"],
  "Shield Matrix": equipmentNames["shield-matrix"],
  "Cargo Expansion": equipmentNames["cargo-expansion"],
  Afterburner: equipmentNames.afterburner,
  Scanner: equipmentNames.scanner,
  "Survey Array": equipmentNames["survey-array"],
  "Armor Plating": equipmentNames["armor-plating"],
  "Energy Reactor": equipmentNames["energy-reactor"],
  "Quantum Reactor": equipmentNames["quantum-reactor"],
  "Repair Drone": equipmentNames["repair-drone"],
  "Targeting Computer": equipmentNames["targeting-computer"],
  "Sparrow MK-I": shipNames["sparrow-mk1"],
  "Mule LX": shipNames["mule-lx"],
  "Raptor V": shipNames["raptor-v"],
  "Bastion-7": shipNames["bastion-7"],
  "Horizon Ark": shipNames["horizon-ark"],
  "Solar Directorate": factionNames["solar-directorate"],
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
  "Ashen Freeport": stationNames["ashen-freeport"],
  "Black Arcade": stationNames["black-arcade"],
  "Emberfall Relay": stationNames["emberfall-relay"],
  "Graveyard Spindle": stationNames["graveyard-spindle"],
  "Voss Kel Market": stationNames["voss-kel-market"],
  "Celest Vault": stationNames["celest-vault"],
  "Aurelia Exchange": stationNames["aurelia-exchange"],
  "Opal Drydock": stationNames["opal-drydock"],
  "Zenith Skydock": stationNames["zenith-skydock"],
  "Pearl Consulate": stationNames["pearl-consulate"],
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
