# 第五章 · 艾莎的魔法衣橱

面向 3 岁孩子的引导式语音换装冒险。家长选关并允许麦克风后，13 次互动自动串成三幕；孩子跟着开口，艾莎换上对应衣服。按用户提供的主题顺序，本章对应 **Big Fun 1 · Unit 6 My Clothes**。游戏章号和教材单元号分别记录。

教学词汇：dress、shoes、hat、shirt、skirt、coat。短句：My dress.、My coat.、I like my dress.。每步都有中文故事引导、英文情境、慢速目标、立即英文表扬和中文结果反馈。预计 5～8 分钟，随孩子开口和重试的节奏变化。

| 幕 | 互动 | 英语目标 | 世界反馈 |
| --- | --- | --- | --- |
| 魔法衣橱 | 花花连衣裙 | Dress! | 主角换上珊瑚粉花裙 |
| 魔法衣橱 | 鞋子飞过来 | Shoes! | 粉色鞋子穿到脚上，踮脚庆祝 |
| 魔法衣橱 | 花朵小帽子 | Hat! | 帽子飞到头上 |
| 魔法衣橱 | 魔法镜子 | My dress. | 镜子展示当前衣服、鞋子和帽子，点亮第一颗星光 |
| 花园试衣亭 | 黄色衬衫 | Shirt! | 上衣变成黄色衬衫 |
| 花园试衣亭 | 紫色半身裙 | Skirt! | 保留衬衫，换紫裙，转身飘花瓣 |
| 花园试衣亭 | 薄荷绿外套 | Coat! | 穿上外套，小雨落下再弹开 |
| 花园试衣亭 | 雨后彩虹 | My coat. | 停雨、亮起彩虹和第二颗星光 |
| 星光舞会 | 冰雪礼服 | Dress! | 换亮晶晶的冰蓝紫礼服 |
| 星光舞会 | 星星舞步 | Shoes! | 换冰晶舞鞋，踏出三步星光 |
| 星光舞会 | 帽子休息 | Hat! | 帽子从头上飞到小衣架 |
| 星光舞会 | 装扮照片 | My dress. | 相框留下当前礼服和舞鞋的搭配 |
| 星光舞会 | 一起跳舞 | I like my dress. | 艾莎、团团跳舞，六件衣物亮起，第三颗星光与独立结局 |

复习词对应新的动作：dress 从日常花裙变为舞会礼服，shoes 从穿鞋变为舞步，hat 从戴上变为送回衣架，My dress. 从照镜子变为装扮照片。没有怪物战或其他主题的词汇穿插。

换装使用现有艾莎脸和发型，搭配生成服装分层。六套穿戴服装共用领口和脚底坐标；帽子、鞋子和手部随主角移动，衣服保持呼吸、裙摆和柔和姿态动画。跨幕根据已完成步骤恢复搭配，暂停冻结场景计时器，重玩回到初始衣服，换回旧章恢复原有艾莎立绘。相框使用当前服装状态，保留原始图片文件。

原计划生成整个人物的换装图集，图像工具连续返回未说明具体原因的安全拒绝；最终采用已有角色局部与新生成服装组合，完成同样的换装玩法。

美术共 **17 个游戏资源**：3 张 1600×900 WebP 场景、6 张 1024×512 RGBA 穿戴服装、6 个单词道具、1 双冰晶舞鞋、1 个空心镜框。新衣服道具独立生成，shirt / skirt 各自展示完整单件衣物。场景分别采用珍珠蓝白衣橱、玫瑰暖色花园、深蓝星空舞厅。

| 文件 | 内容 |
| --- | --- |
| src/game/wardrobeLevel.ts | 13 步教学、故事和服装变化配置 |
| src/game/WardrobeDirector.ts | 换装、镜子、小雨、舞步、照片和舞会 |
| public/assets/wardrobe/manifest.json | 资源尺寸、来源、切图范围和定位 |
| public/assets/wardrobe/asset-checks.json | 真实透明通道、留白与尺寸检查 |
| docs/wardrobe-art-prompts.json | 六次成功生成的完整提示词和原图位置 |
| docs/art-source/wardrobe-*.png | 生成原图 |
| scripts/normalize-wardrobe-assets.py | 衣领 / 脚底定位和透明切图 |
| docs/previews/wardrobe-worlds.jpg | 实际游戏的三幕画面 |
| docs/previews/wardrobe-dance.gif | 实际换装舞会动画 |
| docs/previews/wardrobe-preview-checks.json | 页面、资源和主角服装状态记录 |

MiniMax 本次新增 **56 条本地 MP3**，复用 11 条现有语音，67 项清单均已生成。目标词句均含正常、慢速版本。运行时只播放本地资源，API 凭据留在忽略的 .env 中。生成命令：

    node --experimental-strip-types scripts/generate-voice.ts --levels=5
    node --experimental-strip-types scripts/generate-voice.ts --levels=5 --dry-run

声音模式沿用本地声音活动检测，按当前提示执行搭配；没有词句识别和发音分数。镜子与照片是游戏内画面，不使用摄像头。验证结果见 docs/verification.md；自动化声音模拟和真实 MP3 播放分别检查。
