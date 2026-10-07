# Codex 工程交接 · 2026-10-07

公开仓库：<https://github.com/linbainian/elsa-english-adventure>，默认分支 `main`。

## 另一台电脑先这样做

安装 Git、Node.js 22 或更新版本。用下面的命令获取工程；目录可自行选择，运行时不依赖原电脑的 `D:\English game`。

```powershell
git clone https://github.com/linbainian/elsa-english-adventure.git
cd elsa-english-adventure
npm ci
npm run dev
```

浏览器打开 <http://127.0.0.1:5173/>。推荐 Edge / Chrome。家长选择关卡、点击开始并允许麦克风，之后孩子无需碰鼠标或键盘。麦克风需要 localhost 或 HTTPS。已有游戏素材、MP3、清单和必要原图都随仓库提供，**直接试玩不需要任何 API 密钥，也不需要 Python**。

在另一台电脑的 Codex 中把这个克隆目录添加为项目。让 Codex 先读根目录 `AGENTS.md` 和本文，不必重新转述长聊天。文末有可直接粘贴的接手提示。

## 产品定位与已经确定的要求

用户要做个人作品：面向 **3 岁儿童** 的电脑浏览器英语冒险，主角为艾莎或以艾莎为原型。语言是推进故事的游戏能力。每关目标约 5～8 分钟；实际时长受跟读、重试和休息影响，不能保证每次都满 5 分钟。

一关只有一个英语学习主题，参考幼儿 Big Fun，而非把水果、问候和战斗咒语任意混在一起。词汇和句型用不同剧情反复出现，孩子每次开口后要看见动作、获得英文鼓励和中文结果说明。

**已取消发音评测。** 当前仅以 `getUserMedia + Web Audio` 检测本机声音活动，孩子发声后触发当前提示的动作。系统不识别具体词句、不检查发音、不识别孩子做的身体动作、不上传或保存孩子声音。这是现有实现边界，不要写成“已经听懂回答”或自动加入评测。

进入关卡后的儿童流程为：中文简短引导 → 英语示范／慢速目标 → 自动开麦 → 检测到发声及短暂停顿 → 游戏动作 → 英文表扬与中文结果 → 自动下一步。家长可暂停、重听、调整设置，也有“我读好了”和键盘模式用于试玩。

**所有人声只能播放 MiniMax 录制的本地 MP3。** 用户明确要求删除浏览器语音合成；缺失或播放失败时保持静音并允许重试。`SoundBank` 的 Web Audio 魔法音效可以保留，它不是人声合成。

## 已完成内容

当前七关开放，每关三幕：

| 关卡 | 学习主题 | 步数 | 主要互动 |
| --- | --- | --- | --- |
| 1 艾莎的新朋友 | 问候、姓名与礼貌，新手情景 | 13 | 雪宝打招呼、收礼物、礼貌开门、邀请猫头鹰、合影道别 |
| 2 身体动一动 | Big Fun 1 · Unit 2 My Body | 13 | 鼻子、眼睛、耳朵、小手小脚；泡泡、点灯、彩色脚印、身体舞 |
| 3 我的家庭 | Big Fun 1 · Unit 3 My Family | 13 | 家人拥抱、礼物、故事蝴蝶、野餐与全家福 |
| 4 玩具城堡 | Big Fun 1 · Unit 4 My Toys | 13 | 弹球、抱玩具、积木桥、汽车、火车载客与巡游 |
| 5 艾莎的魔法衣橱 | Big Fun 1 · Unit 6 My Clothes | 13 | 帮艾莎换衣、穿鞋戴帽、镜子、外套挡雨、装扮照与舞会 |
| 6 动物救助站 | Big Fun 1 · Unit 7 Animals | 13 | 叫醒、玩球、躲猫猫、飞翔、游泳、梳毛、安睡与派对 |
| 7 艾莎的魔法小镇 | Big Fun 1 · Unit 8 My World | 16 | 巴士司机、医生、护士、牙医、消防员和警察；载客、过街、照顾玩偶、刷牙与感谢 |

Big Fun 内容是主题参考和原创改编，部分家庭称呼、词汇与句型做了幼儿化调整，不代表完整覆盖教材。第一关已从早期混合魔法森林改为问候情景。旧森林内容在 `LEGACY_FOREST` 中保留，但不是开放关卡；原素材不删除。

第八关 **My Lunch**、第九关 **My Class** 只有路线图，尚未开放，不能对外称已经完成。目前用户没有指定下一个待实施功能；最近明确的艾莎造型扩充已完成。

