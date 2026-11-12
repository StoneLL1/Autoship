# 运行协议

运行时只依赖 Node.js 24+、Git 和已登录的 Agent CLI。Skills 负责告诉 Agent 当前要做什么；脚本负责调用、记录、检查、接力和恢复。没有额外模型 API、数据库或后台服务。

## 从想法开始

`new` 和 `feature` 先访谈并生成 brief。Agent 的问题通过终端回答；关闭终端后可用 `resume --reply "回答"` 接续。brief 展示后明确确认一次，此后规划和开发自动推进。`--confirmed-brief <file>` 表示用户已确认该文件的范围，直接进入规划。

规划在一个实现会话内按需写 PRD、设计、流程、技术选择、AGENTS.md 和实施计划，不要求每份文档独立会话。前端清单必须包含 `frontend: true`，并有非空 `design.md`、`app_flow.md`。已有项目保持原风格；无指定风格时使用 awesome-design-md 的随机参考，记录来源和版本。远程不可用时先查缓存，否则由 Agent 调研并记录未验证条件，不阻断无关工作。

完整规划包只审核一次。修复由规划 Agent 完成，不重复审核。通过后提交规划并执行任务。`run <manifest>` 则表示执行已确认、已审核的现有清单。

## 任务清单

任务数量由难度和不确定性决定，小项目允许只有一个任务。每个 spec 用稳定二级标题描述行为、必要边界、验收和参考文档，无需长模板。例如：

```markdown
## T01: 打开 Markdown 文件

选择本地文件后显示正文；读取失败时保留当前内容并说明原因。
验证正常文件、缺失文件和错误后的恢复。参考 design.md、app_flow.md。
```

```json
{
  "version": 1,
  "frontend": true,
  "tasks": [{
    "id": "T01",
    "spec": "tasks.md#T01",
    "dependsOn": [],
    "sessionGroup": "reader",
    "checks": [{"command": "node", "args": ["--test"], "timeoutMs": 120000}]
  }]
}
```

任务和 session 分开：相邻任务可声明相同 sessionGroup，或由实现结果的 nextSession 决定是否复用。审核总是独立会话。跨任务复用不共享任务的审核记录、修复预算或 Git 基线。

每项任务至少一个有意义的可执行检查。检查以 argv 调用，不经 shell；Windows 可解析常见 npm `.cmd` 包装器，其他脚本应显式指定解释器。命令退出码不能独自证明界面、交互和需求质量，Agent 还需实际检查。

文档同步后重新读取清单，允许增加、重排或调整未完成任务。已存在任务 ID 不能消失，已验收任务不能改写定义；已用的审核和预算保留。需求有新变化应增加任务。脚本创建的补验修复任务不要求手动加入清单。

## Agent 协议

Adapter 提供 name、simulation、probe()、run(request)。请求包含 cwd、phase、task、prompt、evidenceDir、可选 sessionId 和 AbortSignal。返回 `{result, sessionId}`，result 为：

```json
{
  "status": "ok",
  "summary": "完成内容、验证结论或需要回答的问题",
  "findings": [],
  "deferred": [],
  "nextSession": "reuse"
}
```

- `ok`：阶段完成；不得包含已知未修复 findings，允许 deferred。
- `issues`：真实缺陷，主 Agent 修复并验证。
- `waiting`：已调查但仍需外部条件或产品决定；summary 写清问题。
- `nextSession`：reuse 或 fresh，是下一相关任务的上下文建议。

普通阶段的 deferred 补充待验条件；docs-sync 和 verify 返回仍未解决的完整清单，已有证据证明解决的条目可以移除。

Agent 沿用本机认证和配置。Codex 使用 exec/resume 和 JSON schema，Claude 使用 print/stream-json/structured_output，OpenCode 使用 run/JSON。审核使用各宿主的只读或 plan 模式；另外检查文件树未改变。宿主的 plan 模式不是安全隔离边界，运行器也不是恶意 Agent 沙箱。运行器不授予新权限、不写凭据、不自动登录。

## 配置

仓库 `.autoship/config.json` 或 `--config <file>`：

