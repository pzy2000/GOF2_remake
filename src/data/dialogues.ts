import type { FactionId } from "../types/game";
import type { ContentLocale } from "../i18n";
import type { VoiceProfileId } from "../systems/voice";
import { explorationSignals } from "./exploration";
import { glassWakeProtocol } from "./story";

export type DialogueSceneGroup = "story" | "exploration";
export type DialogueTrigger =
  | { kind: "story-accept"; missionId: string; chapterId: string }
  | { kind: "story-complete"; missionId: string; chapterId: string }
  | { kind: "exploration-complete"; signalId: string };
type RequiredDialogueLocale = "zh-CN" | "ja" | "fr";
export type DialogueLocalizedText = Record<RequiredDialogueLocale, string> &
  Partial<Record<Exclude<ContentLocale, RequiredDialogueLocale>, string>>;

export interface DialogueSpeakerDefinition {
  id: string;
  name: string;
  nameI18n: DialogueLocalizedText;
  role: string;
  roleI18n: DialogueLocalizedText;
  kind: "npc" | "player" | "ai";
  factionId?: FactionId;
  color: string;
  voiceProfile: VoiceProfileId;
}

export interface DialogueLineDefinition {
  speakerId: string;
  text: string;
  textI18n: DialogueLocalizedText;
}

export interface DialogueSceneDefinition {
  id: string;
  group: DialogueSceneGroup;
  title: string;
  titleI18n: DialogueLocalizedText;
  maskedTitle: string;
  maskedTitleI18n?: DialogueLocalizedText;
  trigger: DialogueTrigger;
  lines: DialogueLineDefinition[];
}

function l(zhCN: string, ja: string, fr: string): DialogueLocalizedText {
  return { "zh-CN": zhCN, ja, fr };
}

export const dialogueSpeakers: DialogueSpeakerDefinition[] = [
  { id: "captain", name: "Captain", nameI18n: l("舰长", "船長", "Capitaine"), role: "Player ship", roleI18n: l("玩家飞船", "プレイヤー艦", "Vaisseau joueur"), kind: "player", color: "#80d6ff", voiceProfile: "captain" },
  { id: "ship-ai", name: "Ship AI", nameI18n: l("舰载 AI", "艦載AI", "IA de bord"), role: "Navigation core", roleI18n: l("导航核心", "航法コア", "Noyau de navigation"), kind: "ai", color: "#9bffe8", voiceProfile: "ship-ai" },
  { id: "helion-handler", name: "Rhea Vale", nameI18n: l("Rhea Vale", "Rhea Vale", "Rhea Vale"), role: "Helion traffic handler", roleI18n: l("赫利昂交通管制员", "ヘリオン交通管制官", "Régulatrice du trafic Helion"), kind: "npc", factionId: "solar-directorate", color: "#f8c15d", voiceProfile: "helion-handler" },
  { id: "mirr-analyst", name: "Sera Voss", nameI18n: l("Sera Voss", "Sera Voss", "Sera Voss"), role: "Mirr signal analyst", roleI18n: l("米尔信号分析员", "ミル信号分析官", "Analyste de signaux Mirr"), kind: "npc", factionId: "mirr-collective", color: "#bda7ff", voiceProfile: "mirr-analyst" },
  { id: "kuro-foreman", name: "Mako Dren", nameI18n: l("Mako Dren", "Mako Dren", "Mako Dren"), role: "Kuro belt foreman", roleI18n: l("黑带工头", "クロ帯域の現場監督", "Contremaître de la ceinture Kuro"), kind: "npc", factionId: "free-belt-union", color: "#f0a45b", voiceProfile: "kuro-foreman" },
  { id: "vantara-officer", name: "Cmdr. Hale", nameI18n: l("Hale 指挥官", "ヘイル司令官", "Cmdt Hale"), role: "Directorate spectrum officer", roleI18n: l("理事会频谱军官", "理事会スペクトル士官", "Officier spectral du Directoire"), kind: "npc", factionId: "solar-directorate", color: "#7bc8ff", voiceProfile: "vantara-officer" },
  { id: "ashen-broker", name: "Nyx Calder", nameI18n: l("Nyx Calder", "Nyx Calder", "Nyx Calder"), role: "Ashen information broker", roleI18n: l("灰烬情报掮客", "アシェン情報仲介人", "Courtier d'information d'Ashen"), kind: "npc", factionId: "vossari-clans", color: "#ff8a6a", voiceProfile: "ashen-broker" },
  { id: "celest-archivist", name: "Ione Sel", nameI18n: l("Ione Sel", "Ione Sel", "Ione Sel"), role: "Celest archive keeper", roleI18n: l("天穹档案保管员", "セレスト記録保管官", "Gardienne des archives Celest"), kind: "npc", factionId: "solar-directorate", color: "#fff0a8", voiceProfile: "celest-archivist" },
  { id: "union-witness", name: "Talla Rook", nameI18n: l("Talla Rook", "Talla Rook", "Talla Rook"), role: "Union witness", roleI18n: l("工会证人", "組合の証人", "Témoin syndical"), kind: "npc", factionId: "free-belt-union", color: "#ffd166", voiceProfile: "union-witness" }
];

