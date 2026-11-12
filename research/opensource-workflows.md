# Autoship：开源开发工作流原始资料调研

历史说明（2026-11-12）：项目已改为纯提示词，本文保留当时的调研结论，不代表当前接力能力已经验证。现行边界见 [产品方案](../PROPOSAL.md)。

调研日期：2026-11-11。下面的提交时间均为 UTC。范围是官方仓库的 README、实际工作流或实现文件、依赖清单和许可证；没有安装、运行这些项目，也没有把它们的提示词当作本次任务指令执行。本文判断的是可借鉴的机制，不是运行可靠性测试，也不以 stars 作为成熟度证明。

## 结论

Autoship 所需的多数工作流机制已有具体实现可参考：Superpowers 的任务工作区、文件交接和限定范围复审；Matt Pocock skills 的需求访谈、纵向任务切片和 fresh-context 执行；Spec Kit 的精简文档预设和 CLI 参数适配；GSD 的中断后结果核对。无需把任何一个项目整体引入，才能获得这些机制。

这些项目也已经超出“手工依次调用几条提示词”：Superpowers 可在控制会话内连续执行任务，Matt 的 `implement-spec` 可调度依赖就绪的任务，当前 Spec Kit 有持久化运行与恢复代码，当前 GSD Pi 更是独立的执行运行时。不能用“它们都不自动化”来定位 Autoship。Autoship 更明确的取舍是：复用现有 agent、少量本地调度代码、任务级可靠接力，以及用户已确定的修复与回退政策。具体依据见后文。

## 版本、活跃度与许可证