最近增加了 **五套新场景服装，加上蓝裙共六种艾莎造型**，另有两个新蓝裙姿态与八张头像。花园短裙、春日长花裙、冬日长靴、星光蓬裙、精灵白裙按场景自动出现。动作期间保持当前服装，过场遮罩内切换；对应头像也更换。第五关继续独立管理服装、鞋帽与完整脸部。详情和原图出处见 [elsa-looks.md](elsa-looks.md)，画面对照见 [elsa-scenes.jpg](previews/elsa/elsa-scenes.jpg)。

## 技术与关键入口

实际依赖是 **Phaser 4.2.1 + TypeScript 5.9.3 + Vite 6.4.3**，原始讨论提到的 Phaser 3 已被实际代码取代。游戏运行于浏览器；尚未打包 Tauri / exe，不要误以为原目录的同名 `.exe` 是游戏发行包。

| 路径 | 职责 |
| --- | --- |
| `src/main.ts` | 页面 UI、选关、语音接力、暂停与反馈；处理异步过期任务 |
| `src/game/level.ts` | 类型、主题、关卡注册；第二、第三关内容；路线图与旧森林 |
| `src/game/*Level.ts` | 第一、第四、第五、第六、第七关声明式故事步骤 |
| `src/game/Adventure.ts` | 状态机、步骤推进、奖励、重玩与切关 |
| `src/game/SnowScene.ts` | Phaser 场景、转场、主角和主题分发 |
| `src/game/ThemeDirector.ts` | 第二、第三关剧情；分发到其他专用 Director |
| `src/game/{Welcome,Toy,Wardrobe,Animal,Community}Director.ts` | 各主题的动作与场景对象 |
| `src/game/AnimatedActor.ts` | 姿态混合、呼吸、手部／披风网格动画 |
| `src/game/ElsaLooks.ts` | 六种艾莎造型、场景映射、纹理与头像 |
| `src/game/feedback.ts` | 表扬和动作反馈 |
| `src/speech/Narrator.ts` | 仅播放本地 MiniMax MP3，取消、重试与时长管理 |
| `src/speech/VoiceInput.ts` | 本机声音活动检测 |
| `src/speech/SoundBank.ts` | 背景魔法音效 |
| `public/assets/` | 运行时美术和 MP3；各主题有清单 |
| `docs/art-source/` | 需要保留的素材原图／图集；不是前端依赖 |
| `public/assets/elsa-looks/manifest.json` | 最新人物原图网址、哈希和裁切参数 |
| `scripts/generate-voice.ts` | 离线、可断点复用的 MiniMax 人声生成 |
| `scripts/audit-levels.ts`、`check-voice-assets.ts` | 关卡合理性与音频覆盖／解码检查 |
| `tests/`、`playwright.config.ts` | 自动化流程、录音边界、切关和造型回归 |

## 必须保留的实现细节

- 语音、动作、表扬结束后才进入下一轮；过场不播放过期台词，不在播音时开麦。异步任务用取消／generation 等机制防止暂停后串音。
- 动作时间轴应使用 Phaser scene time / tween，暂停后画面和延迟动作一并冻结。不要改回不可暂停的 `setTimeout` 动作。
- 原版艾莎与新增服装统一 1024×512，身体中心 x=512，落脚 y=500。改变原图画布、默认帧或比例会破坏网格、服装叠层和头像。
- 第五关 `WardrobeDirector` 的脸部使用原版 `princess-idle` 的 `__BASE` 帧，手部使用独立纹理。不要给共享原版纹理加默认裁切帧，也不要让场景造型覆盖换装关。
- 各关重玩和切关应清理旧角色、动作、图层、收藏状态。动物章节的小鱼始终在水里；小镇巴士应正确开门、载客，避免两个司机同时出现在车上。
- 白裙来源的披风左端已有原图边界；现接入保留所有源像素，头、手、脚完整。部分 PNGpix 素材为 CG 风格整理／再创作，不能宣称所有造型都是电影官方原版。

## 语音、密钥与素材

仓库包含已有音频文件和 `public/assets/audio/manifest.json`，新电脑播放不调用云端。用户曾在聊天提供 MiniMax 凭据；**不在本文或仓库复述它**。本机 `.env` 被忽略，换电脑如需生成新台词，自己在本地配置凭据，或通过安全方式单独迁移。

