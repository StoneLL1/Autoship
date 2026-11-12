# Autoship

让已有编程 Agent 自动接力完成开发：澄清并确认需求 → 规划与一次审核 → 实现、检查、一次独立代码审核 → 修复与文档同步 → 本地交付。

只有短 Skills、Node.js 标准库脚本和 Git；没有额外模型 API、数据库或常驻服务。Agent 自行决定任务数量和会话边界，小项目可以一个任务完成，相关任务可以共用会话。

## 开始使用

想先看懂原理，可以直接用浏览器打开 [交互式流程说明](docs/how-it-works.html)：支持新项目 / 追加功能示例、分步接力与异常恢复说明，单文件离线可用。

需要 Node.js 24+、Git，以及至少一个已安装并登录的 Codex、Claude Code 或 OpenCode CLI。推荐先用已验证的 Codex 路线；其他宿主的验证范围见下表。

```sh
git clone https://github.com/StoneLL1/Autoship.git
cd Autoship
```

在仓库目录中运行：

```sh
node scripts/autoship.mjs doctor
node scripts/autoship.mjs demo
```

demo 在临时仓库使用确定性模拟 Agent，不消耗模型额度，也不代表真实 AI 审核。

安装本地命令（尚未发布到 npm）：

```sh
npm install -g .
autoship --help
```

也可始终用 `node /绝对路径/Autoship/scripts/autoship.mjs` 代替下文 `autoship`。

## 新项目与追加功能

```sh
autoship new "做一个本地 Markdown 阅读器" --cwd /path/to/new-reader --agent codex
autoship feature "增加目录导航和阅读位置记忆" --cwd /path/to/existing-reader
```

Agent 会调查现状并提问，将需求写成 brief。你确认后自动往下做。前端会先确定设计风格，产出 design.md 和 app_flow.md；未指定风格时从 [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) 随机选择并记录版本，已有项目沿用原设计。随后补充所需 PRD、技术选择、AGENTS.md、计划和简洁 task spec，完整规划包审核一次。

已经讨论清楚的需求可以直接交给它：

```sh
autoship new --cwd /path/to/project --confirmed-brief /path/to/approved-brief.md
autoship feature --cwd /path/to/repo --confirmed-brief /path/to/approved-feature.md
autoship run execution.json --cwd /path/to/repo
```

`--confirmed-brief` 表示你已批准这份需求；`run` 表示你已确认和审核任务清单。清单格式见 [运行协议](docs/runtime.md)。不必为简单项目拆出许多 task，也不必一份文档开一个 session。

新项目可自动初始化空目录。有文件但没有 Git 时，用 `--adopt` 明确纳入已有文件。现有仓库要求已提交基线；`--from-head` 可明确排除未提交改动。执行结果放在输出的独立 **Worktree** 和本地 **Branch**，原目录不混入生成的改动。

在输出的 Worktree 中运行、查看结果。要将确认后的结果取回原分支，可自行执行 `git merge --ff-only <输出的分支名>`；源分支已变化时先检查差异。Autoship 不自动合并、推送或发布。

## 接力与恢复

每个任务都保存自己的验收、检查点、预算和唯一一轮独立 review。主 Agent 修复并验证，不再重复派 reviewer。默认一个实现会话最多两轮修复、每任务最多三个实现会话；耗尽后保存失败证据并回退该任务，继续独立工作。

遇到额度、登录、进程或环境问题时，会先重试、调查或使用你配置的候补 Agent，保存暂时无法进行的任务，并继续可做的部分。尚未验证的项目与真实缺陷分别记录。默认等待恢复窗口为一分钟；没有可执行工作后保存并退出，不常驻后台。

```sh
autoship list --cwd /path/to/repo
autoship status <run-id> --cwd /path/to/repo
autoship resume <run-id> --cwd /path/to/repo
autoship resume <run-id> --cwd /path/to/repo --reply "补充答案"
autoship retry <run-id> --cwd /path/to/repo --task T01
autoship verify <run-id> --cwd /path/to/repo
```

`retry` 明确给暂停任务增加预算，保留审核历史。`verify` 重跑已交付工作的检查和待验项，发现回归则从当前成果创建修复任务，不退回旧版本。Ctrl+C 后可手动 resume。状态、完整调用日志、失败 diff、交接和 report.md 放在 Git common directory 的 autoship/runs 下。

## Agent 和配置

```sh
autoship new "项目想法" --cwd /path/to/project --agent claude
autoship feature "功能" --cwd /path/to/repo --agent opencode
autoship resume <run-id> --cwd /path/to/repo --fallback claude,opencode
```

沿用各 CLI 已有认证、模型和工具配置。`--model` 可选已配置模型；不要求新 API key。`doctor` 只检查 CLI 可发现性，不证明登录、额度或功能完整性。

在 `.autoship/config.json` 配置默认 agent、候补、模型和超时，完整示例见 [运行协议](docs/runtime.md)。候补只使用明确配置的 Agent；绝不会把模拟结果当真实交付。Windows 会优先找到 OpenCode 的 opencode-cli.exe，而不是 GUI 程序。

| 宿主 | 接入方式 | 验证范围 |
| --- | --- | --- |
| Codex | exec / resume / JSON schema | Windows / CLI 0.153.4 已实跑：确认需求后规划、规划审核、实现、一次代码审核、修复、文档同步和本地提交 |
| Claude Code | print / stream-json / structured output | 实验适配；协议测试通过，已修复实机发现的路径与状态写入问题，但本机尚未完成真实闭环 |
| OpenCode | run / JSON / session | 实验适配；协议测试通过，本机 1.2.27 真实调用超时，尚未证明完整闭环 |
| WorkBuddy | 导入 Skills | 未宣称支持无人值守 CLI；仍需宿主提供可调用入口 |

## Skills

```sh
autoship install-skills --dir /path/to/project/.agents/skills
```

导出 autoship、autoship-docs-sync 和自包含引用文档。可交给支持 Skills 的宿主使用，也可导入 WorkBuddy。已有不同内容时拒绝覆盖，需要明确 `--force`。安装路径遵循具体宿主配置；不会自动修改全局设置。

- autoship：按阶段加载澄清、规划、实施、审核、恢复与交付指引。
- autoship-docs-sync：同步受影响的需求、设计、计划和进展，区分已实现、已验证与待验。

## 开发与验证

```sh
node --test
npm pack --dry-run
node scripts/smoke.mjs codex
```

默认测试使用真实临时 Git 仓库和模拟 Agent，覆盖恢复、单轮审核、预算、搁置、重排、会话复用、补验和参数传递。smoke 是可选的真实 Agent 调用，会消耗当前宿主额度。Windows 本地检查与真实 Agent 检查分别记录；已配置 Linux、macOS、Windows CI，未运行的 CI 不算通过。

许可证：[MIT](LICENSE)。设计与研究材料在源码仓库的 PROPOSAL.md、research/，开发记录在 progress.md。运行包包含启动所需脚本、Skills 和协议，零第三方运行依赖。