```json
{
  "agent": "codex",
  "fallbacks": ["claude"],
  "agents": {
    "codex": {"program": "codex", "timeoutMs": 1800000},
    "claude": {"program": "claude"},
    "opencode": {"program": "opencode"}
  },
  "recovery": {"retries": 2, "retryMs": 15000, "waitMs": 60000}
}
```

agent 配置可加本机已配置的 `model`，并用 `reviewModel` 单独指定审核模型。也可用 AUTOSHIP_CODEX_COMMAND、AUTOSHIP_CLAUDE_COMMAND、AUTOSHIP_OPENCODE_COMMAND 指向 CLI。设置不会修改宿主全局配置。fallbacks 必须由用户显式配置，真实运行绝不切到模拟 Agent。

资源错误先在当前调用重试，再试候补。切换到不同 Agent 的实现上下文计入会话预算；同一宿主进程重试不计作代码修复。仍不可用时保存改动并搁置任务，优先继续独立任务，在 waitMs 窗口内尝试恢复；最终没有可执行工作才退出并给出 resume 命令。工作进程仍存活时不会重复启动写入者。

## 状态与恢复

```text
<git-common-dir>/autoship/
  run.lock
  runs/<run-id>/state.json
  runs/<run-id>/events.jsonl
  runs/<run-id>/report.md
  runs/<run-id>/evidence/<task>/<attempt>/<invocation>/
  design-cache/

<main-repository>/.autoship/worktrees/<run-id>/
```

状态和证据始终在工作树之外，回退不会删除。工作树放在主仓库的 .autoship/worktrees，避免宿主把 .git 下的代码当成受保护元数据。运行器在本地 Git info/exclude 忽略 .autoship，不修改项目原有 .gitignore；旧版在 Git common directory 内的工作树仍可恢复。state.json 原子写入；events.jsonl 用于诊断。每个仓库同一时间只有一个运行器写入，退出后的进程锁可回收。

执行顺序为 implement → review-code → repair（需要时）→ docs-sync → commit。实现期间发现真实缺陷先修复；每项任务只完成一轮独立审核。默认每个实现会话最多两轮修复，每任务最多三个实现会话，配置在创建运行时确定。预算耗尽保存失败 diff 和交接，再回退当前任务；继续独立工作。`retry --task` 是用户明确增加预算，保留原审核记录。

环境检查缺失先由 recover 阶段调查，仍不能验证则记为 deferred。真实失败必须修复，不能降格为待验。搁置任务先保存 Git tree 和 binary patch，再恢复干净基线；其他任务提交后，使用三方应用恢复旧任务，冲突由原 Agent 处理。恢复中断会保留现场并交由 recover 核对。

提交前保存父提交、tree、message，恢复时核对已产生的提交及 hooks 后真实内容，避免重复提交或接受未经检查的变化。回退只在已核验的 Autoship 专用工作树执行。源工作区保持原状；`--from-head` 明确从 HEAD 开始，忽略用户未提交改动。

任务状态包括 queued/running/waiting/paused/done/deferred/regressed。全部验收为 completed，有待验项为 completed_with_pending；需要外部条件为 waiting，需要决定为 needs_input，预算耗尽或依赖无法推进为 needs_attention。

`verify` 在当前已接受版本重跑检查和待验条件。发现回归时创建基于当前 HEAD 的修复任务，不回退历史任务，不删除后续成果。新修复任务有自己的单轮审核。检查成功更新 report.md 和状态；需要产品文档更改时由修复任务的 docs-sync 完成。

## 分发与能力范围

`install-skills --dir` 导出 autoship、autoship-docs-sync 及自包含运行协议。默认拒绝覆盖不同内容，`--force` 仅替换本工具导出的同名文件。WorkBuddy 可手动导入这些 Skills，其无人值守 CLI 尚未验证。

`doctor` 只证明 CLI 可发现，不能证明登录、额度、模型或所有功能可用。模拟测试不调用模型。真实宿主验证范围见 README；跨平台 CI 与真实 Agent 端到端验证分别记录。