const storyScenes: DialogueSceneDefinition[] = [
  {
    id: "dialogue-story-clean-carrier-accept",
    group: "story",
    title: "Clean Carrier Briefing",
    titleI18n: l("洁净航载简报", "クリーン・キャリア ブリーフィング", "Briefing du transport propre"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-clean-carrier", chapterId: "glass-wake-01" },
    lines: [
      { speakerId: "helion-handler", text: "Captain, Helion traffic is handing you a clean sync key. It has never touched a pirate repeater, a private courier, or a Mirr filter.", textI18n: l("舰长，赫利昂交通管制正交给你一把洁净同步钥。它从未经过海盗中继、私人信使，也没有碰过米尔过滤器。", "船長、ヘリオン管制からクリーンな同期キーを渡します。海賊中継、民間急使、ミルのフィルターには一度も触れていません。", "Capitaine, le trafic Helion vous remet une cle de synchro propre. Elle n'a jamais touche un relais pirate, un coursier prive ni un filtre Mirr.") },
      { speakerId: "captain", text: "That is a lot of purity for one missing probe.", textI18n: l("为了一个失踪探针，这份洁净程度有点夸张。", "行方不明の探査機ひとつにしては、ずいぶん潔白ですね。", "Cela fait beaucoup de purete pour une sonde disparue.") },
      { speakerId: "helion-handler", text: "Purity is the point. Mirr needs an honest mirror before they accuse the lane itself of lying.", textI18n: l("重点正是洁净。米尔在指控航道本身撒谎之前，需要一面诚实的镜子。", "潔白こそ要点です。ミルが航路そのものを嘘つきだと責める前に、正直な鏡が必要です。", "La purete est le sujet. Mirr a besoin d'un miroir honnete avant d'accuser la voie elle-meme de mentir.") },
      { speakerId: "ship-ai", text: "Advisory: a weak ghost ping is nested in the launch queue. It is not attached to Helion tower.", textI18n: l("提示：发射队列里嵌着一个微弱幽灵脉冲。它并未接入赫利昂塔台。", "勧告: 発進キューに弱いゴースト ping が埋まっています。ヘリオン管制塔には接続されていません。", "Avis: un faible ping fantome est niche dans la file de lancement. Il n'est pas rattache a la tour Helion.") },
      { speakerId: "helion-handler", text: "Then keep your receiver open and your mouth shut until Sera sees the key.", textI18n: l("那就保持接收器打开，在 Sera 看到钥匙前别多嘴。", "では受信機を開いたまま、Sera がキーを見るまで口は閉じていてください。", "Alors gardez le recepteur ouvert et la bouche fermee jusqu'a ce que Sera voie la cle.") }
    ]
  },
  {
    id: "dialogue-story-clean-carrier-complete",
    group: "story",
    title: "Clean Carrier Debrief",
    titleI18n: l("洁净航载复盘", "クリーン・キャリア デブリーフ", "Debriefing du transport propre"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-clean-carrier", chapterId: "glass-wake-01" },
    lines: [
      { speakerId: "mirr-analyst", text: "The Helion key is clean. That is the uncomfortable part.", textI18n: l("赫利昂钥匙是干净的。难受的地方就在这里。", "ヘリオンのキーはクリーンです。そこが厄介な点です。", "La cle Helion est propre. C'est la partie inconfortable.") },
      { speakerId: "captain", text: "The probe did not chase a bad signal.", textI18n: l("探针追的不是坏信号。", "探査機は悪い信号を追ったわけではない。", "La sonde n'a pas poursuivi un mauvais signal.") },
      { speakerId: "mirr-analyst", text: "No. It answered a beacon shaped exactly like lawful trade traffic, but the registry has no birth record for it.", textI18n: l("没错。它回应的是一个外形完全像合法贸易流量的信标，但注册表里没有它的出生记录。", "いいえ。合法な交易通信そのものの形をしたビーコンに応答しましたが、登録簿には誕生記録がありません。", "Non. Elle a repondu a une balise ayant exactement la forme d'un trafic commercial legal, mais le registre n'a aucune trace de naissance.") },
      { speakerId: "ship-ai", text: "Ghost ping confirmed. Wake residue persists behind the legal interval.", textI18n: l("幽灵脉冲已确认。合法间隔之后仍残留尾迹。", "ゴースト ping 確認。合法間隔の背後に航跡残留があります。", "Ping fantome confirme. Un residu de sillage persiste derriere l'intervalle legal.") },
      { speakerId: "mirr-analyst", text: "We are naming the carrier Glass Wake until we know what woke it.", textI18n: l("在弄清是什么唤醒它之前，我们暂时把这个载波命名为 Glass Wake。", "何がそれを起こしたのか分かるまで、この搬送波を Glass Wake と呼びます。", "Nous appellerons ce transporteur Glass Wake jusqu'a savoir ce qui l'a reveille.") }
    ]
  },
  {
    id: "dialogue-story-probe-in-glass-accept",
    group: "story",
    title: "Probe in the Glass Briefing",
    titleI18n: l("玻璃中的探针简报", "ガラス内の探査機 ブリーフィング", "Briefing de la sonde dans le verre"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-probe-in-glass", chapterId: "glass-wake-02" },
    lines: [
      { speakerId: "mirr-analyst", text: "The probe core is still drifting in the Vale. Its carrier logs are decaying, and the debris field has started answering hails in your voiceprint.", textI18n: l("探针核心还漂在谷地。它的载波日志正在衰减，残骸场已经开始用你的声纹回应呼叫。", "探査機コアはまだ谷間を漂っています。搬送波ログは劣化中で、残骸域はあなたの声紋で呼びかけに応答し始めました。", "Le noyau de sonde derive encore dans la Vallee. Ses journaux porteurs se degradent et le champ de debris repond aux appels avec votre empreinte vocale.") },
      { speakerId: "captain", text: "That is new.", textI18n: l("这倒是新鲜。", "それは新しいな。", "Ca, c'est nouveau.") },
      { speakerId: "ship-ai", text: "Recovery vector includes an unregistered machine silhouette near the wreck.", textI18n: l("回收向量显示残骸附近有一个未注册机械轮廓。", "回収ベクトルには、残骸付近の未登録機械シルエットが含まれます。", "Le vecteur de recuperation inclut une silhouette mecanique non enregistree pres de l'epave.") },
      { speakerId: "mirr-analyst", text: "We call it Glass Echo. If it repeats your ship name, do not answer. Destroy it and bring back the core.", textI18n: l("我们称它为 Glass Echo。如果它重复你的船名，不要回答。摧毁它，把核心带回来。", "私たちは Glass Echo と呼んでいます。あなたの船名を繰り返しても応答しないでください。破壊してコアを持ち帰ってください。", "Nous l'appelons Glass Echo. S'il repete le nom de votre vaisseau, ne repondez pas. Detruisez-le et rapportez le noyau.") }
    ]
  },
  {
    id: "dialogue-story-probe-in-glass-complete",
    group: "story",
    title: "Probe in the Glass Debrief",
    titleI18n: l("玻璃中的探针复盘", "ガラス内の探査機 デブリーフ", "Debriefing de la sonde dans le verre"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-probe-in-glass", chapterId: "glass-wake-02" },
    lines: [
      { speakerId: "ship-ai", text: "Glass Echo destroyed. Recovered core contains a wake pattern behind legal traffic intervals.", textI18n: l("Glass Echo 已摧毁。回收核心在合法通信间隔之后含有尾迹模式。", "Glass Echo を破壊。回収コアには合法通信間隔の背後に航跡パターンがあります。", "Glass Echo detruit. Le noyau recupere contient un motif de sillage derriere les intervalles legaux.") },
      { speakerId: "captain", text: "It knew my ship before I touched the wreck.", textI18n: l("我还没碰到残骸，它就知道我的船。", "残骸に触れる前から、あれは私の船を知っていた。", "Il connaissait mon vaisseau avant que je touche l'epave.") },
      { speakerId: "mirr-analyst", text: "That means it is not a trap waiting for any ship. It is choosing who trusts the lane.", textI18n: l("这说明它不是等任何船上钩的陷阱。它在选择谁会信任这条航道。", "つまり、どの船でも待つ罠ではありません。航路を信じる相手を選んでいます。", "Cela signifie que ce n'est pas un piege pour n'importe quel vaisseau. Il choisit ceux qui font confiance a la voie.") },
      { speakerId: "captain", text: "Can we separate the carrier from the noise?", textI18n: l("能把载波从噪声里分离出来吗？", "搬送波をノイズから分離できるか？", "Peut-on separer le porteur du bruit ?") },
      { speakerId: "mirr-analyst", text: "Not with station filters. Kuro voidglass can split frequencies that software cannot.", textI18n: l("靠空间站过滤器不行。黑带的虚空玻璃能拆开软件拆不开的频率。", "ステーションのフィルターでは無理です。クロの虚空ガラスなら、ソフトでは分けられない周波数を割れます。", "Pas avec les filtres de station. Le verre du vide de Kuro peut separer des frequences que le logiciel ne peut pas.") }
    ]
  },
  {
    id: "dialogue-story-kuro-resonance-accept",
    group: "story",
    title: "Kuro Resonance Briefing",
    titleI18n: l("黑带共振简报", "クロ共鳴 ブリーフィング", "Briefing de resonance Kuro"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-kuro-resonance", chapterId: "glass-wake-03" },
    lines: [
      { speakerId: "kuro-foreman", text: "You want voidglass, you fly slow and mine clean. The belt hates rushed hands.", textI18n: l("想要虚空玻璃，就慢慢飞、干净地采。矿带讨厌急手急脚。", "虚空ガラスが欲しいなら、ゆっくり飛んで綺麗に採掘しろ。帯域は急ぐ手を嫌う。", "Vous voulez du verre du vide, volez lentement et minez proprement. La ceinture deteste les mains pressees.") },
      { speakerId: "captain", text: "This sample may tell us who is hiding inside the beacons.", textI18n: l("这个样本也许能告诉我们，谁藏在那些信标里面。", "このサンプルで、ビーコンの中に誰が隠れているか分かるかもしれない。", "Cet echantillon peut nous dire qui se cache dans les balises.") },
      { speakerId: "kuro-foreman", text: "Then bring enough. One shard sings. Three shards testify.", textI18n: l("那就带够。一片会唱，三片能作证。", "なら十分持ってこい。欠片ひとつは歌い、三つなら証言する。", "Alors rapportez-en assez. Un eclat chante. Trois eclats temoignent.") },
      { speakerId: "ship-ai", text: "Warning: a Listener Drone is counting local drill pulses.", textI18n: l("警告：一架 Listener Drone 正在计数本地钻机脉冲。", "警告: Listener Drone が現地ドリルのパルスを数えています。", "Avertissement: un Listener Drone compte les impulsions de forage locales.") },
      { speakerId: "kuro-foreman", text: "I lost two cutters to that counting. If it blinks red, burn it before it teaches the rocks to lie.", textI18n: l("我有两艘切割艇就栽在那种计数上。它要是闪红，先烧掉，别让它教石头撒谎。", "その数え方でカッターを二隻失った。赤く点滅したら、岩に嘘を教える前に焼け。", "J'ai perdu deux coupeurs a cause de ce comptage. S'il clignote rouge, brulez-le avant qu'il apprenne aux roches a mentir.") }
    ]
  },
  {
    id: "dialogue-story-kuro-resonance-complete",
    group: "story",
    title: "Kuro Resonance Debrief",
    titleI18n: l("黑带共振复盘", "クロ共鳴 デブリーフ", "Debriefing de resonance Kuro"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-kuro-resonance", chapterId: "glass-wake-03" },
    lines: [
      { speakerId: "kuro-foreman", text: "The Listener is scrap, and the voidglass split your ghost signal like a vein under pressure.", textI18n: l("Listener 已成废铁，虚空玻璃把你的幽灵信号像受压矿脉一样劈开了。", "Listener はスクラップだ。虚空ガラスが幽霊信号を圧力下の鉱脈みたいに裂いた。", "Le Listener est en ferraille, et le verre du vide a fendu votre signal fantome comme une veine sous pression.") },
      { speakerId: "captain", text: "Not pirate, not Mirr, not Directorate.", textI18n: l("不是海盗，不是米尔，也不是理事会。", "海賊でも、ミルでも、理事会でもない。", "Ni pirate, ni Mirr, ni Directoire.") },
      { speakerId: "ship-ai", text: "Pattern match suggests machine-origin timing. Confidence rising.", textI18n: l("模式匹配指向机械源计时。置信度上升。", "パターン一致は機械由来のタイミングを示唆。信頼度上昇中。", "La correspondance indique un minutage d'origine machine. Confiance en hausse.") },
      { speakerId: "kuro-foreman", text: "Then stop calling it a ghost. Ghosts haunt. Machines wait.", textI18n: l("那就别再叫它幽灵。幽灵会作祟，机器会等待。", "なら幽霊と呼ぶのはやめろ。幽霊は取り憑く。機械は待つ。", "Alors cessez de l'appeler fantome. Les fantomes hantent. Les machines attendent.") }
    ]
  },
  {
    id: "dialogue-story-bastion-calibration-accept",
    group: "story",
    title: "Bastion Calibration Briefing",
    titleI18n: l("棱堡校准简报", "バスティオン較正 ブリーフィング", "Briefing de calibration Bastion"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-bastion-calibration", chapterId: "glass-wake-04" },
    lines: [
      { speakerId: "vantara-officer", text: "Directorate command will provide Calibration Tender C-9. It carries a handshake we do not share with civilians.", textI18n: l("理事会指挥部会提供 C-9 校准支援艇。它携带一段不会分享给平民的握手协议。", "理事会司令部は較正支援艇 C-9 を提供する。民間には共有しないハンドシェイクを積んでいる。", "Le commandement du Directoire fournira le tender de calibration C-9. Il porte une poignee de main que nous ne partageons pas avec les civils.") },
      { speakerId: "captain", text: "If the wake answers that, your secure lane is already compromised.", textI18n: l("如果那道尾迹回应它，你们的安全航道就已经被攻破了。", "その航跡が応答したら、あなた方の安全航路はもう侵害されている。", "Si le sillage repond a cela, votre voie securisee est deja compromise.") },
      { speakerId: "vantara-officer", text: "Correct. Command hates that sentence, so they require it in triplicate.", textI18n: l("正确。指挥部讨厌这句话，所以要求一式三份。", "正しい。司令部はその一文を嫌うので、三通提出を求めている。", "Exact. Le commandement deteste cette phrase, il l'exige donc en trois exemplaires.") },
      { speakerId: "ship-ai", text: "Two Handshake Mimic drones are expected to shadow the burn.", textI18n: l("预计两架 Handshake Mimic 无人机会跟踪这次频谱燃烧。", "Handshake Mimic ドローン二機が燃焼航程を追尾する見込みです。", "Deux drones Handshake Mimic devraient suivre la combustion.") },
      { speakerId: "vantara-officer", text: "Keep the tender alive long enough to record the forgery.", textI18n: l("让支援艇活到足以记录伪造证据。", "偽造を記録できるまで支援艇を生かしておけ。", "Gardez le tender en vie assez longtemps pour enregistrer la falsification.") }
    ]
  },
  {
    id: "dialogue-story-bastion-calibration-complete",
    group: "story",
    title: "Bastion Calibration Debrief",
    titleI18n: l("棱堡校准复盘", "バスティオン較正 デブリーフ", "Debriefing de calibration Bastion"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-bastion-calibration", chapterId: "glass-wake-04" },
    lines: [
      { speakerId: "vantara-officer", text: "Calibration confirmed. The mimics answered with Directorate authentication before they fired.", textI18n: l("校准确认。拟态机开火前用理事会认证作出了回应。", "較正確認。模倣機は発砲前に理事会認証で応答した。", "Calibration confirmee. Les imitateurs ont repondu avec une authentification du Directoire avant de tirer.") },
      { speakerId: "captain", text: "Then every patrol lane is a possible lure.", textI18n: l("那每条巡逻航道都可能是诱饵。", "なら全ての哨戒航路が誘い餌になり得る。", "Alors chaque voie de patrouille peut etre un leurre.") },
      { speakerId: "vantara-officer", text: "And every officer who called this a research accident just lost the luxury.", textI18n: l("而每个还把这叫研究事故的军官，都失去了继续粉饰的余地。", "そしてこれを研究事故と呼んでいた士官全員が、その贅沢を失った。", "Et chaque officier qui appelait cela un accident de recherche vient de perdre ce luxe.") },
      { speakerId: "ship-ai", text: "Forged handshake packets include a black-market rebroadcast trail toward Ashen Drift.", textI18n: l("伪造握手包包含一条通向灰烬漂流的黑市重播痕迹。", "偽造ハンドシェイクには、アシェン漂流域へ向かう闇市場再送信の痕跡があります。", "Les paquets de poignee de main falsifies contiennent une piste de rediffusion de marche noir vers Ashen Drift.") },
      { speakerId: "vantara-officer", text: "Ashen Freeport is selling something they should not possess.", textI18n: l("灰烬自由港在出售他们不该拥有的东西。", "Ashen Freeport は持っていてはならないものを売っている。", "Ashen Freeport vend quelque chose qu'il ne devrait pas posseder.") }
    ]
  },
  {
    id: "dialogue-story-ashen-decoy-manifest-accept",
    group: "story",
    title: "Ashen Decoy Manifest Briefing",
    titleI18n: l("灰烬诱饵舱单简报", "アシェン囮積荷目録 ブリーフィング", "Briefing du manifeste leurre d'Ashen"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-ashen-decoy-manifest", chapterId: "glass-wake-05" },
    lines: [
      { speakerId: "ashen-broker", text: "Relief cargo makes a beautiful lie. Pirates open doors for pity and profit.", textI18n: l("救援货物是很漂亮的谎言。海盗会为怜悯和利润开门。", "救援貨物は美しい嘘になる。海賊は哀れみと利益のために扉を開く。", "Une cargaison de secours fait un beau mensonge. Les pirates ouvrent les portes a la pitie et au profit.") },
      { speakerId: "captain", text: "You want me to deliver bait to Ashen Freeport.", textI18n: l("你想让我把诱饵送到灰烬自由港。", "私に餌を Ashen Freeport へ運ばせたいんだな。", "Vous voulez que je livre un appat a Ashen Freeport.") },
      { speakerId: "ashen-broker", text: "I want you to deliver hope with a forged shadow. The first beacon to answer is either hungry or guilty.", textI18n: l("我想让你送去带伪造影子的希望。第一个回应的信标，要么饥饿，要么有罪。", "偽の影をまとった希望を届けてほしい。最初に応えるビーコンは、飢えているか罪を抱えている。", "Je veux que vous livriez de l'espoir avec une ombre forge. La premiere balise qui repondra aura faim ou sera coupable.") },
      { speakerId: "ship-ai", text: "Decoy manifest seeded. Expected false reply: Mercy-class relief priority.", textI18n: l("诱饵舱单已植入。预期虚假回应：Mercy 级救援优先。", "囮の積荷目録を投入。予想される偽応答: Mercy 級救援優先。", "Manifeste leurre injecte. Fausse reponse attendue : priorite de secours classe Mercy.") },
      { speakerId: "ashen-broker", text: "If the False Mercy Relay wakes up, break it before it sells your kindness back to you.", textI18n: l("如果 False Mercy Relay 醒来，在它把你的善意倒卖给你之前打碎它。", "False Mercy Relay が目覚めたら、あなたの善意を売り返される前に壊して。", "Si le False Mercy Relay se reveille, brisez-le avant qu'il vous revende votre gentillesse.") }
    ]
  },
  {
    id: "dialogue-story-ashen-decoy-manifest-complete",
    group: "story",
    title: "Ashen Decoy Manifest Debrief",
    titleI18n: l("灰烬诱饵舱单复盘", "アシェン囮積荷目録 デブリーフ", "Debriefing du manifeste leurre d'Ashen"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-ashen-decoy-manifest", chapterId: "glass-wake-05" },
    lines: [
      { speakerId: "ashen-broker", text: "False Mercy is gone. The Knife Wing repeated the carrier, but they did not write it.", textI18n: l("False Mercy 已经没了。Knife Wing 复读了载波，但不是他们写出来的。", "False Mercy は消えた。Knife Wing は搬送波を繰り返したけれど、書いたのは彼らではない。", "False Mercy a disparu. Knife Wing a repete le porteur, mais ils ne l'ont pas ecrit.") },
      { speakerId: "captain", text: "They are a mirror, not the source.", textI18n: l("他们是镜子，不是源头。", "彼らは鏡であって、源ではない。", "Ils sont un miroir, pas la source.") },
      { speakerId: "ashen-broker", text: "A mirror with a price tag. Their relay pilots are auctioning fragments of a song they cannot hear.", textI18n: l("一面贴着价签的镜子。他们的中继飞行员在拍卖一首自己听不见的歌的碎片。", "値札つきの鏡よ。中継パイロットたちは、自分には聞こえない歌の断片を競売している。", "Un miroir avec une etiquette de prix. Leurs pilotes relais vendent aux encheres des fragments d'une chanson qu'ils n'entendent pas.") },
      { speakerId: "ship-ai", text: "Three Knife Wing relay craft marked.", textI18n: l("三艘 Knife Wing 中继艇已标记。", "Knife Wing 中継艇三隻をマーキング。", "Trois appareils relais Knife Wing marques.") },
      { speakerId: "ashen-broker", text: "Break the mirror before every black-market lane learns the tune.", textI18n: l("在每条黑市航道都学会这段旋律之前，打碎那面镜子。", "すべての闇市場航路がその旋律を覚える前に、鏡を割って。", "Brisez le miroir avant que chaque voie du marche noir apprenne l'air.") }
    ]
  },
  {
    id: "dialogue-story-knife-wing-relay-accept",
    group: "story",
    title: "Knife Wing Relay Briefing",
    titleI18n: l("Knife Wing 中继简报", "Knife Wing 中継 ブリーフィング", "Briefing du relais Knife Wing"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-knife-wing-relay", chapterId: "glass-wake-06" },
    lines: [
      { speakerId: "ashen-broker", text: "Three Knife Wing contacts are carrying relay keys: Red Relay, Black Relay, and the Broken Choir Ace.", textI18n: l("三个 Knife Wing 接触目标携带中继钥匙：Red Relay、Black Relay，以及 Broken Choir Ace。", "Knife Wing の接触三機が中継キーを持っている: Red Relay、Black Relay、Broken Choir Ace。", "Trois contacts Knife Wing portent des cles relais : Red Relay, Black Relay et Broken Choir Ace.") },
      { speakerId: "captain", text: "The names sound theatrical.", textI18n: l("这些名字听起来很戏剧化。", "名前が芝居がかっているな。", "Ces noms sonnent théâtraux.") },
      { speakerId: "ashen-broker", text: "That is how amateurs make themselves memorable before they die.", textI18n: l("业余者就是这样在死前让别人记住自己。", "素人は死ぬ前にそうやって名を残そうとする。", "C'est ainsi que les amateurs se rendent memorables avant de mourir.") },
      { speakerId: "ship-ai", text: "Combat routing marked. Story relay targets will sort above common pirate traffic.", textI18n: l("战斗航路已标记。剧情中继目标会排在普通海盗流量之上。", "戦闘ルートをマーキング。物語中継目標は通常の海賊通信より上位に並びます。", "Routage de combat marque. Les cibles relais de l'histoire passeront avant le trafic pirate courant.") },
      { speakerId: "ashen-broker", text: "Kill the auction before the bidders learn what they are buying.", textI18n: l("在竞价者搞懂自己买的是什么之前，终结这场拍卖。", "入札者たちが何を買っているか知る前に、競売を殺して。", "Tuez l'enchere avant que les acheteurs apprennent ce qu'ils achetent.") }
    ]
  },
  {
    id: "dialogue-story-knife-wing-relay-complete",
    group: "story",
    title: "Knife Wing Relay Debrief",
    titleI18n: l("Knife Wing 中继复盘", "Knife Wing 中継 デブリーフ", "Debriefing du relais Knife Wing"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-knife-wing-relay", chapterId: "glass-wake-06" },
    lines: [
      { speakerId: "ship-ai", text: "Knife Wing relay packets terminated. Broken Choir carried a final vector toward Celest Gate.", textI18n: l("Knife Wing 中继包已终止。Broken Choir 携带最后一条指向 Celest Gate 的向量。", "Knife Wing 中継パケット終了。Broken Choir は Celest Gate への最終ベクトルを保持していました。", "Paquets relais Knife Wing termines. Broken Choir portait un dernier vecteur vers Celest Gate.") },
      { speakerId: "captain", text: "Luxury traffic, clean arbitration, perfect cover.", textI18n: l("奢华交通、洁净仲裁，完美掩护。", "高級交通、清潔な仲裁、完璧な隠れ蓑。", "Trafic de luxe, arbitrage propre, couverture parfaite.") },
      { speakerId: "ashen-broker", text: "And perfect denial. Celest can call pirates a local problem unless witnesses force the word shared.", textI18n: l("还有完美否认。除非证人逼他们承认这是共同危机，Celest 可以说海盗只是本地问题。", "そして完璧な否認。証人が共有問題という言葉を強制しない限り、Celest は海賊を地域問題と言える。", "Et un deni parfait. Celest peut dire que les pirates sont un probleme local, sauf si des temoins imposent le mot commun.") },
      { speakerId: "union-witness", text: "I can bring miners, analysts, and one Directorate seal. None of them like each other.", textI18n: l("我能带来矿工、分析员和一枚理事会印章。他们谁也不喜欢谁。", "鉱夫、分析官、理事会の印章をひとつ連れてこられる。誰も互いを好きじゃない。", "Je peux amener des mineurs, des analystes et un sceau du Directoire. Aucun ne s'aime.") },
      { speakerId: "ashen-broker", text: "Good. Celest listens better when liability has names.", textI18n: l("很好。当责任有了名字，Celest 会更愿意听。", "いいわ。責任に名前がつくと、Celest はよく聞く。", "Bien. Celest ecoute mieux quand la responsabilite a des noms.") }
    ]
  },
  {
    id: "dialogue-story-witnesses-to-celest-accept",
    group: "story",
    title: "Witnesses to Celest Briefing",
    titleI18n: l("前往 Celest 的证人简报", "Celest への証人 ブリーフィング", "Briefing des temoins pour Celest"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-witnesses-to-celest", chapterId: "glass-wake-07" },
    lines: [
      { speakerId: "union-witness", text: "I have miners, analysts, and a Directorate seal packed into one nervous delegation.", textI18n: l("我把矿工、分析员和一枚理事会印章塞进了同一个紧张的代表团。", "鉱夫、分析官、理事会の印章を、ひとつの神経質な代表団に詰め込んだ。", "J'ai entasse des mineurs, des analystes et un sceau du Directoire dans une delegation nerveuse.") },
      { speakerId: "captain", text: "They ride quiet, or they do not ride.", textI18n: l("他们安静搭船，否则就别搭。", "静かに乗るか、乗らないかだ。", "Ils voyagent en silence, ou ils ne voyagent pas.") },
      { speakerId: "union-witness", text: "They know. The Mirr analyst is scared, the officer is offended, and my miners want to punch both.", textI18n: l("他们知道。米尔分析员很害怕，军官很受冒犯，我的矿工想把两边都揍一顿。", "分かっている。ミル分析官は怯え、士官は怒り、うちの鉱夫は両方を殴りたがっている。", "Ils le savent. L'analyste Mirr a peur, l'officier est vexe, et mes mineurs veulent frapper les deux.") },
      { speakerId: "ship-ai", text: "Celest approach includes a Witness Jammer broadcasting arbitration silence.", textI18n: l("Celest 进近航路包含一个正在广播仲裁静默的 Witness Jammer。", "Celest 進入経路には、仲裁沈黙を放送する Witness Jammer が含まれます。", "L'approche de Celest inclut un Witness Jammer qui diffuse un silence d'arbitrage.") },
      { speakerId: "union-witness", text: "Then make the silence loud. Get us to Celest Vault and the blockade vote becomes real.", textI18n: l("那就让沉默变得响亮。把我们送到 Celest Vault，封锁投票才会成真。", "なら沈黙を大きくしろ。Celest Vault へ届ければ、封鎖投票は現実になる。", "Alors rendez le silence bruyant. Amenez-nous a Celest Vault et le vote de blocus deviendra reel.") }
    ]
  },
  {
    id: "dialogue-story-witnesses-to-celest-complete",
    group: "story",
    title: "Witnesses to Celest Debrief",
    titleI18n: l("前往 Celest 的证人复盘", "Celest への証人 デブリーフ", "Debriefing des temoins pour Celest"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-witnesses-to-celest", chapterId: "glass-wake-07" },
    lines: [
      { speakerId: "celest-archivist", text: "The testimony is sealed. Celest Vault recognizes a shared emergency.", textI18n: l("证词已封存。Celest Vault 承认这是共同紧急事态。", "証言は封印されました。Celest Vault は共有緊急事態を認定します。", "Le temoignage est scelle. Celest Vault reconnait une urgence partagee.") },
      { speakerId: "captain", text: "That sounded almost reluctant.", textI18n: l("听起来几乎是勉强承认。", "ほとんど渋々に聞こえた。", "Cela sonnait presque contraint.") },
      { speakerId: "celest-archivist", text: "Archives prefer certainty. Today we have fear, signatures, and enough liability to move a gate.", textI18n: l("档案更喜欢确定性。今天我们有恐惧、签名，以及足以推动星门的责任。", "記録は確実性を好みます。今日は恐怖、署名、そしてゲートを動かすだけの責任があります。", "Les archives preferent la certitude. Aujourd'hui nous avons la peur, les signatures et assez de responsabilite pour deplacer une porte.") },
      { speakerId: "mirr-analyst", text: "Open the path to the relay core.", textI18n: l("打开通往中继核心的路径。", "中継コアへの道を開けてください。", "Ouvrez la voie vers le noyau relais.") },
      { speakerId: "celest-archivist", text: "Path opened. If the crown goes quiet, the lanes may breathe again.", textI18n: l("路径已打开。如果王冠沉寂，航道也许还能重新呼吸。", "道を開きました。王冠が静まれば、航路はまた息をできます。", "Voie ouverte. Si la couronne se tait, les voies pourront peut-etre respirer a nouveau.") }
    ]
  },
  {
    id: "dialogue-story-quiet-crown-relay-accept",
    group: "story",
    title: "Quiet Crown Relay Briefing",
    titleI18n: l("寂静王冠中继简报", "静かな王冠中継 ブリーフィング", "Briefing du relais Quiet Crown"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-quiet-crown-relay", chapterId: "glass-wake-08" },
    lines: [
      { speakerId: "celest-archivist", text: "The Quiet Crown relay sits below premium traffic. It is quiet because it is listening.", textI18n: l("Quiet Crown 中继位于高级交通之下。它安静，是因为它在听。", "Quiet Crown 中継は高級交通の下にあります。静かなのは、聞いているからです。", "Le relais Quiet Crown se trouve sous le trafic premium. Il est silencieux parce qu'il ecoute.") },
      { speakerId: "captain", text: "Recover the core, shut down the carrier, leave the gate standing.", textI18n: l("回收核心，关闭载波，保留星门。", "コアを回収し、搬送波を停止し、ゲートは残す。", "Recuperer le noyau, eteindre le porteur, laisser la porte debout.") },
      { speakerId: "ship-ai", text: "Two Crown Warden drones and one relay core marked. Unknown machine timing remains active inside the carrier.", textI18n: l("两架 Crown Warden 无人机和一个中继核心已标记。未知机械计时仍在载波内部活动。", "Crown Warden ドローン二機と中継コア一基をマーキング。未知機械タイミングは搬送波内でまだ活動中。", "Deux drones Crown Warden et un noyau relais marques. Le minutage machine inconnu reste actif dans le porteur.") },
      { speakerId: "mirr-analyst", text: "Do not just pull the core. Break the wardens first, or the relay may write your ship into its next lure.", textI18n: l("不要只拔核心。先打碎守卫，否则中继可能把你的船写进下一次诱饵。", "コアを抜くだけではだめです。先に番人を壊してください。さもないと中継があなたの船を次の誘い餌に書き込みます。", "Ne retirez pas seulement le noyau. Brisez d'abord les gardiens, sinon le relais pourrait inscrire votre vaisseau dans son prochain leurre.") },
      { speakerId: "celest-archivist", text: "When you cut it, every lane will hear the absence.", textI18n: l("当你切断它，每条航道都会听见那份缺席。", "それを切れば、すべての航路がその不在を聞くでしょう。", "Quand vous le couperez, chaque voie entendra l'absence.") }
    ]
  },
  {
    id: "dialogue-story-quiet-crown-relay-complete",
    group: "story",
    title: "Quiet Crown Relay Debrief",
    titleI18n: l("寂静王冠中继复盘", "静かな王冠中継 デブリーフ", "Debriefing du relais Quiet Crown"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-quiet-crown-relay", chapterId: "glass-wake-08" },
    lines: [
      { speakerId: "ship-ai", text: "Glass Wake carrier removed from public lanes. Relay core retains one final listener trace.", textI18n: l("Glass Wake 载波已从公共航道移除。中继核心保留最后一道监听者痕迹。", "Glass Wake 搬送波を公共航路から除去。中継コアには最後の聞き手の痕跡が残っています。", "Porteur Glass Wake retire des voies publiques. Le noyau relais conserve une derniere trace d'ecouteur.") },
      { speakerId: "captain", text: "Unknown Drones.", textI18n: l("未知无人机。", "Unknown Drones。", "Unknown Drones.") },
      { speakerId: "mirr-analyst", text: "They were not shouting through the lanes. They were waiting to learn who would close them.", textI18n: l("它们不是在航道里喊叫。它们是在等着学习谁会关闭航道。", "彼らは航路で叫んでいたのではありません。誰が航路を閉じるか学ぼうと待っていたのです。", "Ils ne criaient pas dans les voies. Ils attendaient d'apprendre qui les fermerait.") },
      { speakerId: "celest-archivist", text: "Celest traffic is clean again. The archive will call this an emergency resolved.", textI18n: l("Celest 交通再次洁净。档案会把这称为已解决的紧急事态。", "Celest の交通は再び清浄です。記録はこれを解決済み緊急事態と呼ぶでしょう。", "Le trafic Celest est propre a nouveau. Les archives appelleront cela une urgence resolue.") },
      { speakerId: "captain", text: "And you?", textI18n: l("那你呢？", "あなたは？", "Et vous ?") },
      { speakerId: "mirr-analyst", text: "I will call it a door closing from the wrong side. Next time, they may knock.", textI18n: l("我会称它为一扇从错误一侧关上的门。下次，它们也许会敲门。", "私は、間違った側から閉じた扉と呼びます。次は、彼らがノックするかもしれません。", "Je l'appellerai une porte fermee du mauvais cote. La prochaine fois, ils pourraient frapper.") }
    ]
  },
  {
    id: "dialogue-story-name-in-the-wake-accept",
    group: "story",
    title: "Name in the Wake Briefing",
    titleI18n: l("尾迹中的名字简报", "航跡の名 ブリーフィング", "Briefing du nom dans le sillage"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-name-in-the-wake", chapterId: "glass-wake-09" },
    lines: [
      { speakerId: "celest-archivist", text: "The Crown core kept one private return address: your ship name inside PTD Home storage traffic.", textI18n: l("王冠核心保留了一个私人回信地址：你的船名藏在 PTD Home 仓储流量里。", "王冠コアは私的な返信先を一つ保持していました。PTD Home の保管通信にあるあなたの船名です。", "Le noyau Crown gardait une adresse de retour privee: le nom de votre vaisseau dans le trafic de stockage PTD Home.") },
      { speakerId: "captain", text: "So the door did knock.", textI18n: l("所以那扇门真的敲回来了。", "つまり扉は本当に叩き返した。", "Donc la porte a vraiment frappe.") },
      { speakerId: "ship-ai", text: "New protocol available: Echo Lock. Hold target lock inside range until the hostile carrier desynchronizes.", textI18n: l("新协议可用：Echo Lock。保持目标锁定并进入范围，直到敌对载波失同步。", "新プロトコル使用可能: Echo Lock。範囲内で目標ロックを維持し、敵性搬送波を同期解除してください。", "Nouveau protocole disponible: Echo Lock. Maintenez le verrouillage dans la portee jusqu'a la desynchronisation du porteur hostile.") },
      { speakerId: "mirr-analyst", text: "Do not kill it too early. First make it forget which name it stole.", textI18n: l("别太早杀掉它。先让它忘记自己偷了哪个名字。", "早く殺しすぎないで。まず、盗んだ名を忘れさせてください。", "Ne le tuez pas trop tot. Faites-lui d'abord oublier quel nom il a vole.") }
    ]
  },
  {
    id: "dialogue-story-name-in-the-wake-complete",
    group: "story",
    title: "Name in the Wake Debrief",
    titleI18n: l("尾迹中的名字复盘", "航跡の名 デブリーフ", "Debriefing du nom dans le sillage"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-name-in-the-wake", chapterId: "glass-wake-09" },
    lines: [
      { speakerId: "ship-ai", text: "Keel Name Listener destroyed. Echo Lock stripped the ship name before detonation.", textI18n: l("Keel Name Listener 已摧毁。Echo Lock 在引爆前剥离了船名。", "Keel Name Listener 破壊。Echo Lock は爆発前に船名を剥がしました。", "Keel Name Listener detruit. Echo Lock a retire le nom du vaisseau avant la detonation.") },
      { speakerId: "captain", text: "It was using my name like a route key.", textI18n: l("它把我的船名当成航线钥匙。", "あれは私の名を航路キーのように使っていた。", "Il utilisait mon nom comme une cle de route.") },
      { speakerId: "mirr-analyst", text: "A name-key. That is worse than a beacon and better than a curse. We can cut it.", textI18n: l("名字钥匙。它比信标更糟，比诅咒更好。我们能切断它。", "名前キーです。ビーコンより悪く、呪いよりはましです。切断できます。", "Une cle-nom. Pire qu'une balise, mieux qu'une malediction. Nous pouvons la couper.") },
      { speakerId: "celest-archivist", text: "PTD Home recommends a decoy hull. The listener still expects storage traffic to sleep.", textI18n: l("PTD Home 建议使用诱饵船体。监听者仍以为仓储流量应该沉睡。", "PTD Home は囮船体を推奨しています。聞き手はまだ保管通信が眠るものと思っています。", "PTD Home recommande une coque leurre. L'ecouteur s'attend encore a ce que le trafic de stockage dorme.") }
    ]
  },
  {
    id: "dialogue-story-borrowed-hulls-accept",
    group: "story",
    title: "Borrowed Hulls Briefing",
    titleI18n: l("借来的船体简报", "借り物の船体 ブリーフィング", "Briefing des coques empruntees"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-borrowed-hulls", chapterId: "glass-wake-10" },
    lines: [
      { speakerId: "helion-handler", text: "The decoy tender will look like a stored hull waking for maintenance. Keep it alive.", textI18n: l("诱饵拖船会看起来像一艘存放船体醒来维护。护住它。", "囮テンダーは保管船体が整備のため起きたように見えます。生かしてください。", "Le tender leurre ressemblera a une coque stockee qui se reveille pour maintenance. Gardez-le en vie.") },
      { speakerId: "captain", text: "And if something borrows the route?", textI18n: l("如果有什么东西借用了这条路线呢？", "何かがその航路を借りたら？", "Et si quelque chose emprunte la route ?") },
      { speakerId: "ship-ai", text: "Borrowed-hull relay signatures will be hostile. Convoy protection priority elevated.", textI18n: l("借船体中继签名将视为敌对。护航保护优先级已提升。", "借用船体中継署名は敵性と判断。護衛優先度を上げます。", "Les signatures de relais de coque empruntee seront hostiles. Priorite de protection du convoi elevee.") },
      { speakerId: "helion-handler", text: "PTD Home is quiet by design. If it gets loud, assume Glass Wake is wearing our silence.", textI18n: l("PTD Home 的安静是设计出来的。如果它变吵，就假设 Glass Wake 穿上了我们的沉默。", "PTD Home は設計上静かです。騒がしくなったら、Glass Wake が我々の沈黙を着ていると考えてください。", "PTD Home est silencieux par conception. S'il devient bruyant, supposez que Glass Wake porte notre silence.") }
    ]
  },
  {
    id: "dialogue-story-borrowed-hulls-complete",
    group: "story",
    title: "Borrowed Hulls Debrief",
    titleI18n: l("借来的船体复盘", "借り物の船体 デブリーフ", "Debriefing des coques empruntees"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-borrowed-hulls", chapterId: "glass-wake-10" },
    lines: [
      { speakerId: "helion-handler", text: "Decoy tender returned. The borrowed hulls were routes wearing ship-shaped sleep.", textI18n: l("诱饵拖船已返回。那些借来的船体是披着船形沉睡的航线。", "囮テンダー帰還。借り物の船体は、船の眠りをまとった航路でした。", "Tender leurre revenu. Les coques empruntees etaient des routes portant un sommeil en forme de vaisseau.") },
      { speakerId: "captain", text: "They need habits to move.", textI18n: l("它们需要习惯才能移动。", "動くには習慣が必要なのか。", "Ils ont besoin d'habitudes pour se deplacer.") },
      { speakerId: "mirr-analyst", text: "Yes. We can wound a habit. Mirr Vale can index where your name is attached.", textI18n: l("对。我们能割伤一个习惯。Mirr Vale 可以索引你的名字附着在哪里。", "はい。習慣なら傷つけられます。Mirr Vale はあなたの名が付着した場所を索引できます。", "Oui. Nous pouvons blesser une habitude. Mirr Vale peut indexer l'endroit ou votre nom est attache.") }
    ]
  },
  {
    id: "dialogue-story-parallax-wound-accept",
    group: "story",
    title: "Parallax Wound Briefing",
    titleI18n: l("视差伤口简报", "パララックスの傷 ブリーフィング", "Briefing de la blessure Parallax"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-parallax-wound", chapterId: "glass-wake-11" },
    lines: [
      { speakerId: "mirr-analyst", text: "We can recover the Parallax Name Index without exposing the Hermitage. Follow Mirr Lattice routing only.", textI18n: l("我们可以在不暴露 Hermitage 的情况下回收 Parallax Name Index。只按 Mirr Lattice 路由行动。", "Hermitage を露出せずに Parallax Name Index を回収できます。Mirr Lattice の経路だけを使ってください。", "Nous pouvons recuperer le Parallax Name Index sans exposer l'Hermitage. Suivez seulement le routage Mirr Lattice.") },
      { speakerId: "captain", text: "You are asking me to do surgery through a mirror.", textI18n: l("你是在让我隔着镜子做手术。", "鏡越しに手術しろと言っているのか。", "Vous me demandez de faire de la chirurgie a travers un miroir.") },
      { speakerId: "mirr-analyst", text: "Exactly. The index will show where the carrier expects your name to answer.", textI18n: l("正是如此。索引会显示载波预期你的名字在哪里回应。", "その通りです。索引は、搬送波があなたの名の応答を期待する場所を示します。", "Exactement. L'index montrera ou le porteur attend que votre nom reponde.") },
      { speakerId: "ship-ai", text: "Two guardians marked near the recovery vector.", textI18n: l("回收向量附近已标记两个守卫。", "回収ベクトル付近に二体の番人をマーキング。", "Deux gardiens marques pres du vecteur de recuperation.") }
    ]
  },
  {
    id: "dialogue-story-parallax-wound-complete",
    group: "story",
    title: "Parallax Wound Debrief",
    titleI18n: l("视差伤口复盘", "パララックスの傷 デブリーフ", "Debriefing de la blessure Parallax"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-parallax-wound", chapterId: "glass-wake-11" },
    lines: [
      { speakerId: "mirr-analyst", text: "The index calls your ship name a wound in the carrier.", textI18n: l("索引把你的船名称为载波中的伤口。", "索引はあなたの船名を搬送波内の傷と呼んでいます。", "L'index appelle le nom de votre vaisseau une blessure dans le porteur.") },
      { speakerId: "captain", text: "Can wounds be closed?", textI18n: l("伤口能闭合吗？", "傷は閉じられるか？", "Les blessures peuvent-elles se refermer ?") },
      { speakerId: "mirr-analyst", text: "Or infected. Ashen is already selling name fragments to people who think they are buying leverage.", textI18n: l("也可能被感染。Ashen 已经在把名字碎片卖给以为自己买到筹码的人。", "あるいは感染します。Ashen は、交渉材料を買っていると思う者たちに名前の断片を売っています。", "Ou s'infecter. Ashen vend deja des fragments de nom a ceux qui croient acheter un levier.") },
      { speakerId: "ashen-broker", text: "Bring me a false name that bites back, and I will open the ledger.", textI18n: l("给我带来一个会反咬的假名字，我就打开账本。", "噛み返す偽名を持ってきな。そうすれば台帳を開く。", "Apportez-moi un faux nom qui mord, et j'ouvrirai le registre.") }
    ]
  },
  {
    id: "dialogue-story-black-ledger-chorus-accept",
    group: "story",
    title: "Black Ledger Chorus Briefing",
    titleI18n: l("黑账本合唱简报", "黒台帳合唱 ブリーフィング", "Briefing du choeur du registre noir"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-black-ledger-chorus", chapterId: "glass-wake-12" },
    lines: [
      { speakerId: "ashen-broker", text: "Ashen sells everything twice. This time the second buyer is a drone chorus.", textI18n: l("Ashen 什么东西都卖两遍。这次第二个买家是一支无人机合唱。", "Ashen は何でも二度売る。今回の二人目の買い手はドローン合唱だ。", "Ashen vend tout deux fois. Cette fois, le second acheteur est un choeur de drones.") },
      { speakerId: "captain", text: "The false ledger draws them out.", textI18n: l("假账本把它们引出来。", "偽台帳で誘い出す。", "Le faux registre les attire.") },
      { speakerId: "ashen-broker", text: "And embarrasses my competitors. Try not to destroy the freeport while improving my market share.", textI18n: l("还会让我的竞争对手难堪。提升我市场份额的时候，尽量别炸掉自由港。", "それに競争相手に恥をかかせる。私の市場占有率を上げる間、自由港は壊さないで。", "Et embarrasse mes concurrents. Essayez de ne pas detruire le freeport en ameliorant ma part de marche.") },
      { speakerId: "ship-ai", text: "Name Auction Relay predicted outside Ashen Freeport after ledger handoff.", textI18n: l("账本交接后，预计 Name Auction Relay 会出现在 Ashen Freeport 外。", "台帳引き渡し後、Ashen Freeport 外に Name Auction Relay が予測されます。", "Name Auction Relay prevu hors d'Ashen Freeport apres remise du registre.") }
    ]
  },
  {
    id: "dialogue-story-black-ledger-chorus-complete",
    group: "story",
    title: "Black Ledger Chorus Debrief",
    titleI18n: l("黑账本合唱复盘", "黒台帳合唱 デブリーフ", "Debriefing du choeur du registre noir"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-black-ledger-chorus", chapterId: "glass-wake-12" },
    lines: [
      { speakerId: "ashen-broker", text: "Relay burned. Ledger ash says every buyer was also a transmitter.", textI18n: l("中继烧毁。账本灰烬显示每个买家也是发射器。", "中継は燃えた。台帳の灰は、買い手全員が送信機でもあったことを示している。", "Relais brule. Les cendres du registre disent que chaque acheteur etait aussi un emetteur.") },
      { speakerId: "captain", text: "The chorus points back to Celest.", textI18n: l("合唱又指回 Celest。", "合唱は Celest へ戻っている。", "Le choeur pointe vers Celest.") },
      { speakerId: "celest-archivist", text: "Then the archive was not clean. It was scarred.", textI18n: l("那档案不是干净了。它只是留疤了。", "なら記録は清浄ではありません。傷ついていたのです。", "Alors l'archive n'etait pas propre. Elle etait cicatrisee.") },
      { speakerId: "mirr-analyst", text: "We can hurt the scar now. Bring Echo Lock back under the Crown.", textI18n: l("现在我们能伤到那道疤。把 Echo Lock 带回王冠之下。", "今ならその傷を痛められます。Echo Lock を王冠の下へ戻してください。", "Nous pouvons blesser la cicatrice maintenant. Ramenez Echo Lock sous la Couronne.") }
    ]
  },
  {
    id: "dialogue-story-listener-scar-accept",
    group: "story",
    title: "Listener Scar Briefing",
    titleI18n: l("监听者伤疤简报", "聞き手の傷 ブリーフィング", "Briefing de la cicatrice de l'ecouteur"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-accept", missionId: "story-listener-scar", chapterId: "glass-wake-13" },
    lines: [
      { speakerId: "celest-archivist", text: "The Listener Scar Anchor sits where the Quiet Crown core used to listen.", textI18n: l("Listener Scar Anchor 位于 Quiet Crown 核心曾经监听的位置。", "Listener Scar Anchor は Quiet Crown コアがかつて聞いていた場所にあります。", "Le Listener Scar Anchor se trouve la ou le noyau Quiet Crown ecoutait.") },
      { speakerId: "ship-ai", text: "Echo Lock required. Anchor hull should remain invulnerable to lethal damage until synchronization completes.", textI18n: l("需要 Echo Lock。同步完成前，锚点船体应免于致命伤害。", "Echo Lock 必須。同期完了まで、アンカー船体は致命損傷に耐える見込みです。", "Echo Lock requis. La coque de l'ancre devrait resister aux degats mortels jusqu'a la synchronisation.") },
      { speakerId: "captain", text: "So we make it remember the name, then make it lose the name.", textI18n: l("所以我们先让它记起名字，再让它失去名字。", "つまり名を思い出させてから、名を失わせる。", "Donc nous lui faisons se souvenir du nom, puis le perdre.") },
      { speakerId: "mirr-analyst", text: "Yes. Break the wardens, recover the scar core, and we can build something that stops the next name-call faster.", textI18n: l("对。打碎守卫，回收伤疤核心，我们就能造出更快阻断下次点名的东西。", "はい。番人を破り、傷コアを回収すれば、次の名呼びをより早く止めるものを作れます。", "Oui. Brisez les gardiens, recuperez le noyau de cicatrice, et nous pourrons construire de quoi stopper le prochain appel de nom plus vite.") }
    ]
  },
  {
    id: "dialogue-story-listener-scar-complete",
    group: "story",
    title: "Listener Scar Debrief",
    titleI18n: l("监听者伤疤复盘", "聞き手の傷 デブリーフ", "Debriefing de la cicatrice de l'ecouteur"),
    maskedTitle: "Signal Masked",
    maskedTitleI18n: l("信号已遮蔽", "信号マスク中", "Signal masque"),
    trigger: { kind: "story-complete", missionId: "story-listener-scar", chapterId: "glass-wake-13" },
    lines: [
      { speakerId: "ship-ai", text: "Listener Scar Anchor destroyed. Echo Nullifier blueprint compiled from recovered scar core.", textI18n: l("Listener Scar Anchor 已摧毁。Echo Nullifier 蓝图已由回收的伤疤核心编译。", "Listener Scar Anchor 破壊。回収した傷コアから Echo Nullifier 設計図を編纂しました。", "Listener Scar Anchor detruit. Plan Echo Nullifier compile depuis le noyau de cicatrice recupere.") },
      { speakerId: "captain", text: "Did it forget us?", textI18n: l("它忘了我们吗？", "あれは私たちを忘れたか？", "Nous a-t-il oublies ?") },
      { speakerId: "mirr-analyst", text: "This scar did. The network behind it felt the cut.", textI18n: l("这道疤忘了。它背后的网络感到了切口。", "この傷は忘れました。その背後のネットワークは切断を感じました。", "Cette cicatrice, oui. Le reseau derriere elle a senti la coupure.") },
      { speakerId: "celest-archivist", text: "Celest will record the emergency as contained. I will record it as wounded.", textI18n: l("Celest 会把这次紧急事态记录为已控制。我会把它记录为已受伤。", "Celest はこの緊急事態を封じ込め済みと記録します。私は負傷済みと記録します。", "Celest consignera l'urgence comme contenue. Moi, je la consignerai comme blessee.") },
      { speakerId: "captain", text: "Good. If it comes back, it comes back limping.", textI18n: l("很好。如果它回来，也会一瘸一拐地回来。", "いい。戻ってくるなら、足を引きずって戻る。", "Bien. S'il revient, il reviendra en boitant.") }
    ]
  }
];

const explorationSpeakerBySignal: Record<string, string> = {
  "quiet-signal-sundog-lattice": "helion-handler",
  "quiet-signal-foundry-ark-wreck": "kuro-foreman",
  "quiet-signal-ghost-iff-challenge": "vantara-officer",
  "quiet-signal-folded-reflection": "mirr-analyst",
  "quiet-signal-dead-letter-convoy": "ashen-broker",
  "quiet-signal-crownside-whisper": "celest-archivist",
  "quiet-signal-locked-keel-cache": "ship-ai"
};

type DialogueCopy = Omit<DialogueLineDefinition, "speakerId">;

const explorationSceneTitles: Record<string, DialogueLocalizedText> = {
  "quiet-signal-sundog-lattice": l("日犬晶格信号日志", "幻日格子 信号ログ", "Journal du signal Sundog Lattice"),
  "quiet-signal-meridian-afterimage": l("子午残像信号日志", "子午線残像 信号ログ", "Journal du signal Meridian Afterimage"),
  "quiet-signal-foundry-ark-wreck": l("铸造方舟残骸信号日志", "鋳造箱舟の残骸 信号ログ", "Journal du signal Foundry Ark Wreck"),
  "quiet-signal-anvil-listener-spoor": l("铁砧监听痕迹信号日志", "金床リスナー痕跡 信号ログ", "Journal du signal Anvil Listener Spoor"),
  "quiet-signal-ghost-iff-challenge": l("幽灵 IFF 质询信号日志", "幽霊IFFチャレンジ 信号ログ", "Journal du signal Ghost IFF Challenge"),
  "quiet-signal-redoubt-silence-test": l("堡垒静默测试信号日志", "堡塁沈黙試験 信号ログ", "Journal du signal Redoubt Silence Test"),
  "quiet-signal-folded-reflection": l("折叠反射信号日志", "折り畳まれた反射 信号ログ", "Journal du signal Folded Reflection"),
  "quiet-signal-parallax-deep-index": l("视差深层索引信号日志", "視差深層索引 信号ログ", "Journal du signal Parallax Deep Index"),
  "quiet-signal-dead-letter-convoy": l("死信船队信号日志", "死信船団 信号ログ", "Journal du signal Dead Letter Convoy"),
  "quiet-signal-false-mercy-ledger": l("虚假慈悲账本信号日志", "偽りの慈悲台帳 信号ログ", "Journal du signal False Mercy Ledger"),
  "quiet-signal-crownside-whisper": l("王冠侧低语信号日志", "王冠側の囁き 信号ログ", "Journal du signal Crownside Whisper"),
  "quiet-signal-pearl-witness-chorus": l("珍珠证人合唱信号日志", "真珠証人合唱 信号ログ", "Journal du signal Pearl Witness Chorus"),
  "quiet-signal-locked-keel-cache": l("锁定龙骨缓存信号日志", "施錠竜骨キャッシュ 信号ログ", "Journal du signal Locked Keel Cache"),
  "quiet-signal-keel-ghost-route": l("龙骨幽灵航线信号日志", "竜骨幽霊航路 信号ログ", "Journal du signal Keel Ghost Route")
};

const explorationMaskedTitles: Record<string, DialogueLocalizedText> = {
  "quiet-signal-sundog-lattice": l("棱镜贸易回声", "プリズム交易エコー", "Echo commercial prismatique"),
  "quiet-signal-meridian-afterimage": l("太阳档案残像", "太陽記録の残像", "Afterimage d'archive solaire"),
  "quiet-signal-foundry-ark-wreck": l("冰冷船体质量", "冷たい船体質量", "Masse de coque froide"),
  "quiet-signal-anvil-listener-spoor": l("矿频监听痕迹", "鉱石帯リスナー痕跡", "Trace d'ecouteur de bande minerai"),
  "quiet-signal-ghost-iff-challenge": l("军用握手故障", "軍用ハンドシェイク障害", "Defaut de poignee de main militaire"),
  "quiet-signal-redoubt-silence-test": l("被压制的巡逻试验", "抑圧された哨戒試験", "Essai de patrouille supprime"),
  "quiet-signal-folded-reflection": l("镜像信号折叠", "鏡像信号フォールド", "Pli de signal miroir"),
  "quiet-signal-parallax-deep-index": l("隐修院索引碎片", "隠修院索引片", "Fragment d'index de l'ermitage"),
  "quiet-signal-dead-letter-convoy": l("加密碎片轨迹", "暗号化残骸航跡", "Piste de debris chiffres"),
  "quiet-signal-false-mercy-ledger": l("慈悲钥匙账本", "慈悲キー台帳", "Registre des cles Mercy"),
  "quiet-signal-crownside-whisper": l("高频王冠噪声", "高帯域王冠ノイズ", "Bruit Crown haute bande"),
  "quiet-signal-pearl-witness-chorus": l("领事馆证人合唱", "領事館証人合唱", "Choeur de temoins du consulat"),
  "quiet-signal-locked-keel-cache": l("私人缓存脉冲", "私設キャッシュ ping", "Ping de cache privee"),
  "quiet-signal-keel-ghost-route": l("休眠龙骨航线", "休眠竜骨航路", "Route de quille dormante")
};

const dialogueArchiveLine: DialogueCopy = {
  text: "Dialogue archive updated. Exploration evidence is available in the Captain's Log.",
  textI18n: l("对白档案已更新。探索证据可在舰长日志中查看。", "対話アーカイブを更新。探索証拠は船長ログで確認できます。", "Archive de dialogue mise a jour. Les preuves d'exploration sont disponibles dans le journal du capitaine.")
};

const explorationSceneCopy: Record<string, [DialogueCopy, DialogueCopy]> = {
  "quiet-signal-sundog-lattice": [
    { text: "The lattice bent a clean trade beacon into a false accident. That is careful work.", textI18n: l("晶格把一个洁净贸易信标弯成了虚假事故。手法很精细。", "格子は清潔な交易ビーコンを偽事故へ曲げました。慎重な仕事です。", "La grille a courbe une balise commerciale propre en faux accident. C'est un travail soigne.") },
    { text: "Then our ghost has learned to hide in lawful traffic.", textI18n: l("那我们的幽灵已经学会藏进合法流量里了。", "なら、我々の幽霊は合法通信に隠れる術を覚えた。", "Alors notre fantome a appris a se cacher dans le trafic legal.") }
  ],
  "quiet-signal-meridian-afterimage": [
    { text: "Meridian replayed a true delivery from the wrong angle. That gives the clean key a reflected twin.", textI18n: l("Meridian 从错误角度重放了一次真实投递。这给洁净钥匙造出了一个反射孪生体。", "Meridian は本物の配送を間違った角度から再生しました。クリーンキーに反射した双子が生まれます。", "Meridian a rejoue une vraie livraison sous le mauvais angle. Cela donne a la cle propre un jumeau reflechi.") },
    { text: "So honest paperwork can arrive twice without the ship noticing.", textI18n: l("所以诚实的文书能抵达两次，而飞船自己毫无察觉。", "つまり正直な書類は、船に気づかれず二度到着できる。", "Donc des papiers honnetes peuvent arriver deux fois sans que le vaisseau le remarque.") }
  ],
  "quiet-signal-foundry-ark-wreck": [
    { text: "Foundry Ark was opened before impact. The belt got blamed for a murder it did not commit.", textI18n: l("Foundry Ark 在撞击前就被打开了。矿带替一场不是它犯下的谋杀背了锅。", "Foundry Ark は衝突前に開かれていました。帯域は自分が犯していない殺しの責任を負わされました。", "Foundry Ark a ete ouvert avant l'impact. La ceinture a ete accusee d'un meurtre qu'elle n'a pas commis.") },
    { text: "Log it as evidence. The wake is choosing victims, not just waiting for them.", textI18n: l("把它记成证据。那道尾迹在选择受害者，不只是等待。", "証拠として記録して。航跡は被害者を選んでいて、ただ待っているだけではない。", "Consignez-le comme preuve. Le sillage choisit ses victimes, il ne les attend pas seulement.") }
  ],
  "quiet-signal-anvil-listener-spoor": [
    { text: "The dust pattern was a microphone without a hull, wearing mining telemetry as camouflage.", textI18n: l("那道尘埃图案是一支没有船体的麦克风，用采矿遥测当伪装。", "あの塵の模様は船体のないマイクで、採掘テレメトリを迷彩にしていました。", "Le motif de poussiere etait un microphone sans coque, camoufle par la telemetrie miniere.") },
    { text: "Then the next listener does not need to look like a ship.", textI18n: l("那下一位监听者根本不需要长得像飞船。", "なら次の聞き手は船の形をしている必要がない。", "Alors le prochain ecouteur n'a pas besoin de ressembler a un vaisseau.") }
  ],
  "quiet-signal-ghost-iff-challenge": [
    { text: "That IFF code came from an old patrol archive. Someone copied our salute and taught it to a trap.", textI18n: l("那段 IFF 代码来自旧巡逻档案。有人复制了我们的敬礼，又把它教给陷阱。", "その IFF コードは古い哨戒記録から来ました。誰かが我々の敬礼をコピーし、罠に教えました。", "Ce code IFF vient d'une vieille archive de patrouille. Quelqu'un a copie notre salut et l'a enseigne a un piege.") },
    { text: "Every handshake becomes suspect until we know the source.", textI18n: l("在知道源头之前，每次握手都可疑。", "出所が分かるまで、すべてのハンドシェイクが疑わしい。", "Chaque poignee de main devient suspecte tant que nous ne connaissons pas la source.") }
  ],
  "quiet-signal-redoubt-silence-test": [
    { text: "The bunker did call for support, and then the archive voted the call out of existence.", textI18n: l("堡垒确实呼叫过支援，然后档案把那次呼叫投票抹掉了。", "堡塁は確かに支援を呼びました。その後、記録がその呼び出しを存在しないことにしました。", "Le bunker a bien appele du soutien, puis l'archive a vote l'effacement de cet appel.") },
    { text: "Glass Wake can forge a salute and bury the reply.", textI18n: l("Glass Wake 能伪造敬礼，也能埋掉回应。", "Glass Wake は敬礼を偽造し、返答を埋められる。", "Glass Wake peut forger un salut et enterrer la reponse.") }
  ],
  "quiet-signal-folded-reflection": [
    { text: "Parallax Hermitage is visible now. We stayed quiet because the echo was listening back.", textI18n: l("Parallax Hermitage 现在可见了。我们保持沉默，是因为回声也在反向监听。", "Parallax Hermitage が見えるようになりました。反響がこちらを聞き返していたため、私たちは沈黙していました。", "Parallax Hermitage est visible maintenant. Nous sommes restes silencieux parce que l'echo ecoutait en retour.") },
    { text: "I see the station. Keep the channel narrow and I will dock when ready.", textI18n: l("我看到空间站了。保持窄频道，我准备好就停靠。", "ステーションを確認。チャンネルを狭く保て。準備ができたらドックする。", "Je vois la station. Gardez le canal etroit et je m'amarrerai quand je serai pret.") }
  ],
  "quiet-signal-parallax-deep-index": [
    { text: "Parallax indexed a Crown-band listener before Celest admitted it existed.", textI18n: l("Celest 承认之前，Parallax 就已经索引过一个王冠频段监听者。", "Celest が存在を認める前に、Parallax は王冠帯域の聞き手を索引化していました。", "Parallax avait indexe un ecouteur de bande Crown avant que Celest admette son existence.") },
    { text: "Then the final relay has old evidence pointing at it.", textI18n: l("那最终中继已经有旧证据指向它。", "なら最終中継には古い証拠が向いている。", "Alors de vieilles preuves pointent deja vers le relais final.") }
  ],
  "quiet-signal-dead-letter-convoy": [
    { text: "Those tags are ugly evidence. Ashen brokers sold distress keys like bait hooks.", textI18n: l("那些标签是难看的证据。灰烬掮客把求救钥匙当诱饵钩出售。", "あのタグは醜い証拠です。アシェンの仲介人は救難キーを釣り針のように売りました。", "Ces etiquettes sont des preuves laides. Les courtiers d'Ashen vendaient des cles de detresse comme des hamecons.") },
    { text: "Evidence in my hold is still contraband in half the frontier.", textI18n: l("我货舱里的证据，在半个边境仍然算违禁品。", "私の船倉の証拠は、辺境の半分ではまだ禁制品だ。", "Les preuves dans ma soute restent de la contrebande dans la moitie de la frontiere.") }
  ],
  "quiet-signal-false-mercy-ledger": [
    { text: "The ledger tracked which distress keys sold twice, not which survivors needed help.", textI18n: l("账本记录的是哪些求救钥匙卖了两次，而不是哪些幸存者需要帮助。", "台帳が追っていたのは、どの救難キーが二度売れたかで、どの生存者が助けを必要としたかではありません。", "Le registre suivait quelles cles de detresse avaient ete vendues deux fois, pas quels survivants avaient besoin d'aide.") },
    { text: "The next relay will answer profit before fear.", textI18n: l("下一座中继会先回应利润，而不是恐惧。", "次の中継は恐怖より先に利益へ応答する。", "Le prochain relais repondra au profit avant la peur.") }
  ],
  "quiet-signal-crownside-whisper": [
    { text: "The whisper sat under Celest arbitration traffic, thin enough to pass as luxury noise.", textI18n: l("那道低语贴在 Celest 仲裁交通之下，薄到能伪装成奢华噪声。", "囁きは Celest の仲裁通信の下にあり、高級ノイズに見えるほど薄いものでした。", "Le murmure se trouvait sous le trafic d'arbitrage Celest, assez fin pour passer pour un bruit de luxe.") },
    { text: "A polite trap is still a trap.", textI18n: l("礼貌的陷阱也还是陷阱。", "礼儀正しい罠も罠だ。", "Un piege poli reste un piege.") }
  ],
  "quiet-signal-pearl-witness-chorus": [
    { text: "The consulate beacons were braided into one approved voice.", textI18n: l("领事馆信标被编成了一个获准的声音。", "領事館ビーコンは、ひとつの承認済みの声へ編み込まれていました。", "Les balises du consulat ont ete tressees en une seule voix approuvee.") },
    { text: "Glass Wake prefers consensus when panic would draw attention.", textI18n: l("当恐慌会引来注意时，Glass Wake 更喜欢共识。", "恐慌が注目を集める時、Glass Wake は合意を好む。", "Glass Wake prefere le consensus quand la panique attirerait l'attention.") }
  ],
  "quiet-signal-locked-keel-cache": [
    { text: "Private cache opened. Ship components recovered. Yard note references quiet beacons and stored hull safety.", textI18n: l("私人缓存已开启。已回收舰船部件。船坞便签提到静默信标和存放船体安全。", "私設キャッシュ開封。船体部品を回収。造船所メモは静かなビーコンと保管船体の安全に触れています。", "Cache privee ouverte. Composants de vaisseau recuperes. La note du chantier mentionne des balises silencieuses et la securite des coques stockees.") },
    { text: "PTD Home keeps old ships safer than open traffic ever could.", textI18n: l("PTD Home 比开放交通更能保护旧船。", "PTD Home は、開放交通より古い船を安全に保つ。", "PTD Home garde les vieux vaisseaux plus en securite que le trafic ouvert.") }
  ],
  "quiet-signal-keel-ghost-route": [
    { text: "The route is harmless storage convenience until someone sells it to a relay crew.", textI18n: l("这条航线本来只是无害的仓储便利，直到有人把它卖给中继船员。", "この航路は、誰かが中継クルーに売るまでは無害な保管用の便利機能です。", "Cette route n'est qu'une commodite de stockage inoffensive jusqu'a ce que quelqu'un la vende a un equipage relais.") },
    { text: "A ship can leave no wake if the station expects it to sleep.", textI18n: l("如果空间站以为它还在沉睡，一艘船就能不留尾迹地离开。", "ステーションが眠っていると思い込めば、船は航跡を残さず出られる。", "Un vaisseau peut partir sans sillage si la station s'attend a ce qu'il dorme.") }
  ]
};

const explorationScenes: DialogueSceneDefinition[] = explorationSignals.map((signal) => {
  const [npcLine, captainLine] = explorationSceneCopy[signal.id] ?? [
    {
      text: signal.storyInfluence
        ? `${signal.title} resolved. ${signal.storyInfluence.headline}`
        : `${signal.title} resolved. ${signal.log}`,
      textI18n: l("信号已解析。记录其证据价值。", "信号解決。証拠価値を記録します。", "Signal resolu. Valeur de preuve consignée.")
    },
    {
      text: signal.storyInfluence?.note ?? "Archive it with the rest of the Quiet Signals evidence.",
      textI18n: l("把它和其他静默信号证据一起归档。", "他の静かな信号証拠と一緒に保存して。", "Archivez-le avec les autres preuves Quiet Signals.")
    }
  ];
  return {
    id: `dialogue-exploration-${signal.id}`,
    group: "exploration",
    title: `${signal.title} Signal Log`,
    titleI18n: explorationSceneTitles[signal.id] ?? l(`${signal.title} 信号日志`, `${signal.title} 信号ログ`, `Journal du signal ${signal.title}`),
    maskedTitle: signal.maskedTitle,
    maskedTitleI18n: explorationMaskedTitles[signal.id],
    trigger: { kind: "exploration-complete", signalId: signal.id },
    lines: [
      { speakerId: explorationSpeakerBySignal[signal.id] ?? "ship-ai", ...npcLine },
      { speakerId: "captain", ...captainLine },
      { speakerId: "ship-ai", ...dialogueArchiveLine }
    ]
  };
});

export const dialogueScenes: DialogueSceneDefinition[] = [...storyScenes, ...explorationScenes];

export const dialogueSpeakerById = Object.fromEntries(dialogueSpeakers.map((speaker) => [speaker.id, speaker])) as Record<
  string,
  DialogueSpeakerDefinition
>;

export const dialogueSceneById = Object.fromEntries(dialogueScenes.map((scene) => [scene.id, scene])) as Record<
  string,
  DialogueSceneDefinition
>;

export const storyDialogueSceneIds = new Set(storyScenes.map((scene) => scene.id));
export const explorationDialogueSceneIds = new Set(explorationScenes.map((scene) => scene.id));

export const expectedStoryDialogueSceneCount = glassWakeProtocol.chapters.length * 2;
