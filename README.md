# 音乐播放器

基于 **Electron + Vue 3** 构建的桌面音乐播放与下载工具，支持多平台音乐搜索、在线播放、歌词同步、下载、AI 智能歌单等功能。

## 功能特性

- **多平台搜索** — 支持网易云音乐、QQ音乐、酷我音乐、B站四个平台
- **在线播放** — 高品质音频播放，支持音质降级自动回退
- **歌词同步** — 逐行歌词滚动显示
- **音乐下载** — 支持单曲下载，多音质可选
- **AI 智能歌单** — 根据风格、情绪自动生成个性化歌单
- **本地音乐管理** — 本地音乐文件导入与播放
- **缓存管理** — 播放缓存加速，支持自定义缓存目录
- **主题切换** — 暗色模式 / 亮色模式 / 跟随系统
- **自动更新** — 支持从 GitHub Releases 检查并下载更新
- **快捷键操作** — 空格播放暂停，方向键切歌调音量等

## 技术栈

| 技术 | 用途 |
|------|------|
| Electron 28 | 桌面应用框架 |
| Vue 3 (Composition API) | 前端框架 |
| Pinia | 状态管理 |
| Vite | 构建工具 |
| Howler.js | 音频播放 |
| Axios | HTTP 请求 |
| Element Plus | UI 组件库 |
| Lucide Vue Next | 图标库 |
| electron-builder | 应用打包 |

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 打包为可执行程序

```bash
npm run dist
```

打包输出在 `dist/` 目录，生成便携版（绿色免安装）。

## 项目结构

```
src/
├── main/
│   └── index.js              # Electron 主进程
├── preload/
│   └── index.js              # 预加载脚本
└── renderer/
    ├── index.html            # 入口 HTML
    └── src/
        ├── main.js           # Vue 应用入口
        ├── App.vue           # 根组件
        ├── api/index.js      # 音乐 API 封装
        ├── components/       # Vue 组件
        │   ├── PlayerBar.vue       # 播放控制栏
        │   ├── SearchPanel.vue     # 搜索面板
        │   ├── RecommendPanel.vue  # 推荐面板
        │   ├── PlaylistPanel.vue   # 播放列表
        │   ├── HistoryPanel.vue    # 播放历史
        │   ├── AIPlaylistPanel.vue # AI 歌单
        │   ├── LocalMusicPanel.vue # 本地音乐
        │   ├── SettingsPanel.vue   # 设置面板
        │   ├── DownloadModal.vue   # 下载弹窗
        │   ├── SongInfoModal.vue   # 歌曲详情
        │   └── TitleBar.vue        # 标题栏
        ├── stores/
        │   ├── player.js     # 播放器状态
        │   └── settings.js   # 设置状态
        ├── utils/            # 工具函数
        └── styles/           # 样式与主题
```

## 常用快捷键

| 快捷键 | 功能 |
|--------|------|
| `Space` | 播放 / 暂停 |
| `Ctrl + ←` | 上一曲 |
| `Ctrl + →` | 下一曲 |
| `Ctrl + ↑` | 音量增加 |
| `Ctrl + ↓` | 音量减小 |
| `Ctrl + M` | 静音切换 |
| `Ctrl + F` | 聚焦搜索 |
| `Ctrl + 1~6` | 切换标签页 |

## License

ISC