| 项目 | 本次固定快照 | 发布或维护证据 | 许可证 |
| --- | --- | --- | --- |
| obra/superpowers | `main`，[`22f0b463e7a5`](https://github.com/obra/superpowers/commit/22f0b463e7a5e579904dd6211a520321035526f7)，2026-11-03 22:17 | [v7.0.2](https://github.com/obra/superpowers/releases/tag/v7.0.2)，2026-11-03 | [MIT](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/LICENSE) |
| github/spec-kit | `main`，[`f29319d550d1`](https://github.com/github/spec-kit/commit/f29319d550d1f05404f7184b92e995600ca2293f)，2026-11-10 23:14 | [v1.4.0](https://github.com/github/spec-kit/releases/tag/v1.4.0)，2026-11-10；快照包版本已为 `1.4.1.dev0`，不是该发布标签 | [MIT](https://github.com/github/spec-kit/blob/f29319d550d1f05404f7184b92e995600ca2293f/LICENSE) |
| mattpocock/skills | `main`，[`4ae2317ddb22`](https://github.com/mattpocock/skills/commit/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d)，2026-10-31 14:23 | [v1.3.2](https://github.com/mattpocock/skills/releases/tag/v1.3.2)，2026-10-29 | [MIT](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/LICENSE) |
| gsd-build/get-shit-done，历史入口 | `main`，[`bdcaab2c752d`](https://github.com/gsd-build/get-shit-done/commit/bdcaab2c752d9a33a1a1ca9acf3a3c81fb991815)，2026-05-31 13:34 | [README](https://github.com/gsd-build/get-shit-done/blob/bdcaab2c752d9a33a1a1ca9acf3a3c81fb991815/README.md) 明确不再活跃并迁移至 GSD Core；不作为当前实现主体 | 历史入口；当前引用以对应新仓库许可证为准 |
| open-gsd/gsd-core，当前 Core 路线 | 默认分支 `next`，[`cb15dcf13d99`](https://github.com/open-gsd/gsd-core/commit/cb15dcf13d99e0c24ce3bff7089ae02f9a6a6aaa)，2026-11-11 05:15 | 快照 package 版本 `1.20.1`；本次未独立核验对应稳定发布标签，`next` 内容不等于已发布版本 | [MIT](https://github.com/open-gsd/gsd-core/blob/cb15dcf13d99e0c24ce3bff7089ae02f9a6a6aaa/LICENSE) |
| open-gsd/gsd-pi，当前独立运行时路线 | `main`，[`c0bc9c4e7e0a`](https://github.com/open-gsd/gsd-pi/commit/c0bc9c4e7e0a8581aeac3af397031dc3a63d012e)，2026-11-10 13:30 | 快照 package 版本 `1.23.0`；本次未独立核验对应稳定发布标签 | [MIT](https://github.com/open-gsd/gsd-pi/blob/c0bc9c4e7e0a8581aeac3af397031dc3a63d012e/LICENSE) |

这些许可证允许在其条件下使用、修改和分发，实际复制代码或实质性内容时应保留对应版权和许可声明；仓库中另有许可证的第三方内容需另行核对。本报告的参考链接不意味着任何内容都可以无条件复制。

## 1. Superpowers：任务级交接、审查与修复循环最接近 Autoship

### 已验证机制

**阶段组织。** 官方流程覆盖 brainstorming、隔离工作区、writing-plans、执行、审查和收尾。当前任务执行有 subagent-driven 和 inline 两条路径，均可在一个控制会话里连续执行计划，并共用计划工作区与 ledger。因此它已经包含会话内编排，但仅凭这些源文件不能认定它提供了 Autoship 所需的跨进程无人值守 runner。[README](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/README.md)、[subagent-driven-development](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/skills/subagent-driven-development/SKILL.md)

**按需加载。** `hooks/session-start` 实际读取的是 `using-superpowers/SKILL.md` 这一入口文件，通过 `escape_for_json`、`emit_json` 按宿主生成启动上下文；不是一次把所有技能内容塞进会话。入口技能再引导读取相关技能。脚本特意减少子进程以兼顾 Windows Git Bash，体现了很薄的宿主接入方式；各平台的事件和安装路径仍不完全相同。[启动脚本](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/hooks/session-start)、[入口技能](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/skills/using-superpowers/SKILL.md)

**交接不是整段聊天记录。** 每任务使用新的 implementer，通过 task brief、report、review package 和 ledger 的路径传递上下文。派发前捕获 `BASE = git rev-parse HEAD`，审查使用任务的完整 `BASE..HEAD`，避免多次提交时只看 `HEAD~1`。控制者组织审查，worker 不再自行创建 reviewer，从而避免重复审查。当前源文件把需求符合性和代码质量放在同一次任务审查中，不能沿用旧资料概括成永远固定的“两次 review”。[任务执行技能](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/skills/subagent-driven-development/SKILL.md)

**修复有范围和次数上限。** 当前默认最多五轮：前三轮继续原 implementer，后两轮使用新的、更强的 implementer；宿主无法恢复子 agent 时也通过文件创建新 agent。修复后的复审只覆盖 `FIX_BASE..HEAD` 和对应问题，无关发现不无限延长本轮。达到上限后的处置允许控制者裁决、暂存部分发现或做最小解阻，和 Autoship 的“二轮后必须回退、最多三个会话”不同。[fix-loop.md](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/skills/subagent-driven-development/references/fix-loop.md)

**恢复与待验。** resume 指引通过 ledger 识别计划、跳过已完成任务、接续修复轮次。无法从 diff 确认的事项可以先不阻止其余审查，但须由控制者在任务完成前处理。这与 Autoship 允许记录环境待验后继续并不完全一致，需要明确改写完成判定。[resuming.md](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/skills/subagent-driven-development/references/resuming.md)、[cannot-verify.md](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/skills/subagent-driven-development/references/cannot-verify.md)

**依赖与平台。** 当前 package 未声明生产 npm 依赖，主要复用宿主 agent、Markdown 技能和平台 hook/plugin。README 列出多个宿主安装方式；这证明内容和接入层覆盖多个平台，不证明所有宿主的会话恢复、自动运行和权限行为完全相同。[package.json](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/package.json)、[README](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/README.md)

### 对 Autoship 的取舍

可借鉴：薄入口、按阶段加载、任务 brief、路径式交接、任务基线 diff、单一审查责任、限定修复范围、可恢复 ledger。

不宜照搬：所有情形都触发技能的强约束文案、统一强制 TDD、极细粒度计划、五轮修复政策，以及每任务审查后再默认整分支全面重审。Autoship 已有更具体的质量门槛与次数规则；恢复时还应检查实际工作区与提交证据，不能只信 ledger 的自然语言。

## 2. Spec Kit：精简文档预设与 CLI 适配值得参考，整体运行时偏重

### 已验证机制

**当前已经存在工作流引擎。** `workflows/speckit/workflow.yml` 声明 specify → review-spec → plan → review-plan → tasks → implement，并把两次 review 写成 approve/reject gate，拒绝时终止。它与 Autoship“需求确认之后继续自动执行、规划产物整体审核一次”不一致，但说明流程顺序和 gate 可从具体技能内容中分离。[工作流定义](https://github.com/github/spec-kit/blob/f29319d550d1f05404f7184b92e995600ca2293f/workflows/speckit/workflow.yml)

**Lean 预设直接解决文档膨胀。** 当前 `presets/lean` 使用自包含命令，不依赖另一层模板，主要产生 spec、plan、tasks、code 与 constitution，并按依赖顺序组织任务。可借鉴“足以执行的少量文档”，无需把 PRD、设计、技术栈、应用流程机械拆成彼此重复的固定文件。[Lean README](https://github.com/github/spec-kit/blob/f29319d550d1f05404f7184b92e995600ca2293f/presets/lean/README.md)

**适配器是参数数组，不是模型 API。** `OpencodeIntegration.build_exec_args()` 构造可执行文件及 `run`、`--command`、可选 `-m`、`--format json` 等 argv。其 `CANONICAL_TO_NATIVE` 对 hook 作平台映射，特别把 session-start 映射到 `experimental.chat.system.transform`，因为 `session.created` 没有合适的上下文输出通道。这是重要的反例：相似事件名不等于相同语义。[OpenCode integration 源码](https://github.com/github/spec-kit/blob/f29319d550d1f05404f7184b92e995600ca2293f/src/specify_cli/integrations/opencode/__init__.py)

**恢复状态来自落盘记录。** `workflow_resume()` 加载 `RunState`、核验已安装工作流及所属项目，再调用 `engine.resume()`，返回结构化 outcome 和对应退出码。所属目录解析会检查持久化路径、存在性及符号链接，并在不能确认时失败退出。它是实际恢复代码，而非仅在提示词中要求“继续”。本次没有运行恢复或评估所有引擎路径。[command_resume.py](https://github.com/github/spec-kit/blob/f29319d550d1f05404f7184b92e995600ca2293f/src/specify_cli/workflows/command_resume.py)、[恢复目录解析](https://github.com/github/spec-kit/blob/f29319d550d1f05404f7184b92e995600ca2293f/src/specify_cli/workflows/_command_resume_state.py)

**完整包的成本明显高于 Markdown 技能。** 当前要求 Python ≥ 3.11，并声明 Typer、Click、Rich、PyYAML、JSON5、MCP、Pydantic、Lark 等依赖。预设、工作流、集成和扩展体系提供定制能力，同时扩大了维护面。[pyproject.toml](https://github.com/github/spec-kit/blob/f29319d550d1f05404f7184b92e995600ca2293f/pyproject.toml)

### 对 Autoship 的取舍

可借鉴：Lean 文档、清晰阶段输入输出、argv 形式的原生 CLI 适配、结构化执行结果、可恢复运行记录，以及逐宿主核对事件语义。

不宜照搬：完整引擎、工作流语言、依赖与扩展体系；也不应默认保留每一阶段人工审批。Autoship 尚不需要通用工作流平台。上述适配代码能说明实现方式，但不替代对每个 CLI 当前版本、账号登录、权限和异常退出的实际兼容性验证。

## 3. Matt Pocock skills：访谈、任务切片和文件交接轻，但不是现成的统一调度器

### 已验证机制

**区分用户入口与内部技能。** README 明确区分用户主动调用的编排技能和模型按需使用的工程技能，并限制用户入口彼此直接调用。因此不能把现有所有 slash command 原封不动串起来，宣称已经得到无人值守流程。当前提交新增的 `in-progress/software-factory` 是进行中的内容，不能作为已成熟工厂引擎的证据。[README](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/README.md)、[本次提交](https://github.com/mattpocock/skills/commit/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d)

**任务按可验证的纵向切片拆分。** `to-tickets` 强调一个任务贯穿必要层次、可展示、适合新上下文，并明确阻塞关系而非把全部任务串成假依赖。产物可以是本地文件或 tracker issue。粒度与阻塞关系仍有用户确认环节，Autoship 需要把这项确认纳入前期需求/规划边界。[to-tickets](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/to-tickets/SKILL.md)

**已有一次调用后的自动派发。** `implement-spec` 在一个集成分支上推进整份 spec，依据阻塞图找到就绪任务，派发 fresh-context implementer，使用各自 worktree/branch，再交给合并 subagent 集成；完成后推进新的就绪任务，最终 code-review 并修复。上下文通过路径而非整个历史传递。它证明 skill 也能借助宿主原生子 agent 完成相当多编排；不证明退出宿主后还有外部调度者接力。[implement-spec](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/implement-spec/SKILL.md)

**审查与实现隔离。** `code-review` 固定比较基线，分别派新上下文 reviewer 看工程标准和需求符合性，避免报告工具已强制检查的问题。可借鉴审查维度和上下文隔离；但默认两个并行 reviewer、分别报告并不一定符合 Autoship 对少重复、轻流程的偏好。`implement` 本身只有很短的指令：落实 spec/ticket、适当测试、审查、提交。[code-review](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/code-review/SKILL.md)、[implement](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/implement/SKILL.md)

**handoff 指向事实源。** 交接文件优先引用已存在的 specs、plans、ADRs、issues、commits、diffs，不重新抄写全部材料，并移除秘密。不过上游默认写到系统临时目录，不能直接当 Autoship 的长期失败证据存储。所读实现技能也没有提供 Autoship 所要求的固定修复计数、任务基线回退与跨进程重启协议。[handoff](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/productivity/handoff/SKILL.md)

**内容较轻，行为依赖宿主。** package 没有生产 npm 依赖，只有发布工具等开发依赖；README 提供多宿主技能安装方式。具体技能可能依赖 shell、git、tracker、worktree、subagent 等宿主工具。技能能被发现，不等于宿主已经实现统一的无人值守执行接口。[package.json](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/package.json)、[README](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/README.md)

### 对 Autoship 的取舍

可借鉴：先访谈再落实、需求与实现事实分离、纵向任务切片、显式依赖、简短阶段技能、新上下文与文件指针式交接。

不宜照搬：技能入口间的调用规则与 Autoship 自动推进目标有冲突，需要重新组织为 Autoship 自己的内部阶段；多个 worktree、并行实现/合并和两路 reviewer 也不必成为首版默认。不能以该仓库含有 `software-factory` 名称就认定它已经实现稳定的外部 runner。

## 4. GSD：必须区分当前 Core 与独立 Pi 运行时

### 仓库关系与当前范围

`gsd-build/get-shit-done` 当前 README 指向 `open-gsd/gsd-core`，所以旧项目资料不能直接当成当前 GSD Pi 的能力说明。另一路 GSD Pi 是基于独立终端 agent 的运行时。本文只分析两者当前官方仓库的固定快照；旧 GSD-2 的归档历史不用于推断当前功能。[旧仓库迁移说明](https://github.com/gsd-build/get-shit-done/blob/bdcaab2c752d9a33a1a1ca9acf3a3c81fb991815/README.md)、[GSD Core README](https://github.com/open-gsd/gsd-core/blob/cb15dcf13d99e0c24ce3bff7089ae02f9a6a6aaa/README.md)、[GSD Pi README](https://github.com/open-gsd/gsd-pi/blob/c0bc9c4e7e0a8581aeac3af397031dc3a63d012e/README.md)

### GSD Core：最有价值的是“异常退出后先核对结果”

Core 的公开流程是 Discuss → Plan → Execute → Verify → Ship，包含 fresh-context 执行、持久化状态与上下文文件，并覆盖多个 agent。它同时区分新项目与既有项目接入。当前代码分支是 `next`，因此应把这里的细节标成当前开发快照能力。[README](https://github.com/open-gsd/gsd-core/blob/cb15dcf13d99e0c24ce3bff7089ae02f9a6a6aaa/README.md)

`completion-reconciliation.md` 给出了具体恢复规则：会话或传输异常不等于任务失败；先核对磁盘上的 SUMMARY 与当前执行范围内的提交，再决定后续。提交探测不可用时返回特殊未知状态，不能把未知当成“无提交”而重新派发。SUMMARY 与匹配提交齐全只是允许进入后续验证，不是已经证明功能正确。这对避免“agent 明明做完了，runner 因终端断开又重做一次”非常有价值。[completion-reconciliation.md](https://github.com/open-gsd/gsd-core/blob/cb15dcf13d99e0c24ce3bff7089ae02f9a6a6aaa/gsd-core/workflows/execute-phase/steps/completion-reconciliation.md)

Core 当前 package 要求 Node ≥ 24、npm ≥ 10，并包含 Claude Agent SDK 与 `ws`，整体已不只是 Markdown。Autoship 可以借鉴核对规则，而无需依赖其执行库。[package.json](https://github.com/open-gsd/gsd-core/blob/cb15dcf13d99e0c24ce3bff7089ae02f9a6a6aaa/package.json)

### GSD Pi：可靠性机制可参考，但架构不符合 Autoship 的轻量目标

当前 auto-mode 文档描述：从 SQLite 中的权威状态计算下一工作单元，为任务建立新 agent session，提交结果后更新数据库，再投影出 Markdown。流程包含计划、执行、完成判定、路线重评、UAT 和 milestone 验证；保留 attempt、失败历史与恢复信息。模型提交候选结果，宿主针对当前修订的验证负责发布完成状态。这里最值得借鉴的是“模型说完成”和“控制程序确认完成”分离。[auto-mode.md](https://github.com/open-gsd/gsd-pi/blob/c0bc9c4e7e0a8581aeac3af397031dc3a63d012e/docs/user-docs/auto-mode.md)

ADR-046 明确提出数据库作为生命周期状态权威，状态、结果、豁免和阻塞分开记录，Markdown 为投影，以解决多个文件、运行时计数与数据库彼此冲突的问题。ADR 是设计证据，不能单凭文档认定所有迁移都已完成或经过生产验证；本次没有运行其内核。[ADR-046](https://github.com/open-gsd/gsd-pi/blob/c0bc9c4e7e0a8581aeac3af397031dc3a63d012e/docs/dev/ADR-046-database-authoritative-workflow-lifecycle.md)

其 package 声明多个模型厂商 SDK、Claude Agent SDK、MCP SDK、Playwright、sql.js、Sharp 等依赖，并有平台原生组件。它是自带运行时的完整产品，不能简单包装成“轻量技能方案”。[package.json](https://github.com/open-gsd/gsd-pi/blob/c0bc9c4e7e0a8581aeac3af397031dc3a63d012e/package.json)

### 对 Autoship 的取舍

可借鉴：恢复前核对事实、未知与失败分开、验证结果绑定代码修订、保留失败 attempt，以及只由一个控制者更新权威进度。

不宜照搬：GSD Pi 的独立 agent 运行时、数据库、模型供应商路由和 SDK 依赖；Core 的完整工作流集合也不必整体吸收。对 Autoship 的推论是：可以用一个很小的本地状态记录承担权威状态，Markdown 承担需求、决定和交接说明，避免让多个文件同时决定“下一步是什么”。这是一项设计建议，不是对 GSD 已有轻量模式的事实陈述。

## 跨项目判断与待验证边界

| 关注点 | 已有具体先例 | Autoship 应保留的边界 |
| --- | --- | --- |
| 按需加载技能 | Superpowers 入口 hook；Matt 的入口/内部技能分类 | 不把所有阶段提示词常驻上下文 |
| 跨上下文交接 | Superpowers brief/report/ledger；Matt 路径式 handoff | 交接应持久化到项目内，不依赖原聊天仍可恢复 |
| 跨进程恢复 | Spec Kit RunState；GSD 结果核对 | 首版手动重启后继续即可，必须核对工作区实际状态 |
| 独立 review | Superpowers 任务审查；Matt fresh-context reviewer | 独立上下文可复用同一宿主，无需强制第二种模型 |
| 限定修复范围 | Superpowers fix-loop | 采用用户自己的二轮、回退、最多三个会话规则 |
| 多 CLI | Spec Kit argv adapter；多个项目的宿主安装层 | 内容可安装、可发起执行、可自动接力是三种不同能力 |
| 轻量实现 | skills、文件协议、启动 hook、原生 CLI | 不需要照搬完整框架、工作流语言、数据库或模型 SDK |

这些静态材料尚不能证明：某个宿主在用户当前版本上能全程无交互；订阅登录能覆盖所有非交互入口；Windows 上所有 hook 与会话恢复均可靠；WorkBuddy 与其他宿主具有对等控制能力。Autoship 应逐个验证实际启动、结束识别、权限不足、超时、中断、恢复与任务回退，再公开兼容性等级。

同样，没有上述项目可以直接替代 Autoship 已确定的完整政策：规划整体审一次、每代码任务独立审一次、每会话最多两轮修复、失败回到本任务基线但保留证据、最多三个会话后暂停、环境待验单独记录、默认不推送或发布。这些规则需要 Autoship 自己明确表达和验证，不能寄希望于多写一句提示词后自然成立。
