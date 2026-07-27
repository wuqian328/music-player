# 音乐播放器 (Music Player) — Code Wiki

## 1. 项目概述

**音乐播放器** 是一款基于 **Electron + Vue 3** 构建的桌面音乐播放与下载工具。支持多平台音乐搜索（网易云音乐、QQ音乐、酷我音乐、B站）、在线播放、音质降级回退、歌词同步显示、单曲/批量下载、AI 智能歌单生成、本地音乐管理、缓存管理、主题切换（暗色/亮色/跟随系统）以及自动更新等功能。

- **版本**: 1.0.0
- **技术栈**: Electron 28 + Vue 3 (Composition API) + Pinia + Vite + Element Plus + Howler.js
- **图标库**: Lucide Vue Next
- **构建工具**: electron-vite + electron-builder
- **包管理**: npm

---

## 2. 项目目录结构

```
music-player/
├── package.json                    # 项目配置与依赖
├── electron.vite.config.mjs        # electron-vite 构建配置
├── jsconfig.json                   # JS 路径别名配置
├── src/
│   ├── main/
│   │   └── index.js                # Electron 主进程入口
│   ├── preload/
│   │   └── index.js                # 预加载脚本 (contextBridge)
│   └── renderer/
│       ├── index.html              # 渲染进程 HTML 入口
│       └── src/
│           ├── main.js             # Vue 应用入口
│           ├── App.vue             # 根组件 (布局 + 路由 + 主题)
│           ├── api/
│           │   └── index.js        # 音乐 API 封装 (搜索/播放/歌词/封面)
│           ├── components/
│           │   ├── TitleBar.vue        # 自定义标题栏
│           │   ├── PlayerBar.vue       # 底部播放控制栏
│           │   ├── SearchPanel.vue     # 搜索面板
│           │   ├── RecommendPanel.vue  # 推荐(热歌榜)面板
│           │   ├── PlaylistPanel.vue   # 播放列表面板
│           │   ├── HistoryPanel.vue    # 播放历史面板
│           │   ├── AIPlaylistPanel.vue # AI 智能歌单面板
│           │   ├── LocalMusicPanel.vue # 本地音乐管理面板
│           │   ├── SettingsPanel.vue   # 设置面板
│           │   ├── DownloadModal.vue   # 下载弹窗
│           │   └── SongInfoModal.vue   # 歌曲信息弹窗
│           ├── stores/
│           │   ├── player.js       # 播放器状态管理 (Pinia)
│           │   └── settings.js     # 设置状态管理 (Pinia)
│           ├── utils/
│           │   ├── storage.js      # 播放历史 localStorage 封装
│           │   └── debounce.js     # 通用防抖函数
│           └── styles/
│               ├── globals.css     # 全局样式入口
│               ├── tokens.css      # 设计令牌 (CSS 变量)
│               ├── mixins.css      # 通用样式混入与动画
│               └── themes/
│                   ├── dark.css    # 暗色主题变量
│                   └── light.css   # 亮色主题变量
├── out/                            # 构建输出目录
│   ├── main/index.js
│   ├── preload/index.js
│   └── renderer/...
└── release/                        # electron-builder 打包输出
```

---

