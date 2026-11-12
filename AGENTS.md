# Autoship

纯提示词的开发流程接力项目。使用现有 Agent 的能力与 Markdown Skills，阶段流程和接力约定都以提示词表达。

## 依据

- 产品决定与边界：[PROPOSAL.md](PROPOSAL.md)。
- 使用入口和能力范围：[README.md](README.md)。
- 会话创建、交接和接手：[skills/autoship/references/sessions.md](skills/autoship/references/sessions.md)。
- 验证结果、待验项与验证方法：[docs/validation.md](docs/validation.md)。
- 修改安装体验或研究取舍时读：[docs/installation.md](docs/installation.md)、[docs/research.md](docs/research.md)。
- 开发过程与未完成项：[progress.md](progress.md)。

## 工作原则

用户体验优先，参考成熟项目，避免过度开发。提示词讲清任务即可，通用规则只写一次，当前阶段以外的材料按需读取。

开发 Autoship 本身直接连续推进，由 Agent 判断任务数量及会话边界，不强制建立 tasks.md、拆成独立 task 或逐项开启会话。产品中的流程规模同样按难度与实际需要决定，小项目可以只用 1–2 个 task。

涉及前端时先读项目的设计与流程文档，用真实渲染检查视觉对齐与动效。减少冗余说明，保留必要标签、可访问名称和不可逆操作的后果提示。

实质流程改动完成后只安排一轮独立子代理 review，随后由主 Agent 修复并验证，不重复派发。任务的审核和修复记录随接力保留，修复、换会话和回退不能重置。

验证提示词的可执行性、引用可达性及安装后的完整性。阶段出口应能判定，新增规则需解决具体问题并避免重复。模拟情境必须标记为模拟，未经真实宿主实测的接力不能写成完整支持。

状态与失败证据放在任务工作树之外。Git 回退只针对 Autoship 创建且范围可核对的工作树，保留用户原有工作区。默认只在本地工作，推送或发布须有用户明确指示。

有实质进展时在 progress.md 追加一条简短记录，使用北京时间。

When interacting with Cloudflare, use the cf CLI unless the project has a Wrangler configuration file.