```powershell
Copy-Item .env.example .env
# 在本地编辑 .env，填 MINIMAX_API_KEY；不要提交它。
node --experimental-strip-types scripts/generate-voice.ts --dry-run
node --experimental-strip-types scripts/generate-voice.ts --levels=8
```

先实施新关卡，再生成其新增台词。生成脚本使用 MiniMax 额度；不要无理由使用 `--force` 重做已有录音。人声正常／慢速目标、中文引导／结果和鼓励均应有录音。

多数场景、动物、团团、道具由 image_gen 生成；最新艾莎人物是网上下载的透明素材。来源、处理和署名见清单与 [elsa-looks.md](elsa-looks.md)。人物素材属于个人作品用途，并非统一 CC0。家长设置中已有素材出处入口。

运行本游戏不需要重新生成美术。若要修图集，Python 脚本通常依赖 Pillow；旧脚本还可能写死 `C:\Users\l\.codex\generated_images\...`、Windows 字体或 Edge 路径，先核对输入、输出，优先使用已上传的原图。不要直接运行旧脚本覆盖现有资源。

## 验证方法与已完成验证

```powershell
npm run build
node --experimental-strip-types scripts/audit-levels.ts
# 快速检查人物切关与衣橱脸部：
$env:PLAYWRIGHT_STATIC = '1'
node node_modules/@playwright/test/cli.js test tests/elsa-looks.spec.ts
```

全量：`npm test`。静态测试先构建，`PLAYWRIGHT_STATIC=1` 会使用 5174；默认开发测试使用 5173。测试自动启动本地服务，已有正确端口服务时可复用。不要在运行回归期间改源文件或重新构建。

Windows 测试默认尝试系统 Edge；测试配置支持 `PLAYWRIGHT_EXECUTABLE_PATH` 指向其他电脑的浏览器，也可使用 Playwright 自带 Chromium：

```powershell
npx playwright install chromium
$env:PLAYWRIGHT_BROWSER = 'chromium'
$env:PLAYWRIGHT_STATIC = '1'
npm test
```

其他系统同样可安装 Chromium，并设置对应环境变量（bash：`PLAYWRIGHT_BROWSER=chromium PLAYWRIGHT_STATIC=1 npm test`）。历史画面捕获脚本仍可能包含原电脑 Edge 的固定路径，先调整再运行。

2026-10-05 最近一次功能修改：生产构建通过；新增造型切关一项，七关完整纯语音通关和三个布局／减少动态效果检查，共 **11 项通过**。更早一轮覆盖七关、真实 MP3 暂停恢复和录音错误处理，共 **24 个不同场景通过**。两轮有重复项目，不能简单相加为 35 个独立场景。最近完整流程约 14.1 分钟，全部测试比这个更慢。

音频已有 502 个索引 MP3 的解码记录，活跃七关语音覆盖检查为零缺失；历史结果和局限见 [verification.md](verification.md)、[level-review.md](level-review.md)、`voice-asset-checks.json`、`level-audit.json`。自动化模拟孩子的声音活动／录音结束，不能代替真实 3 岁孩子和实物麦克风体验。

## 本次上传与接手边界

源码、依赖锁文件、运行素材／录音、必要原图、最终截图、测试和交接文档纳入仓库。`.env`、`node_modules`、`dist`、测试临时输出、原电脑捆绑运行时、目录旁同名 `.exe`、被否决的素材候选、重复截图帧与下载网页缓存不上传。被忽略文件在原电脑保留；它们不影响克隆后的运行。

下一步按用户在新电脑的具体要求做，不要自行创建第八关、切换引擎、加评测、恢复 TTS 或改成鼠标答题。若要继续新增关卡，重点仍是单一学习主题、三幕明显不同、剧情动作有变化、幼儿语音引导，以及完整本地 MiniMax 语音。

## 可以粘贴给新电脑 Codex 的提示

> 请接手此工程，先阅读根目录 AGENTS.md、docs/HANDOFF.md、README.md 和 docs/verification.md，然后检查当前代码状态。项目是面向 3 岁儿童的艾莎英语冒险，已完成七关、多关卡引擎和六种艾莎造型。儿童游玩全程纯语音；目前只检测本机声音活动，不识别词句或评测发音。所有人声只能播放已生成的 MiniMax MP3，不能恢复浏览器语音合成。先用 npm ci、npm run build 和 npm run dev 确认能运行，再根据我下一条需求修改；不要重新从零搭建或擅自实现未开放关卡。
