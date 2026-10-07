# 第七章：艾莎的魔法小镇

主题参考 New Big Fun 1 · Unit 8 My World 的社区职业。六个职业为 bus driver、firefighter、police officer、doctor、nurse、dentist；原创故事还练习 I see a doctor / nurse，复用 Hello、Please、Thank you。不是教材完整单元或医学知识教学。

## 三幕与十六个动作

| 场景 | 用声音触发的事 |
| --- | --- |
| 晨光巴士街 · 6 步 | 和司机打招呼、打开小车门、消防员用水转风车、警察陪小鸭过斑马线、礼貌领取星星车票、小巴士载着团团兜风。 |
| 泡泡玩偶诊所 · 5 步 | 医生听小熊心跳、护士盖软毯、感谢护士、牙医刷玩具牙齿、把医生介绍给艾莎。 |
| 星光感谢广场 · 5 步 | 介绍护士并点小灯、牙医吹笑脸泡泡、警察带团团走星星路、消防员浇开大花、感谢六位伙伴。 |

前半段认识六个职业，后半段在新场景复现；没有新增 Fire / Ice 等与本关无关的目标词。表扬即时播放，动作不以发音得分决定。六个头像记录遇见过的伙伴，不代表词汇掌握。

职业词对于三岁孩子偏长，游戏使用慢速 MiniMax 模型和简短中文行动提示，不要求说准或连续回答。声音模式的局限是不能判断孩子说了哪句话；家长可以一起跟读。三个礼貌桥段用于让第一关的英语在小镇里派上用场。

## 美术

使用内置 image_gen 生成并选定七张源图。另保留两张边距不合格的初稿，修订时保持兔子的身份和制服。资源在 `public/assets/community/`：

- 3 张 1600×900 WebP 背景：街道、诊所、广场。
- 12 张 512×512 兔子职业伙伴图：六个待机、六个挥手，脚底统一到 [256, 500]。
- 7 张 512×512 道具：巴士、玩具牙齿、软牙刷、听诊器、风车转子、花盆、软毯。
- 7 张 256×256 肖像：六位伙伴和团团，用于进度及巴士窗口；由已有完整角色图裁切。

完整提示词、参考图、修订参考和生成路径见 [community-art-final-records.json](community-art-final-records.json)。原图保留于 `docs/art-source/community-*.png`，规范化脚本为 `scripts/normalize-community-assets.py`。真实 alpha 连通区域分离图集，保留完整耳朵、服装和道具轮廓，不把相邻道具裁入角色，也不通过补透明边掩盖源图截断。宽巴士和长牙刷保持纵横比。生成联系表为 [community-assets-contact.jpg](community-assets-contact.jpg)。

美术清单与检查在 `public/assets/community/manifest.json`、`asset-checks.json`。先检查 alpha、尺寸、边距，再看实际游戏中的站位、刷牙接触点、毯子遮挡和巴士窗口。

## 音频与运行

本轮新增 127 段 MiniMax MP3，包括新手关重构、第七关、前面关卡的短引导和问答修正；同一句已有的正常／慢速录音直接复用。模型、音色和文本的生成记录在 `public/assets/audio/voice-report.json`。凭据只由离线脚本从本机 `.env` 读取，前端仅播放本地文件。

```powershell
node --experimental-strip-types scripts/generate-voice.ts --levels=7 --dry-run
node --experimental-strip-types scripts/generate-voice.ts --levels=7
```

所有人声只有 MiniMax 本地录音。没有浏览器语音合成兜底；录音失败时保持静音并提示重试。麦克风只在本机检测声音活动，不评分，不保存或上传孩子的声音。

动作、临时对象和延时都随 Phaser 场景时间暂停；切幕或重玩会清理延时、道具与人物状态。新关卡通过 SceneStory 管理这些资源，不改变旧关卡各自的动作导演。

## 预览与验证

实际游戏场景图为 [community-worlds.jpg](previews/community-worlds.jpg)，派对动画为 [community-party.gif](previews/community-party.gif)，逐步实际纹理和资源错误记录为 [community-preview-checks.json](previews/community-preview-checks.json)。拍摄时用模拟本机声音活动推进，截图来自真实 Phaser 画布。

最终巴士修整另有 [两张画面与检查记录](previews/community-bus-preview-checks.json)：上车时司机站在车旁，行驶时司机与团团在窗口，避免重复人物；车辆完全驶出后再进入。刷新后的 [上车画面](previews/community-boarding.png) 和 [行驶画面](previews/community-ride.png) 均无页面异常或缺失资源。

逐关评审见 [level-review.md](level-review.md)，结构和时长见 [level-audit.json](level-audit.json)。编译、七关通关、暂停恢复、重玩和 MiniMax 录音测试的实际结果写入 [verification.md](verification.md)。
