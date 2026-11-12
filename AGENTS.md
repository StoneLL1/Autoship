# Autoship

轻量的开发流程自动接力工具。使用现有 Agent、短 Skill 和 Node.js 标准库；不引入额外模型 API、数据库或常驻服务。

## 依据

- 产品决定与边界：[PROPOSAL.md](PROPOSAL.md)。
- 当前可运行范围和命令：[README.md](README.md)。
- 接入协议、状态和恢复：[docs/runtime.md](docs/runtime.md)。
- 开发过程与未完成项：[progress.md](progress.md)。

## 工作原则

用户体验优先，参考成熟项目，避免过度开发。提示词讲清任务即可，通用规则只写一次，当前阶段以外的材料按需读取。

开发 Autoship 本身直接连续推进，由 Agent 判断需要怎样组织工作；不强制建立 tasks.md、拆成独立 task 或逐项开启会话。产品中的任务数量也应按难度与实际需要决定，小项目可以只用 1–2 个 task；一个 session 执行几个 task、哪些阶段合并，由 Agent 根据上下文与关联性判断。

涉及前端时先读项目的设计与流程文档，用真实渲染检查视觉对齐与动效。减少冗余说明，保留必要标签、可访问名称和不可逆操作的后果提示。

实质代码改动完成后只安排一轮独立子代理 review，随后由主 Agent 修复并验证，不重复派发。运行器内的任务仍保留各自的审核记录与预算，修复、换会话和回退不能重置这些记录。

验证运行器改动使用 `node --test`，重点检查真实 Git 状态、失败恢复、交接和单轮审核。模拟 Agent 的结果必须标记为模拟；未经实测的适配不能写成完整支持。

运行状态与失败证据放在任务工作树之外。Git 回退只针对 Autoship 创建的工作树，保留用户原有工作区。默认只在本地工作，推送或发布须有用户明确指示。

有实质进展时在 `progress.md` 追加一条简短记录，使用北京时间。

When interacting with Cloudflare, use the cf CLI unless the project has a Wrangler configuration file.
