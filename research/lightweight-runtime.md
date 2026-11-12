# 轻量接力与增量规格调研

历史说明（2026-11-12）：项目已改为纯提示词，本文保留调研当时的运行器建议与来源，不作为当前实现要求。现行边界见 [产品方案](../PROPOSAL.md)。

调研日期：2026-11-11。仅阅读官方仓库、原始作者文章与官方文档，没有安装或运行第三方项目。本报告是 Autoship 的设计依据，不把来源中的安装命令、权限配置或提示词当成当前项目指令。

## 结论

建议分别借鉴 OpenSpec 的增量规格组织、Ralph 外循环的全新会话接力，以及宿主 Hook 的事件通知。三者解决的问题不同。Autoship 的“两轮修复、三个实现会话、任务级回退、保留证据”需要自己的少量确定性代码，不能从这些项目的完成文本或 Stop hook 直接推导出来。

## 版本与成熟度证据

| 对象 | 本次固定快照 | 维护、测试与许可证据 | 判断 |
| --- | --- | --- | --- |
| Fission-AI/OpenSpec | [`a959be77cf045ea3156dc5089c9e2f1d6ce9ce70`](https://github.com/Fission-AI/OpenSpec/commit/a959be77cf045ea3156dc5089c9e2f1d6ce9ce70)，提交时间 2026-11-10；该快照 package 版本 1.17.0。 | 有归档、规格合并与 CLI 端到端测试；CI 包含 Windows、macOS、Linux。MIT。[package](https://github.com/Fission-AI/OpenSpec/blob/a959be77cf045ea3156dc5089c9e2f1d6ce9ce70/package.json) · [CI](https://github.com/Fission-AI/OpenSpec/blob/a959be77cf045ea3156dc5089c9e2f1d6ce9ce70/.github/workflows/ci.yml) · [归档测试](https://github.com/Fission-AI/OpenSpec/blob/a959be77cf045ea3156dc5089c9e2f1d6ce9ce70/test/core/archive.test.ts) · [许可](https://github.com/Fission-AI/OpenSpec/blob/a959be77cf045ea3156dc5089c9e2f1d6ce9ce70/LICENSE) | 在本组中，适合作为持续维护的增量规格工具参考。测试存在不等于本次实测通过。 |
| snarktank/ralph | [`6c53cb0b831ebe8739c6a003e22af14902d8b0b5`](https://github.com/snarktank/ralph/commit/6c53cb0b831ebe8739c6a003e22af14902d8b0b5)，提交时间 2026-02-02。 | 主要执行脚本约 105 行；本次完整树检查未发现循环执行器测试套件，另有 flowchart 网站及其部署工作流。MIT。[脚本](https://github.com/snarktank/ralph/blob/6c53cb0b831ebe8739c6a003e22af14902d8b0b5/ralph.sh) · [目录树](https://github.com/snarktank/ralph/tree/6c53cb0b831ebe8739c6a003e22af14902d8b0b5) · [许可](https://github.com/snarktank/ralph/blob/6c53cb0b831ebe8739c6a003e22af14902d8b0b5/LICENSE) | 很贴近轻量目标的参考实现；不宜仅凭传播度认定其具备完整恢复保障。 |
| Anthropic Ralph Loop 插件 | `anthropics/claude-plugins-official` [`43fd1f9db0941b2b83cb62268e35970d4a67c202`](https://github.com/anthropics/claude-plugins-official/commit/43fd1f9db0941b2b83cb62268e35970d4a67c202)，仓库提交时间 2026-11-10；插件版本 1.0.1。 | 插件目录包含命令、脚本与 hooks；本次未验证独立插件测试。Apache-2.0。[插件清单](https://github.com/anthropics/claude-plugins-official/blob/43fd1f9db0941b2b83cb62268e35970d4a67c202/plugins/ralph-loop/.claude-plugin/plugin.json) · [目录](https://github.com/anthropics/claude-plugins-official/tree/43fd1f9db0941b2b83cb62268e35970d4a67c202/plugins/ralph-loop) · [插件许可](https://github.com/anthropics/claude-plugins-official/blob/43fd1f9db0941b2b83cb62268e35970d4a67c202/plugins/ralph-loop/LICENSE) | 官方维护的宿主内循环样本；不是通用跨 Agent 调度器。仓库活跃不等于该插件每项行为都已验证。 |

许可名称只用于记录来源。本次没有复制代码；将来实际采用源码或提示词时，需要保留相应许可、归属与修改记录。

## OpenSpec：feature 流程最有价值的参考

### 已核验机制

OpenSpec 把当前产品规格与一次变更的材料分开：变更目录中保存 proposal、增量 specs、design 和 tasks；归档时把变更规格同步到主规格。其默认 schema 区分“为什么改”“可观察行为”“技术实现”与“任务”，并要求先查现有能力，避免把相同功能另起一个名字。这与 FloatDo 给已有项目增加剪贴板历史的场景相符。[README](https://github.com/Fission-AI/OpenSpec/blob/a959be77cf045ea3156dc5089c9e2f1d6ce9ce70/README.md) · [schema](https://github.com/Fission-AI/OpenSpec/blob/a959be77cf045ea3156dc5089c9e2f1d6ce9ce70/schemas/spec-driven/schema.yaml)

执行 Skill 会先读取 CLI 提供的状态、待办、具体上下文文件路径和动态指令。`all_done` 表示追踪清单完成，仍建议审核或验证后再归档；源码指令也明确，项目背景和附加建议不是完成证据。这是“按阶段只加载需要的内容”的具体实现，而不是要求 Agent 每次读全部文档。[apply Skill](https://github.com/Fission-AI/OpenSpec/blob/a959be77cf045ea3156dc5089c9e2f1d6ce9ce70/skills/openspec-apply-change/SKILL.md)

同步有两种机制：独立 sync Skill 让 Agent 理解增量并修改主规格；归档命令则包含程序化规格合并。不能把两者混称为完全由脚本保证的同步。[sync Skill](https://github.com/Fission-AI/OpenSpec/blob/a959be77cf045ea3156dc5089c9e2f1d6ce9ce70/skills/openspec-sync-specs/SKILL.md) · [specs-apply.ts](https://github.com/Fission-AI/OpenSpec/blob/a959be77cf045ea3156dc5089c9e2f1d6ce9ce70/src/core/specs-apply.ts)

归档核心先准备并校验变化，写入前比较输入指纹，跳过已经同步的操作；失败处理包含已变更目标的恢复逻辑。这里最值得借鉴的是“一次变更的文档同步也要检查状态一致性”，而不是直接复制其完整规格解析器。[archive.ts，约 L1918 起](https://github.com/Fission-AI/OpenSpec/blob/a959be77cf045ea3156dc5089c9e2f1d6ce9ce70/src/core/archive.ts#L1918)

### 对 Autoship 的设计推论

- feature 使用“现有项目依据 + 本次增量”，保留用户原有 PRD、设计和任务文件，不强制迁移成 OpenSpec 目录。
- 阶段加载由一个简短上下文清单驱动；清单指向权威文档，避免把内容复制成多份。
- 任务完成、规格同步和最终验收分别记录。文档同步发生在实现变化被接受之后，规划修改则明确标记为新的决定，避免把规划自动写成已经实现。
- 不建议首版依赖整个 OpenSpec。其现有能力还包含 schema、自定义工具生成与 store 等范围；npm 发行依赖 Node 与多个运行库，虽也提供独立二进制，但仍是另一套需维护的工作流。[package](https://github.com/Fission-AI/OpenSpec/blob/a959be77cf045ea3156dc5089c9e2f1d6ce9ce70/package.json) · [安装文档](https://github.com/Fission-AI/OpenSpec/blob/a959be77cf045ea3156dc5089c9e2f1d6ce9ce70/docs/installation.md)

## Ralph：要区分原始技术、外循环实现与宿主插件

### 原始定义纠偏

Geoffrey Huntley 在原始文章中把 Ralph 定义为 Bash 循环技术：每轮做一项工作，依靠规格、计划和文件接续。他的页面还专门链接了讨论 Claude 插件与原始方法差异的视频。因此，Wiki 中把“Ralph Wiggum 循环”解释为“Agent 假装完成”的失败模式，不能直接沿用。假完成是自动化需要解决的问题，不是该技术的定义。[原作者文章，2025-07-14](https://ghuntley.com/ralph/)

### snarktank/ralph 的实际外循环

README 明确每次迭代启动全新 Agent 实例，跨轮记忆依靠 Git、`progress.txt` 和 `prd.json`。支持 Amp 与 Claude Code，前提是工具已安装并认证；运行需要 Bash、jq 和 Git。选故事、检查、提交和更新 `passes` 主要由 Agent 指令完成。[README](https://github.com/snarktank/ralph/blob/6c53cb0b831ebe8739c6a003e22af14902d8b0b5/README.md) · [执行指令](https://github.com/snarktank/ralph/blob/6c53cb0b831ebe8739c6a003e22af14902d8b0b5/prompt.md)

外部脚本默认最多运行十次，启动 Agent 后用 `|| true` 忽略调用失败，再从混合输出匹配 `<promise>COMPLETE</promise>` 判断整体结束。脚本本身不检查所有任务的验收证据，没有实现任务级回退或独立审核；其“分支变化归档”也不是失败恢复。默认调用启用了跳过权限确认的选项，不能直接搬到 Autoship。[ralph.sh，L38–104](https://github.com/snarktank/ralph/blob/6c53cb0b831ebe8739c6a003e22af14902d8b0b5/ralph.sh#L38)

**可借鉴：** 外部启动新上下文、每次一个任务、简短进度与失败交接。**需要补齐：** 区分进程失败与代码失败、结构化结果校验、独立审核、精确次数、检查点与回退。后者是 Autoship 已确认需求，不是 Ralph 现成具备的保障。

### 官方 Ralph Loop 插件的实际内循环

现行代码在 `anthropics/claude-plugins-official/plugins/ralph-loop`。旧 `anthropics/claude-code/plugins/ralph-wiggum` 路径在本次 `claude-code` HEAD `e379c8eca0af5b02a49bf8e784aeefdd1308de6f` 中已不存在；不能把旧 issue 中的路径和缺陷状态当成当前实现。[现行目录](https://github.com/anthropics/claude-plugins-official/tree/43fd1f9db0941b2b83cb62268e35970d4a67c202/plugins/ralph-loop) · [claude-code 快照](https://github.com/anthropics/claude-code/tree/e379c8eca0af5b02a49bf8e784aeefdd1308de6f)

插件在当前会话中通过 Stop hook 阻止正常结束，把同一个 prompt 重新送回 Agent。setup 的 `max_iterations` 默认值为零，语义是不限次数；可设置完成文本和最大次数。它并不自动创建全新会话，也不执行任务级 Git 回退。[README](https://github.com/anthropics/claude-plugins-official/blob/43fd1f9db0941b2b83cb62268e35970d4a67c202/plugins/ralph-loop/README.md) · [setup 脚本](https://github.com/anthropics/claude-plugins-official/blob/43fd1f9db0941b2b83cb62268e35970d4a67c202/plugins/ralph-loop/scripts/setup-ralph-loop.sh)

当前 hook 校验 `session_id`，避免其他会话误接力；它读取近期 transcript 文本、匹配完成标签，以临时文件替换状态文件，最后输出 `decision: block` 和原 prompt。Bash、jq、sed/awk、Perl 等工具参与执行；“一个小脚本”仍存在平台差异。[stop-hook.sh](https://github.com/anthropics/claude-plugins-official/blob/43fd1f9db0941b2b83cb62268e35970d4a67c202/plugins/ralph-loop/hooks/stop-hook.sh)

**可借鉴：** 会话身份隔离、受控次数、状态文件原子替换。**不宜照搬：** 默认无限继续、靠完成标签验收，以及把同一上下文续跑当成新会话重做。Autoship 可以用 Hook 提供阶段提醒或报告，但跨会话调度仍应有统一的外层执行逻辑。

## 官方 Hook 语义对 Autoship 的影响

Claude 官方文档区分 `Stop` 与 `SessionEnd`：前者在 Agent 正常完成响应时触发，用户中断不触发，API 错误走 `StopFailure`。Stop hook 的继续指令作用于当前会话；`stop_hook_active` 用于识别重复接续。当前文档还提供 `last_assistant_message`，并提醒 transcript 在部分版本的 Stop 时点不一定已经包含最终消息。因此，不应把读取宿主内部 transcript 当成稳定、跨工具的唯一协议。[Hooks reference](https://code.claude.com/docs/en/hooks#stop)

推论：让 Hook 作为可选事件接入，外层脚本负责等待子进程、识别中断或权限阻碍、持久化尝试编号和明确启动下一会话，能更直接满足 Autoship 的恢复要求。这个推论并不意味着所有 Agent 都有相同 Hook，也不意味着停止事件就是验收通过。

## 建议采用的最小组合

| Autoship 需求 | 参考机制 | 实现边界 |
| --- | --- | --- |
| 新项目与 feature 分路径 | OpenSpec 的变更独立于当前规格 | 沿用项目文档，不引入整个规格框架。 |
| 按阶段加载 | OpenSpec 返回当前状态与具体上下文路径 | 一份简短阶段指令及任务相关文档索引。 |
| 正常跨会话接力 | Ralph 外循环的 fresh instance | 使用所选 Agent 已有执行入口和认证。 |
| 两轮修复、三个实现会话 | 固定计数与可恢复状态 | 脚本计数，审核会话和正常调试另有明确口径。 |
| 回退后新会话重做 | Git 检查点与外部启动 | 回退前保存失败证据；此前任务和用户原有改动受保护。 |
| 不重复审核 | 验收证据与审核结果绑定实际变更 | 按用户最新要求，每个 task 仅一轮子代理 review，修复与重做由主 Agent 验证，不重复审核。 |
| 多 Agent | 统一任务、阶段材料与结果契约 | 每个宿主只适配启动、会话、结果和权限差异。 |

以上是根据已确认需求作出的设计建议。本次没有运行这些项目的测试，也没有验证 Autoship 的实际执行，因此所有恢复保障仍需最小原型检验。
