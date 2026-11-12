# 二次升级的研究与取舍

2026-11-12（北京时间）。本页记录实际读过的资料、吸收的方法及其落点，不将第三方经验当作 Autoship 的实测结果。知识库页面经 Wiki MCP 读取全文；开源资料读取了对应源文件。未复制第三方提示词正文或引入其运行时。

## Wiki 阅读记录

Wiki 未返回可打开的页面 URL，以下使用其原始路径作为引用。

| 已读页面 | 对本项目有用的启发 | 本次落点 |
| --- | --- | --- |
| Prompt 指令债，`concepts/prompt-instruction-debt.md` | 保留操作边界和完成标准，收窄 Skill 触发，减少无条件读取与重复检查。 | 入口只负责路由；共享规则分到 context / quality；验证随变更失效，不每步全量重跑。 |
| Long-Running Agent，`concepts/long-running-agent.md` | 跨上下文需可恢复的目标、实际状态与剩余工作；已有进展不等于完成。 | 接力记录增加验收 ID、Skill 版本和发现处置；继续保留单一写入者及历史预算。 |
| Agent 验证循环，`concepts/agent-verification-loop.md` | 用户行为应由真实执行证据支撑；工作流需要可重复的情境评估。 | 验收表关联条件、动作、结果与证据；扩充压力情境，区分静态、模拟与真实宿主。 |
| Agent 驱动的代码库维护，`concepts/agent-codebase-maintenance.md` | 改规则要说明解决了哪类实际问题；复杂度必须对应收益。 | 本页保留变更依据；贡献流程要求检查规则重复和维护成本。 |
| Context Engineering，`concepts/context-engineering.md` | 组织信息的读取顺序，给下一位执行者留下必要上下文。 | 从项目索引到受影响路径，按角色准备带用途的阅读列表。 |
| Skill 工程化设计，`concepts/skill-engineering.md` | 渐进披露、清楚的输入与出口、具体示例比泛泛要求更可用。 | 每阶段明确准备条件、动作与出口；加入任务模板、安装自检和示例。 |
| 企微邮件 Skill，`entities/qwemail-skill-94pct-codegen.md` | 从用户语义逐步定位代码，调查可扩展关键词，决定必须有依据。 | 已有项目先追踪行为与调用路径；研究结果与已确认范围分开保存。 |
| How I work with Agents，`raw/articles/thorstenball-how-i-work-with-agents.md` | 要可观察的交付证明，允许 Agent 自行选择实现路径，并检查长期知识是否仍有用。 | 统一证据条件；只沉淀经验证可复用的知识，替换过期规则。 |

最后一篇的知识库正文附有[原始文章入口](https://x.com/thorstenball/status/2114386050638336082)；本次读取的是 Wiki 保存的正文，不是重新抓取 X。上表用于归纳方法，不采用文章中的性能数字或第三方产品能力作为本项目承诺。

## 开源原始材料

| 项目与读取版本 | 读取的关键原文 | 采用方式 |
| --- | --- | --- |
| Trellis，`f089cb3286071199e84118dee86b6d76aab032f1` | [workflow](https://github.com/mindfold-ai/Trellis/blob/f089cb3286071199e84118dee86b6d76aab032f1/.trellis/workflow.md)、[research](https://github.com/mindfold-ai/Trellis/blob/f089cb3286071199e84118dee86b6d76aab032f1/.trellis/agents/research.md)、[implement](https://github.com/mindfold-ai/Trellis/blob/f089cb3286071199e84118dee86b6d76aab032f1/.trellis/agents/implement.md)、[check](https://github.com/mindfold-ai/Trellis/blob/f089cb3286071199e84118dee86b6d76aab032f1/.trellis/agents/check.md) | 学习任务上下文、原始资料研究与知识回写；用 Markdown 阅读列表实现，不引入 JSONL、hooks、Python 工具或 channel runtime。 |
| Superpowers，`22f0b463e7a5e579904dd6211a520321035526f7` | [writing-plans](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/skills/writing-plans/SKILL.md)、[verification-before-completion](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/skills/verification-before-completion/SKILL.md)、[testing-skills-with-subagents](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/skills/writing-skills/references/testing-skills-with-subagents.md) | 学习可独立验收的任务、证据先于完成声明及压力情境；保持 Autoship 单轮审核，不采用多轮 reviewer 循环或逐阶段审批。 |
| OpenSpec，`d12c2817776779e06891d68230773b3bb673b106` | [spec-driven schema](https://github.com/Fission-AI/OpenSpec/blob/d12c2817776779e06891d68230773b3bb673b106/schemas/spec-driven/schema.yaml)；另读取了当天 [concepts](https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md) | 学习行为规范、增量变化、场景验收，以及测试/文档与对应实现同交付；沿用目标项目的文档结构，不要求安装 OpenSpec。 |

Trellis 选读源文件通过固定提交地址获取；Superpowers 通过本地只读克隆研究；OpenSpec 克隆遇到 TLS 错误后改读固定提交的 schema，concepts 使用网页正文。研究下载与原始运行记录保存在工作树外，不随 Skills 分发。第三方源码如需实际复制，应在当时核对对应文件许可并保留所需声明；本轮使用自主撰写的表达。

## 有意保留的边界

- **纯提示词。** Wiki 中的 CLI 状态机、编译期强约束与 Trellis 的自动注入可以提供提示词没有的保证。本项目继续调用现有工具，不宣称 Markdown 能提供原子锁、精确计数或自动唤醒。
- **按需连续工作。** 部分上下文资料建议固定阈值整理，Ball 的文章建议依赖宿主压缩。两者提示的是不同环境的经验；Autoship 以当前任务和宿主能力决定边界，不固定百分比或每任务一个会话。
- **证据要解释结果。** 文件落盘能保留证据，但文件存在不等于任务成功。验证须记录完成状态、实际结果和版本，模拟结果不能充当真实接力。
- **规则有成本。** 不照搬大量红线、强制 JSON、固定细粒度拆分、自动发布或任意模型切换。明确完成标准与重要边界，其他实现判断交给当前 Agent。
- **设计有理由。** 无现有设计时，改为按用户、内容与交互需求选择并保存参考；取消随机选择。保留已有项目视觉方向，离线时明确记录自拟方案。

## 变更到验证

| 原有缺口 | 改动 | 验证入口 |
| --- | --- | --- |
| 阶段描述可理解，但出口含糊 | 逐阶段增加可观察的准备/完成条件 | [情境走查](validation.md#情境走查) |
| 已有项目调查与缺陷入口不够明确 | investigate 与 plan-fix；记录当前行为、差异和回归条件 | [使用示例](examples.md) |
| 证据、审查版本和最终结果容易混用 | quality 单一规则来源；发现逐条处置 | [验证记录](validation.md) |
| 安装仅说明复制目录，难排查更新或缺文件 | 安装、自检、更新与兼容范围说明 | [安装指南](installation.md) |
| 文档同步只更新结果，缺少知识筛选 | 经验证的规则回写原位置，清理过时内容 | docs-sync 与独立 review |
