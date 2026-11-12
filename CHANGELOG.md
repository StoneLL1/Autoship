# Changelog

## 0.1.0 — 2026-11-12

首个可运行版本，使用 Node.js 24+ 标准库、Git 与现有 Agent CLI。

- 新项目与追加功能入口：需求澄清、确认、规划和自动开发。
- 按工作难度拆分任务，支持实现会话复用；每个任务单独保存审核与恢复记录。
- 一轮独立代码审核、修复预算、失败回退、任务搁置与断点续跑。
- 文档同步、待验项补验、已配置候补 Agent 与自包含 Skills 导出。
- 前端设计及交互流程文档检查，附离线交互式流程说明。

验证范围：Windows 上真实 Codex 完整流程通过。Claude Code、OpenCode 为实验适配；WorkBuddy 仅 Skills 导入。模拟测试不代表真实模型验证；Linux/macOS 结果以 GitHub Actions 实际运行记录为准。
