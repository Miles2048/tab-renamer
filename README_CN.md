# Tab Renamer Pro

一个专业、轻量级的浏览器扩展，用于个性化和组织你的浏览器标签页。

[English version](./README.md)

![Icon](icon.svg)

## ✨ 功能特性

- **🎯 即时重命名**：一键修改任何标签页的标题。
- **⌨️ 快捷键支持**：按下 `Cmd+Shift+Y` (Mac) 或 `Ctrl+Shift+Y` (Windows) 快速唤起重命名界面。
- **💾 持久化存储**：即使刷新页面或重启浏览器，自定义标题依然有效。
- **🛡️ 动态锁定**：使用 `MutationObserver` 防止单页应用 (SPA) 和动态网站将你的自定义标题改回去。
- **💎 高级 UI**：符合现代审美标准的玻璃拟态设计（Glassmorphism）。
- **⚡ 轻量化**：采用 Manifest V3 标准，资源占用极低。

## 🚀 安装步骤

1.  **下载/克隆** 此仓库到本地。
2.  打开浏览器（Chrome, Edge, Brave 或任何基于 Chromium 的浏览器）。
3.  进入扩展程序管理页面：`chrome://extensions`。
4.  在右上角开启 **开发者模式**。
5.  点击 **加载解压的扩展程序**。
6.  选择 `tab renamer` 文件夹。

## 📖 使用说明

1.  点击浏览器工具栏中的 **Tab Renamer Pro** 图标。
2.  在输入框中输入你想要的名称。
3.  按 **回车** 或点击 **Apply Rename**。
4.  如果想恢复原始标题，点击 **Reset Original**。

## 🛠️ 技术栈

- **HTML5/CSS3**：自定义玻璃拟态设计系统。
- **JavaScript (ES6+)**：核心逻辑与 DOM 操作。
- **Chrome Extension API (MV3)**：用于存储与消息通信。

## 📄 开源协议

本项目采用 MIT 协议。