## 3. 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     Electron Main Process                        │
│  src/main/index.js                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │ 窗口管理  │ │ IPC 处理  │ │ 文件系统  │ │ 自动更新/日志/加密 │  │
│  │ (窗口创建 │ │ (api-req │ │ (下载/缓存│ │ (autoUpdater/     │  │
│  │  最小化等)│ │  download│ │  读写)   │ │  safeStorage/log) │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                     Preload (contextBridge)                       │
│  src/preload/index.js                                            │
│  window.electronAPI = { apiRequest, hotList, downloadMusic, ... } │
├─────────────────────────────────────────────────────────────────┤
│                   Renderer Process (Vue 3)                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  App.vue (根组件)                                            │ │
│  │  ├── TitleBar      (自定义标题栏)                             │ │
│  │  ├── 侧边栏导航 (7个Tab)                                     │ │
│  │  ├── 主内容区 (v-show 切换面板)                               │ │
│  │  │   ├── RecommendPanel  (推荐/热歌榜)                       │ │
│  │  │   ├── AIPlaylistPanel (AI歌单)                            │ │
│  │  │   ├── SearchPanel     (搜索)                              │ │
│  │  │   ├── PlaylistPanel   (播放列表)                          │ │
│  │  │   ├── HistoryPanel    (历史)                              │ │
│  │  │   ├── LocalMusicPanel (本地音乐)                           │ │
│  │  │   └── SettingsPanel   (设置)                              │ │
│  │  ├── PlayerBar     (底部播放栏)                               │ │
│  │  ├── DownloadModal (下载弹窗)                                 │ │
│  │  └── SongInfoModal (歌曲信息弹窗)                             │ │
│  ├── Stores (Pinia)                                             │ │
│  │   ├── player.js   (播放状态/Howl实例/歌词/缓存)               │ │
│  │   └── settings.js (音质/缓存/AI配置/主题)                     │ │
│  ├── API Layer (api/index.js)                                   │ │
│  │   searchMusic / getMusicUrl / getLyric / getAlbumArt         │ │
│  └── Utils (storage.js / debounce.js)                           │ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 主进程 (Main Process) 详解

**文件**: [src/main/index.js](file:///d:/music/music-player/src/main/index.js)

### 4.1 核心职责

| 职责 | 说明 |
|------|------|
| 窗口管理 | 创建无边框窗口 (1100x750)，最小尺寸 900x600，支持最大化/最小化/关闭 |
| IPC 通信 | 注册 20+ 个 `ipcMain.handle` 处理器，响应渲染进程请求 |
| 音乐 API 代理 | 通过 `axios` 转发请求到 `https://music-api.gdstudio.xyz/api.php` |
| 文件下载 | 单曲下载（系统保存对话框）、批量下载（选择目录） |
| 缓存管理 | 文件缓存（歌词/封面/音乐）、缓存查询、缓存清理 |
| 自动更新 | 基于 `electron-updater`，支持 GitHub Release 更新 |
| 日志系统 | 按天切割的日志文件，存于 `userData/logs/` |
| 安全加密 | 基于 `safeStorage` 的 API 密钥加密/解密 |

### 4.2 关键 IPC 通道

| IPC 通道 | 功能 | 类型 |
|----------|------|------|
| `api-request` | 通用音乐 API 请求代理 | invoke |
| `hot-list` | 获取网易云热歌榜 (直接请求 music.163.com) | invoke |
| `download-music` | 单曲下载（弹出保存对话框） | invoke |
| `download-music-batch` | 批量下载（选择目录） | invoke |
| `cancel-download` | 取消下载 (AbortController) | invoke |
| `download-progress` | 下载进度推送 | send (主→渲染) |
| `cache-file` | 缓存文件（支持 URL 下载和内容直接写入） | invoke |
| `get-cached-song` | 获取缓存的歌曲（含元数据） | invoke |
| `list-local-music` | 列出本地音乐（分页） | invoke |
| `delete-local-file` | 删除本地音乐及关联文件 | invoke |
| `ai-chat` | AI 对话（OpenAI 兼容 API） | invoke |
| `ai-models` | 获取 AI 模型列表 | invoke |
| `check-update` / `download-update` / `install-update` | 自动更新流程 | invoke |
| `update-status` / `update-download-progress` | 更新状态推送 | send |
| `safe-encrypt` / `safe-decrypt` | API 密钥加解密 | invoke |
| `window-minimize` / `window-maximize` / `window-close` | 窗口控制 | invoke |
| `select-directory` | 选择目录对话框 | invoke |
| `cache-file://` | 自定义协议，用于渲染进程访问本地缓存文件 | protocol |

### 4.3 关键函数

| 函数 | 说明 |
|------|------|
| `createWindow()` | 创建 BrowserWindow，配置无边框 + contextIsolation + 预加载脚本 |
| `registerIpcHandlers()` | 注册所有 IPC 处理器 |
| `setupAutoUpdater()` | 配置 autoUpdater 事件监听 |
| `initLogger()` | 初始化日志系统，按天创建日志文件 |
| `log(level, message, data)` | 统一日志输出（控制台 + 文件） |
| `getDefaultCacheDir()` | 获取默认缓存目录 `userData/cache` |

### 4.4 缓存目录结构

```
userData/cache/
├── music/          # 缓存的音乐文件 + JSON 元数据
├── lyric/          # 缓存的歌词文件 (.lrc)
├── albumart/       # 缓存的专辑封面
└── other/          # 其他缓存
```

---

## 5. 预加载脚本 (Preload)

**文件**: [src/preload/index.js](file:///d:/music/music-player/src/preload/index.js)

通过 `contextBridge.exposeInMainWorld` 向渲染进程暴露 `window.electronAPI` 对象，包含以下方法分类：

| 分类 | 方法 |
|------|------|
| 音乐 API | `apiRequest`, `hotList` |
| 下载 | `downloadMusic`, `downloadMusicBatch`, `cancelDownload`, `onDownloadProgress`, `offDownloadProgress` |
| 窗口控制 | `windowMinimize`, `windowMaximize`, `windowClose` |
| 文件操作 | `readFile`, `writeFile`, `selectDirectory` |
| 缓存管理 | `ensureCacheDir`, `getCacheInfo`, `clearCache`, `cacheFile`, `getCachedFile`, `getCachedSong`, `readCachedFile`, `getCacheFileUrl` |
| 本地音乐 | `listLocalMusic`, `deleteLocalFile` |
| AI | `aiChat`, `aiModels` |
| 更新 | `checkUpdate`, `downloadUpdate`, `cancelUpdateDownload`, `installUpdate`, `onUpdateStatus`, `offUpdateStatus`, `onUpdateDownloadProgress`, `offUpdateDownloadProgress`, `setUpdateSource` |
| 安全 | `safeEncrypt`, `safeDecrypt` |

---

## 6. 渲染进程 (Renderer Process) 详解

### 6.1 入口文件

**文件**: [src/renderer/src/main.js](file:///d:/music/music-player/src/renderer/src/main.js)

```javascript
createApp(App)
  .use(createPinia())           // 状态管理
  .use(ElementPlus, { size: 'small' })  // UI 组件库
  .mount('#app')
```

全局样式导入链: `globals.css` → `tokens.css` + `mixins.css` + `dark.css` + `light.css`

---

### 6.2 根组件 (App.vue)

**文件**: [src/renderer/src/App.vue](file:///d:/music/music-player/src/renderer/src/App.vue)

#### 布局结构

```
┌──────────────────────────────────────────────┐
│  TitleBar (自定义标题栏)                       │
├────────┬─────────────────────────────────────┤
│ 侧边栏  │  主内容区                            │
│ (64px) │  RecommendPanel / AIPlaylistPanel   │
│        │  / SearchPanel / PlaylistPanel      │
│ 7个Tab │  / HistoryPanel / LocalMusicPanel   │
│        │  / SettingsPanel                    │
├────────┴─────────────────────────────────────┤
│  PlayerBar (底部播放栏)                        │
├──────────────────────────────────────────────┤
│  DownloadModal (条件渲染)                      │
│  SongInfoModal (条件渲染)                      │
└──────────────────────────────────────────────┘
```

#### 导航 Tab 顺序

| 序号 | Tab ID | 标签 | 快捷键 | 图标 |
|------|--------|------|--------|------|
| 1 | `recommend` | 推荐 | Ctrl+1 | Sparkles |
| 2 | `ai-playlist` | 歌单 | Ctrl+2 | Music |
| 3 | `search` | 搜索 | Ctrl+3 | Search |
| 4 | `playlist` | 列表 | Ctrl+4 | ListMusic |
| 5 | `history` | 历史 | Ctrl+5 | Clock |
| 6 | `local` | 本地 | Ctrl+6 | FolderOpen |
| 7 | `settings` | 设置 | Ctrl+7 | Settings |

#### 键盘快捷键总览

| 快捷键 | 功能 |
|--------|------|
| Space | 播放/暂停 |
| Ctrl+← | 上一曲 |
| Ctrl+→ | 下一曲 |
| Ctrl+↑ | 音量 +5% |
| Ctrl+↓ | 音量 -5% |
| Ctrl+M | 静音切换 |
| Ctrl+1~7 | 切换 Tab |
| Ctrl+F | 聚焦搜索框 |

#### 核心 provide/inject

| Key | 提供的数据/方法 | 消费者 |
|-----|---------------|--------|
| `download` | `{ openDownload, closeDownload, showDownloadModal, downloadTarget }` | 所有需要触发下载的组件 |
| `songInfo` | `{ openSongInfo, closeSongInfo, showSongInfoModal, songInfoTarget, triggerSearch }` | 所有需要显示歌曲信息的组件 |
| `theme` | `{ setTheme }` | SettingsPanel 等需要切换主题的组件 |

#### 主题系统

- 支持三种模式：`dark`（暗色）、`light`（亮色）、`system`（跟随系统）
- 通过 CSS 类 `theme-dark` / `theme-light` 切换 CSS 变量
- 持久化到 `localStorage` (`music-player-theme`)
- 监听 `prefers-color-scheme: dark` 媒体查询变化

---

### 6.3 组件详解

#### 6.3.1 TitleBar.vue

**文件**: [src/renderer/src/components/TitleBar.vue](file:///d:/music/music-player/src/renderer/src/components/TitleBar.vue)

- 无边框窗口的自定义标题栏
- 左侧：应用 Logo + 名称（可拖拽区域 `-webkit-app-region: drag`）
- 右侧：最小化 / 最大化 / 关闭按钮
- 双击标题栏切换最大化

#### 6.3.2 PlayerBar.vue

**文件**: [src/renderer/src/components/PlayerBar.vue](file:///d:/music/music-player/src/renderer/src/components/PlayerBar.vue)

底部播放控制栏，是播放器核心交互组件：

**布局三段式**：
- **左侧 (240px)**: 专辑封面（播放时旋转动画）+ 歌曲名/歌手 + 下载按钮
- **中间 (flex:1)**: 播放模式切换（顺序/单曲循环/随机）+ 上一曲/播放暂停/下一曲 + 进度条（可拖拽）
- **右侧 (200px)**: 音量控制（可拖拽）+ 歌词显示开关 + 音质标签 + 歌曲信息按钮

**关键功能**：
- 进度条拖拽 (mousedown/mousemove/mouseup)
- 音量条拖拽
- 歌词面板展开/收起（自动滚动到当前行）
- 音质徽章显示当前播放音质
- 播放错误横幅提示

#### 6.3.3 SearchPanel.vue

**文件**: [src/renderer/src/components/SearchPanel.vue](file:///d:/music/music-player/src/renderer/src/components/SearchPanel.vue)

- 支持四个音乐平台切换：网易云 / QQ音乐 / 酷我 / B站
- 搜索输入框，Enter 触发搜索
- 搜索结果列表：序号 + 歌名 + 歌手/专辑 + 平台标签 + 操作按钮
- 支持分页加载更多
- 双击播放，提供播放/添加到列表/下载/歌曲信息按钮
- 监听 `trigger-search` 自定义事件，支持从 SongInfoModal 跳转搜索

#### 6.3.4 RecommendPanel.vue

**文件**: [src/renderer/src/components/RecommendPanel.vue](file:///d:/music/music-player/src/renderer/src/components/RecommendPanel.vue)

- 网易云音乐热歌榜展示
- 三种榜单：热歌榜 (2884035) / 飙升榜 (3778678) / 新歌榜 (3779629)
- 数据通过 `window.electronAPI.hotList()` 直接请求 `music.163.com`
- **localStorage 缓存**：1 小时有效期的榜单数据缓存 (`music-player-chart-cache`)
- 前三名使用奖牌 emoji (🥇🥈🥉)
- 支持刷新全部榜单、切换榜单、重试失败请求

#### 6.3.5 PlaylistPanel.vue

**文件**: [src/renderer/src/components/PlaylistPanel.vue](file:///d:/music/music-player/src/renderer/src/components/PlaylistPanel.vue)

- 当前播放列表展示
- 支持多选（Checkbox + Shift 范围选择 + Ctrl 多选）
- 全选/取消全选
- 批量下载选中歌曲
- 清空播放列表
- 双击播放，单曲下载/歌曲信息/移除
- 当前播放歌曲高亮 + 播放动画指示器

#### 6.3.6 HistoryPanel.vue

**文件**: [src/renderer/src/components/HistoryPanel.vue](file:///d:/music/music-player/src/renderer/src/components/HistoryPanel.vue)

- 播放历史展示（最多 200 条）
- 从 `player.history` 读取，持久化于 `localStorage` (`music-player-history`)
- 清空历史功能
- 双击播放历史歌曲

#### 6.3.7 AIPlaylistPanel.vue

**文件**: [src/renderer/src/components/AIPlaylistPanel.vue](file:///d:/music/music-player/src/renderer/src/components/AIPlaylistPanel.vue)

AI 智能歌单生成面板：

**生成参数（可折叠）**：
- **音乐风格**：多选标签（流行/摇滚/爵士/古典/电子/R&B/民谣/嘻哈/独立/华语）
- **情绪氛围**：多选标签（快乐/放松/伤感/活力/浪漫/专注/怀旧/平静）
- **歌单数量**：单选（5/10/15/20首）
- **自定义需求**：文本输入框

**生成流程**：
1. 构建 System Prompt（专业音乐推荐助手）
2. 发送到 AI API（支持 OpenAI 兼容接口）
3. 解析 JSON 返回结果
4. 展示生成的歌单列表（含推荐理由）
5. AI 生成的歌曲标记为 `isAiGenerated: true`，播放时通过搜索 API 解析真实歌曲信息

**标签/数量配置**：在设置 → 歌单生成中编辑

#### 6.3.8 LocalMusicPanel.vue

**文件**: [src/renderer/src/components/LocalMusicPanel.vue](file:///d:/music/music-player/src/renderer/src/components/LocalMusicPanel.vue)

- 本地缓存音乐浏览与管理
- 分页加载（每页 20 首）
- 显示歌曲名、歌手、格式、文件大小、缓存日期
- 支持播放、删除（含 Element Plus 确认对话框）
- 删除时同步移除关联的歌词和封面文件
- 骨架屏加载状态

#### 6.3.9 SettingsPanel.vue

**文件**: [src/renderer/src/components/SettingsPanel.vue](file:///d:/music/music-player/src/renderer/src/components/SettingsPanel.vue)

设置面板，左侧二级导航，右侧内容区：

| 设置分类 | 内容 |
|----------|------|
| 音质 | 播放音质 / 下载音质（各平台独立选项） |
| 缓存 | 启用缓存 / 自动缓存歌词 / 自动缓存封面 / 缓存目录选择 / 缓存统计（环形图）+ 清空 |
| 外观 | 暗色模式 / 亮色模式 / 跟随系统（卡片式选择） |
| 快捷键 | 可展开的快捷键列表 |
| AI配置 | API密钥 / 模型名称（支持从API获取列表）/ API地址 / 超时 / 创意度 / 连接测试 |
| 歌单生成 | 风格标签编辑 / 情绪标签编辑 / 数量选项编辑（增删改） |
| 关于 | 版本号 / 更新源配置 / 检查更新 / 下载更新 |

#### 6.3.10 DownloadModal.vue

**文件**: [src/renderer/src/components/DownloadModal.vue](file:///d:/music/music-player/src/renderer/src/components/DownloadModal.vue)

- 支持单曲下载和批量下载
- 显示歌曲信息、下载音质选择
- 下载进度条（实时更新，通过 `download-progress` IPC 事件）
- 取消下载
- 下载完成/失败结果展示
- 自动识别文件扩展名（从 URL 或音质推断）

#### 6.3.11 SongInfoModal.vue

**文件**: [src/renderer/src/components/SongInfoModal.vue](file:///d:/music/music-player/src/renderer/src/components/SongInfoModal.vue)

- 两层显示：默认显示基本信息，点击"详情"展示完整信息
- 基本信息：歌名、歌手、专辑、来源、音质
- 详情信息：时长、歌曲ID、文件大小（通过 HEAD 请求获取）、歌词链接（点击复制）、封面链接（点击复制）、歌曲链接（点击复制）
- 操作按钮：下载、详情/收起、收藏、找歌手、找专辑
- "找歌手"/"找专辑"通过 `triggerSearch` 跳转到搜索面板

---

### 6.4 状态管理 (Pinia Stores)

#### 6.4.1 player.js — 播放器状态

**文件**: [src/renderer/src/stores/player.js](file:///d:/music/music-player/src/renderer/src/stores/player.js)

| 状态 | 类型 | 说明 |
|------|------|------|
| `currentSong` | Object | 当前播放歌曲 |
| `playlist` | Array | 播放列表 |
| `currentIndex` | Number | 当前播放索引 |
| `playing` | Boolean | 播放状态 |
| `volume` | Number | 音量 (0-1) |
| `muted` | Boolean | 静音状态 |
| `currentTime` | Number | 当前播放时间 (秒) |
| `duration` | Number | 总时长 (秒) |
| `playMode` | String | 播放模式: `order` / `single` / `random` |
| `lyricLines` | Array | 解析后的歌词数组 `[{time, text}]` |
| `currentLyricIndex` | Number | 当前歌词行索引 |
| `albumArtUrl` | String | 专辑封面 URL |
| `currentQuality` | String | 当前播放音质 |
| `playError` | String | 播放错误信息 |
| `retryCount` | Number | 音质降级重试次数 |

**关键方法**：

| 方法 | 说明 |
|------|------|
| `playSong(song)` | 核心播放方法：AI歌曲解析 → 缓存检查 → API获取 → 音质降级回退 → Howl 播放 |
| `tryPlayWithFallback(src, quality, song)` | 音质降级回退机制，按源特定的降级链重试 |
| `createHowlInstance(src)` | 创建 Howl 实例，监听 onload/onend/onloaderror |
| `parseLrc(lrcText)` | 解析 LRC 歌词文本为结构化数组 |
| `updateTime()` | requestAnimationFrame 驱动的播放时间更新 + 歌词同步 |
| `resolveAiSong(song)` | 解析 AI 生成的歌曲，通过搜索 API 获取真实信息 |
| `songsMatch(s1, s2)` | 歌曲匹配（兼容 AI 生成的无 ID 歌曲） |
| `loadFromCache(song)` | 从本地缓存加载歌曲（含歌词和封面） |
| `cacheMusicFile(song, url, metadata)` | 缓存音乐文件到本地 |
| `togglePlay()` / `seek()` / `nextSong()` / `prevSong()` | 播放控制 |
| `playFromList(songs, index)` | 从列表指定位置开始播放 |
| `addToPlaylist(song)` / `removeFromList(index)` | 播放列表管理 |
| `togglePlayMode()` | 切换播放模式 |
| `loadHistory()` | 从 localStorage 加载历史 |

**音质降级链**：

| 平台 | 降级顺序 |
|------|----------|
| 网易云 | 320000 → 192000 → 128000 |
| QQ音乐 | M1000 → M800 → M500 |
| 酷我 | 320k → 192k → 128k |
| B站 | lossless → high → standard |

#### 6.4.2 settings.js — 设置状态

**文件**: [src/renderer/src/stores/settings.js](file:///d:/music/music-player/src/renderer/src/stores/settings.js)

| 分类 | 字段 | 默认值 |
|------|------|--------|
| 音质 | `playQuality` / `downloadQuality` | `320000` |
| 缓存 | `cacheEnabled` / `cacheDirectory` / `autoCacheLyrics` / `autoCacheAlbumArt` | `true` / `''` / `true` / `true` |
| AI | `aiApiKey` / `aiModel` / `aiBaseUrl` / `aiTimeout` / `aiTemperature` | `''` / `gpt-4o-mini` / `https://api.openai.com/v1` / `30` / `0.7` |
| AI 歌单 | `aiMusicStyles` / `aiMoods` / `aiSelectedStyles` / `aiSelectedMoods` / `aiSongCounts` / `aiSongCount` / `aiCustomPrompt` | JSON 字符串数组 |
| 更新 | `updateGithubOwner` / `updateGithubRepo` | `''` |

**关键方法**：

| 方法 | 说明 |
|------|------|
| `getQualityOptions(source)` | 获取指定平台的音质选项列表 |
| `getQualityParam(source, mode)` | 获取指定平台 + 模式的 API 参数 |
| `getMusicStyles()` / `getMoods()` | 解析 JSON 获取风格/情绪标签 |
| `getSelectedStyles()` / `getSelectedMoods()` | 解析 JSON 获取已选标签 |
| `setSelectedStyles()` / `setSelectedMoods()` | 设置已选标签 |
| `setMusicStyles()` / `setMoods()` | 设置风格/情绪标签列表（设置页编辑用） |
| `getSongCounts()` / `setSongCounts()` | 获取/设置歌单数量选项 |
| `selectCacheDir()` / `refreshCacheInfo()` / `clearCacheData()` | 缓存管理 |
| `formatSize(bytes)` | 文件大小格式化 (1024进制) |
| `persist()` | 300ms 防抖持久化到 localStorage |

**API 密钥安全**：使用 Electron `safeStorage` 加密存储，以 `__enc__` 前缀标识。

---

### 6.5 API 层

**文件**: [src/renderer/src/api/index.js](file:///d:/music/music-player/src/renderer/src/api/index.js)

所有音乐 API 请求通过 `window.electronAPI.apiRequest()` 转发到主进程，主进程再请求 `https://music-api.gdstudio.xyz/api.php`。

| 函数 | 参数 | 说明 |
|------|------|------|
| `searchMusic({ keyword, source, count, pages })` | 搜索 | 多平台音乐搜索，返回标准化歌曲数组 |
| `getMusicUrl({ id, source, quality })` | 获取播放URL | 品质参数使用 `br` 或 `quality` |
| `getLyric({ id, source })` | 获取歌词 | 返回 LRC 格式歌词文本 |
| `getAlbumArt({ id, source })` | 获取封面 | 返回专辑封面图片 URL |

**常量**：

| 常量 | 值 |
|------|-----|
| `SOURCES` | `['netease', 'tencent', 'kuwo', 'bilibili']` |
| `SOURCE_MAP` | `{ netease: '网易云音乐', tencent: 'QQ音乐', kuwo: '酷我音乐', bilibili: 'B站' }` |

**API 参数规范**：使用 `types`（复数）作为操作类型参数，`lyric`（单数）作为歌词类型，`br` 作为音质参数。

---

### 6.6 工具函数

#### storage.js

**文件**: [src/renderer/src/utils/storage.js](file:///d:/music/music-player/src/renderer/src/utils/storage.js)

- `getHistory()` — 从 localStorage 读取播放历史
- `addHistory(item)` — 添加历史记录（去重，上限 200 条，最新在前）
- `clearHistory()` — 清空历史

#### debounce.js

**文件**: [src/renderer/src/utils/debounce.js](file:///d:/music/music-player/src/renderer/src/utils/debounce.js)

- `debounce(fn, delay=300)` — 通用防抖函数

---

### 6.7 样式系统

**文件**: [src/renderer/src/styles/](file:///d:/music/music-player/src/renderer/src/styles/)

#### tokens.css — 设计令牌

定义全局 CSS 变量：圆角 (`--radius-*`)、阴影 (`--shadow-*`)、间距 (`--spacing-*`)、字号 (`--font-size-*`)、字重 (`--font-weight-*`)、过渡 (`--transition-*`)，以及 Element Plus 变量映射。

#### themes/dark.css — 暗色主题

```
--bg-layer-1: #0f172a (最深)
--bg-layer-2: #1e293b
--bg-layer-3: #334155
--bg-hover: #475569
--text-primary: #f8fafc
--text-secondary: #94a3b8
--text-muted: #64748b
--border-color: #334155
--glass-bg: rgba(30, 41, 59, 0.7)
```

#### themes/light.css — 亮色主题

```
--bg-layer-1: #f8fafc (最浅)
--bg-layer-2: #f1f5f9
--bg-layer-3: #e2e8f0
--bg-hover: #cbd5e1
--text-primary: #1e293b
--text-secondary: #64748b
--text-muted: #94a3b8
--border-color: #e2e8f0
--glass-bg: rgba(255, 255, 255, 0.8)
```

#### mixins.css — 样式混入

- `.glass` — 毛玻璃效果
- `.btn-primary` / `.btn-secondary` / `.btn-icon` — 按钮样式
- `.card` — 卡片样式
- `.text-ellipsis` / `.text-secondary` / `.text-muted` — 文本工具类
- `.skeleton` — 骨架屏动画
- `@keyframes spin / pulse / fadeIn / slideInLeft` — 通用动画

---

## 7. 依赖关系

### 7.1 生产依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `vue` | ^3.5.40 | 前端框架 |
| `pinia` | ^2.3.1 | 状态管理 |
| `element-plus` | ^2.14.3 | UI 组件库 |
| `howler` | ^2.2.4 | 音频播放引擎 |
| `axios` | ^1.18.1 | HTTP 请求库 |
| `lucide-vue-next` | ^0.577.0 | SVG 图标库 |
| `electron-updater` | ^6.8.9 | 自动更新 |

### 7.2 开发依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `electron` | ^28.3.3 | Electron 框架 |
| `electron-vite` | ^5.0.0 | 构建工具 |
| `@vitejs/plugin-vue` | ^6.0.8 | Vue SFC 编译 |
| `vite` | ^5.4.21 | 构建工具 |
| `electron-builder` | ^26.15.3 | 打包工具 |

### 7.3 组件依赖关系图

```
App.vue
├── TitleBar.vue
├── RecommendPanel.vue → player store, hotList API
├── AIPlaylistPanel.vue → player store, settings store, aiChat API
├── SearchPanel.vue → player store, searchMusic API
├── PlaylistPanel.vue → player store
├── HistoryPanel.vue → player store
├── LocalMusicPanel.vue → player store, settings store, listLocalMusic API
├── SettingsPanel.vue → settings store, theme inject
├── PlayerBar.vue → player store, download/songInfo inject
├── DownloadModal.vue → settings store, getMusicUrl API, downloadMusic API
└── SongInfoModal.vue → player store, download/songInfo inject
```

---

## 8. 项目运行方式

### 8.1 环境要求

- Node.js >= 18
- npm >= 9

### 8.2 安装依赖

```bash
cd d:\music\music-player
npm install
```

### 8.3 开发模式

```bash
npm run dev
```

启动 electron-vite 开发服务器，支持热更新。

### 8.4 构建

```bash
npm run build
```

输出到 `out/` 目录。

### 8.5 预览

```bash
npm run preview
```

### 8.6 打包

```bash
# 仅打包为目录（不生成安装包）
npm run pack

# 构建 + 生成 NSIS 安装包
npm run dist
```

安装包输出到 `release/` 目录。

### 8.7 构建配置

**文件**: [electron.vite.config.mjs](file:///d:/music/music-player/src/renderer/electron.vite.config.mjs)

- **主进程**: 使用 `externalizeDepsPlugin` 外部化 node_modules
- **预加载**: 使用 `externalizeDepsPlugin` 外部化 node_modules
- **渲染进程**: 使用 `@vitejs/plugin-vue` 编译 Vue SFC，入口 `src/renderer/index.html`

---

## 9. 数据流

### 9.1 音乐播放流程

```
用户点击播放
  → playSong(song)
    → 是否 AI 生成歌曲？
      → 是: resolveAiSong() → searchMusic API → 更新播放列表
    → loadFromCache(song) → 检查本地缓存
      → 缓存命中: createHowlInstance(cacheUrl) → Howl 播放
      → 缓存未命中:
        → getMusicUrl() → API 获取播放 URL
        → getLyric() → API 获取歌词
        → getAlbumArt() → API 获取封面
        → 缓存歌词/封面/音乐文件
        → createHowlInstance(url) → Howl 播放
        → 播放失败 → tryPlayWithFallback() → 音质降级重试
```

### 9.2 下载流程

```
用户点击下载
  → DownloadModal 打开
  → 选择音质
  → startDownload()
    → 单曲: getMusicUrl() → 主进程 download-music → 系统保存对话框 → 流式下载
    → 批量: 遍历歌曲 → getMusicUrl() → 主进程 download-music-batch → 选择目录 → 逐个下载
  → 主进程通过 download-progress 事件推送进度
  → 完成/失败展示结果
```

### 9.3 AI 歌单生成流程

```
用户点击"生成歌单"
  → 收集风格/情绪/数量/自定义需求
  → 构建 System Prompt + User Prompt
  → 主进程 ai-chat → OpenAI 兼容 API
  → 解析 JSON 响应
  → 展示歌单列表 (isAiGenerated: true)
  → 用户播放时 → resolveAiSong() → searchMusic API → 获取真实歌曲信息
```

---

## 10. 关键约定与注意事项

| 约定 | 详情 |
|------|------|
| 文件大小计算 | 使用二进制单位：1KB = 1024B, 1MB = 1024×1024B |
| API 参数名 | `types`（复数）用于操作类型，`br` 用于音质，`lyric`（单数）用于歌词 |
| 防缓存 | 不同歌单请求需带唯一 `timestamp` 参数防止 axios 缓存 |
| SongInfoModal | 歌词和歌曲 URL 以文本链接形式展示（非按钮） |
| 导航顺序 | 推荐 → 歌单 → 搜索 → 列表 → 历史 → 本地 → 设置 |
| 默认 Tab | 应用启动默认显示"推荐" |
| 热榜缓存 | RecommendPanel 使用 localStorage 缓存，有效期 1 小时 |
| API 密钥安全 | 加密前缀 `__enc__` + Electron safeStorage 加密存储 |
| 主题持久化 | 保存用户偏好 `dark`/`light`/`system`，自动解析系统主题 |
| 播放历史 | 上限 200 条，去重，最新在前 |
| 无边框窗口 | `frame: false`，自定义 TitleBar 实现拖拽和窗口控制 |