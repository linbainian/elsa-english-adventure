# 冰雪奇遇美术与动画

制作日期：2026-10-03。本轮优先处理美术、角色动作与过场；英语主题配置是后续关卡重构的依据。

视觉方向：淡青、薰衣草紫、桃粉色，明亮雪景、圆润雪宝与毛绒伙伴。主角采用用户指定的艾莎，使用公开的完整立绘；背景和其他角色、道具、水果由内置 imagegen 生成。角色动作由三张真实姿态图、网格形变、原生眨眼和缓动组合，当前尚不是完整骨骼动画。

## 素材与来源

| 素材 | 实际来源 | 游戏文件 |
| --- | --- | --- |
| 艾莎待机 | [Wikipedia 图片页](https://en.wikipedia.org/wiki/File:Elsa_from_Disney%27s_Frozen.png) | public/assets/snow/princess-idle.png |
| 艾莎展开双臂 | [PNGpix 姿态页](https://pngpix.com/png/elsa-frozen-character-pose-v7dpq12048ljxz0j.html) | public/assets/snow/princess-cheer.png |
| 艾莎施法 | [PNGpix 雪花姿态页](https://pngpix.com/png/elsa-creating-snowflake-frozen-7wiikgh56sj9sml4.html) | public/assets/snow/princess-cast.png |
| 三处雪景 | 内置 imagegen，本项目生成 | glade.webp / orchard.webp / palace.webp |
| 雪宝、绒绒、小猫头鹰 | 内置 imagegen，同一图集 | buddy-idle.png / buddy-wave.png / troll.png / owl.png |
| 门、野餐篮、灯笼、桥、水晶球 | 内置 imagegen，同一道具图集 | gate-closed.png / gate-open.png / basket.png / lantern.png / bridge.png / globe.png |
| 苹果、香蕉、梨 | 内置 imagegen，同一水果图集 | apple.png / banana.png / pear.png |

艾莎素材是 Disney 角色公开立绘，按用户授权用于个人原型；没有将其标为 CC0。下载的原始素材与生成原图都保存在 public/assets/snow/originals/。生成的人形原型尝试未获得可用输出，未作为游戏美术交付。

## 动作与过场

- 待机呼吸、短眨眼、披风摆动、手臂轻摆，贴图按身体中心和地面基线对齐。
- 施法：准备 320ms → 手臂姿态和魔法释放 → 弧线飞行 760ms → 目标响应 → 欢呼与语音鼓励。
- 采集：手势准备 → 水果弧线飞入篮子 850ms → 果篮可见累积 → 鼓励。
- 跳跃：预备压低 → 上升 → 落地 → 回弹与雪花；滑行使用缓进缓出、桥面弧线和冰晶轨迹。
- 换场：雪花幕渐入 380ms → 换地图和角色站位 → 渐出 720ms；过场期间不播放示范或打开麦克风。
- 通关：朋友聚在一起，雪花与星光散开，保留角色可见的大画面。
- 减少动态效果时缩短过场、降低粒子数量、关闭持续飘动，保留动作含义。

## 处理与检查

运行 scripts/normalize-snow-assets.py 可重新生成游戏图片。仅做确定性裁切、缩放、透明边缘预乘处理、身体中心与底线对齐及 WebP 转换，不人工重画生成图像。原始图集不是严格格子，按实际物品边界裁切，避免桥被截断或邻居道具混入。

联系表见 docs/snow-assets-contact.jpg；尺寸、透明通道和边界检查见 public/assets/snow/asset-checks.json。Canvas 回退模式使用姿态图片及缓动；网格披风和局部手势形变需要 WebGL。

## 实际使用的完整 imagegen 提示词

### glade

Use case: illustration-story. Production 16:9 landscape background plate for a 2D children's ice-princess adventure for AGE THREE. High-end soft 3D animated storybook/toy world, rounded sculpted forms, gentle pastel cyan, lavender, blush pink and warm peach daylight. A welcoming snowy enchanted glade in an Elsa-like ice kingdom: soft billowy white snow, rounded frost-dusted spruce trees framing the far LEFT and far RIGHT, small pastel snow flowers, a gently curving walkable snowy trail across the bottom quarter, twinkly ice castle VERY distant on upper right hill, pale peach sunrise and lavender hills. Friendly and cozy winter, no danger, no scary shadows. Camera at child's eye level in a mildly elevated three-quarter side view, for characters standing along y=80 percent height. Composition: center 70 percent open, calm and low contrast to show large characters and magic; lovely layered depth in side trees and background hills; clearly readable pale ground along lower 30 percent, no obstacles baked into foreground. Empty background only: NO characters, animals, signs, words, UI, logos or watermarks, no busy intricate patterns, no candy objects, no castle occupying center. A cinematic inviting scene with soft volumetric light and rounded forms, not flat vector art, not photorealistic. Wide 16:9 landscape, 1792x1024 or similar.

### orchard

Use case: illustration-story. Input image is STYLE AND LIGHTING REFERENCE for a new game background, not an edit target. Create a DIFFERENT LOCATION in the same premium soft 3D pastel winter kingdom for age THREE: a cozy enchanted snow orchard with big rounded pale pink and lavender blossom trees at LEFT and RIGHT sides, lightly iced branches, a few bright apples and golden fruit high in the side branches, snowy rolling ground with a calm open flat path across lower 30 percent. Light peach sunshine, pastel blue sky, small rounded lavender distant hills. Cheerful and magical, warm winter picnic mood. Keep center 65 percent EMPTY of large objects to place characters and collectible fruit in runtime. Child eye level, mildly elevated three-quarter side camera, same ground horizon as reference. Wide 16:9 background plate, 1792x1024 or similar, softly sculpted rounded storybook rendering, NOT photorealistic, no characters, animals, basket, foreground gameplay fruit, text, UI, watermark or border. Clearly DIFFERENT from the reference: blossom orchard, no large conifer forest or distant cliff castle as main subject.

### palace

Use case: illustration-story. Input image is STYLE AND LIGHTING REFERENCE, not an edit target. New DIFFERENT LOCATION for the same cozy pastel winter kingdom age THREE: a spectacular welcoming ice palace courtyard for an original fairy tale snow princess. Large sparkling translucent light-blue castle towers along the far TOP RIGHT, rounded decorative pastel pink snowy gardens along far LEFT, delicate lavender ice columns framing the sides, a distant warm arched entrance in upper-middle-right, soft pink and purple bunting far in background suggesting a celebration. Pale peach daylight, pearly cyan, lavender, blush pink, calm friendly magical mood, high-end soft 3D animated storybook look, no darkness or threat. Child eye-level mild three-quarter side view, big open snowy courtyard floor lower 45 percent, center 65 percent of foreground empty for our runtime characters and interactive door. Keep architecture in BACKGROUND so it won't obstruct game sprites. Wide16:9 background plate1792x1024 or similar. No characters, creatures, game props, snowmen, lantern, cages, text, labels, logos, UI, watermark.

### friends

Production transparent 2x2 equal-cell game-character atlas, four complete isolated full-body subjects with ample transparent gutters. Cute rounded soft 3D animated storybook figures, pearly white, cyan, pastel lavender and peach, same soft warm winter daylight as reference. TOP LEFT: a friendly original chubby snowman named Pip with two round white snowballs, big shiny gentle eyes, rosy cheeks, a little orange carrot nose, short twig arms, lavender wool scarf and small pale blue bobble hat; happy neutral idle, hands down. TOP RIGHT: the EXACT SAME snowman at exact same size and same foot baseline, delightfully waving his right twig hand at shoulder height, joyful smile. BOTTOM LEFT: a lovable big cuddly white snow creature, fluffy rounded bear-like body, short rounded ice-blue horns, big rounded feet, tiny lavender scarf, sweet smiling expressive face, no fangs, no weapons, not frightening. BOTTOM RIGHT: a small sweet snowy owl, plump white body, pastel lavender wing tips, big turquoise eyes, tiny golden beak, friendly open wings. Each cell has one complete creature centered, no clipping, no floor shadows, no words, no labels, no dividing lines, no backdrop or props. Transparent alpha. Square2048x2048. STYLE REFERENCE is the winter background.

### props

Production transparent 3-column by 2-row equal-cell game prop atlas. Six completely isolated objects, full shapes with clear gutters, each centered in its cell. Premium soft rounded 3D animated storybook fantasy toy look, cyan and lilac ice, white snow, warm peach glints, no sharp threatening points, match reference winter world. TOP row left to right: 1 a freestanding small rounded pearly cyan ICE CASTLE DOORWAY with closed pale lavender double doors, snowflake motif, snow-covered round base; 2 EXACT same ice doorway design, same dimensions and base alignment, but double doors open outward, glowing welcoming warm pink portal center; 3 a cozy small round picnic wicker basket with lavender cloth liner and rounded handle, empty. BOTTOM row left to right: 4 a freestanding small snow-covered lamp post with rounded glowing golden lantern, icy pale blue post, round snow base; 5 a broad gently arched translucent sky-blue ice footbridge with chunky rounded lilac balustrades and sparkly snow, seen three-quarter side view; 6 an adorable glass snow globe on lavender rounded plinth with a tiny icy castle inside. No scene, trees, people, animals, floor shadows, text, words, frames, dividing lines, logo or watermark. Transparent alpha. Wide3:2 atlas1536x1024 or2048x1365. Closed and open doorway silhouettes must share same height and anchored ground baseline.

### fruit

Production game asset atlas: exactly three isolated glossy 3D toy-style fruits in one horizontal row, on genuine alpha transparency. Match the soft rounded premium 3D pastel ice adventure props in the reference image. Left: one bright cheerful red apple with short stem and one soft green leaf; center: one curved golden yellow banana, clearly one banana with gentle rounded ends; right: one plump lime-green pear with stem and one tiny leaf. Simple familiar fruit shapes very readable for a THREE YEAR OLD, shiny softly sculpted surfaces with soft diffuse warm winter daylight, rich red/golden yellow/green color against pastel world, no faces, no eyes, no hands, no characters, no basket. Each fruit completely inside its own equal cell of a precise 3-column 1-row layout, consistent apparent height and scale, generous empty transparent gutters. No floor shadows, backgrounds, gradients, labels, text, border, panel, watermark, duplicate or extra fruit. Canvas wide 3:1, preferably1536x512. Reference is stylistic reference only; don't include any doors, bridges or lamps.
