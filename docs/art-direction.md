# 魔法森林 · 美术与原型约定

## 视觉方向

温暖的儿童绘本，柔和的水粉与纸张质感。森林采用松绿、薄荷绿、青蓝色；魔法与 UI 高亮使用蜂蜜金；伙伴狐狸使用暖橙色。圆润轮廓、可读的剪影、没有恐怖元素。

- 引擎：Phaser 4.2.1；电脑浏览器，1280×760 参考画布，FIT 等比缩放。
- 背景：横向森林空地，前景与角色分开。轻量漂浮光点与角色补间动画。
- 角色：原生透明 PNG，足部统一锚点，不将文字烘焙在素材里。
- UI：DOM，奶油色纸张、深松绿色字、清晰的键盘焦点；本地字体优先。
- 产出方法：内置 imagegen 生成背景与角色图集；简易互动图标由项目内 SVG 生成。

## 原型要验证的问题

孩子是否愿意主动开口说英语，因为说出的内容会改变游戏世界？

一关目标 5～8 分钟，由 5 段冒险、短句互动、听音选择与场景探索组成。实际时长取决于孩子的跟读与探索速度，不设置强制等待来凑时长。

默认玩法是纯语音自动跟读：本机检测声音活动，不识别内容、不评估发音。提示音与麦克风轮流工作；听见孩子开口后执行本轮目标动作并自动继续。水果、方向和跳跃均无需鼠标或键盘。无麦克风时，可选手动输入和「我读好了」试玩方式。重试不扣分、不限制次数。

## 生成提示词

### forest-background（内置工具，illustration-story）

Wide landscape production background for a charming children's 2D English-learning adventure. A magical storybook forest clearing painted with soft gouache, rich layered moss and pine greens, turquoise distant woods, honey-gold afternoon sunlight shining through tall rounded trees. A broad readable pale golden winding path sweeps across the bottom third. Ferns, tiny warm mushrooms, gentle flowers, mossy rocks along the sides, airy sunlit clearing in the middle with plenty of unobstructed space for separate game characters. Rounded friendly silhouettes, tactile painted paper textures, sophisticated warm children's picture-book illustration. Camera front three-quarter wide view, landscape 16:9, no characters, no animals, no buildings or gates, no words, no logos, no UI, no border. Keep the bottom 35 percent readable and not overly busy. Beautiful atmospheric depth, warm and inviting, no scary elements.

### character-atlas（内置工具，stylized-concept）

A single cohesive 2 by 2 game character atlas on a truly transparent background, matching a soft gouache children's storybook forest with pine green, turquoise, honey gold and warm orange palette. Exactly four isolated full body assets, each centered in its own quadrant with very generous transparent gutters and complete visible feet. Top left: a cheerful small child adventurer wearing a mint green cape, round tan explorer hat, small brown boots, holding a simple wooden wand with a gold star tip, front three-quarter facing slightly right. Top right: a friendly cute orange fox companion, big ears, cream muzzle and huge fluffy cream-tipped tail, wearing a small green neckerchief, front three-quarter facing slightly left. Bottom left: a friendly mischievous round moss-green forest creature with leafy antlers, tiny arms and feet, soft golden eyes, looks silly rather than scary, front three-quarter facing left. Bottom right: a small happy cream-and-caramel owl with a mint green scarf and tiny rounded wings, front three-quarter facing left. Soft hand painted gouache, subtle paper texture, consistent top-left warm lighting, round readable silhouettes, premium picture-book game art. No labels, no frames, no shadow backdrop, no scenery, no text, no watermark. All four assets similar visual scale and fully separated.
