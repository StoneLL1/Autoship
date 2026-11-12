# 安装、更新与自检

Autoship 分发两个必须并列的 Skill：`autoship` 和 `autoship-docs-sync`。无需 Autoship 运行时。目标 Agent 至少需要能读取文件和执行项目所需工具；完成规定的独立审核还需要独立 reviewer 能力。跨会话自动接力依赖宿主实际能力，真实闭环仍待实测，当前范围见 [验证状态](../README.md#验证状态)。

## 安装

1. 获取完整仓库或解压下载的仓库，选择要使用的提交。`main` 是当前开发版本；记录提交号以便复现。
2. 根据宿主实际配置找到 Skills 根目录。已有同名安装先按下文更新；保留自己的修改。
3. 将仓库 `skills/` 里的两个目录整体复制到该根目录，保持下面的结构。仓库根目录、README 和 docs 不需要装入宿主。
4. 按宿主支持的方式重新发现 Skills。无法原生调用时，让 Agent 直接读取已安装入口的绝对路径。

```text
<宿主 Skills 根目录>/
├── autoship/
│   ├── SKILL.md
│   ├── assets/
│   ├── references/
│   └── stages/
└── autoship-docs-sync/
    └── SKILL.md
```

Windows 可在替换两个路径后使用以下 PowerShell。它只安装到不存在同名 Skill 的目录；先完成所有路径检查，再开始复制。

```powershell
$autoshipSource = (Resolve-Path -LiteralPath '仓库绝对路径/skills' -ErrorAction Stop).Path
$autoshipDestination = '宿主 Skills 根目录的绝对路径'
$autoshipNames = @('autoship', 'autoship-docs-sync')
foreach ($name in $autoshipNames) {
    if (-not (Test-Path -LiteralPath (Join-Path $autoshipSource "$name/SKILL.md") -PathType Leaf)) {
        throw "缺少源 Skill：$name"
    }
    if (Test-Path -LiteralPath (Join-Path $autoshipDestination $name)) {
        throw "已存在 $name，请按更新步骤保留旧版与本地修改"
    }
}
New-Item -ItemType Directory -Force -Path $autoshipDestination -ErrorAction Stop | Out-Null
foreach ($name in $autoshipNames) {
    Copy-Item -LiteralPath (Join-Path $autoshipSource $name) -Destination $autoshipDestination -Recurse -ErrorAction Stop
}
```

其他系统同样复制这两个完整目录。具体宿主目录、发现方式和可用工具由当前环境决定，项目不以品牌名称推定支持程度。

复制遇到权限、文件占用或磁盘错误会立即停止，但此前复制的部分文件可能已存在。先排除错误并核对本次产生的目录，将未完成的安装移到扫描目录外保留，再从干净的目标位置重试并执行自检；不要绕过已有目录保护覆盖旧版或本地定制。复制成功也仍须完成下方自检。

## 安装自检

在任意空的临时项目中，将下面的提示词交给 Agent。自检只报告能力，不创建会话、不修改目标项目：

```text
请检查 <已安装 autoship/SKILL.md 的绝对路径> 的安装完整性。
读取两个 Skill 的入口，枚举阶段、references 和 assets，检查本地 Markdown 链接及锚点。
所有内部引用应在这两个并列目录内解析；报告缺失或越出分发包的引用。
确认能从安装位置读到 investigate、plan-fix、task 模板和 docs-sync。
列出当前实际可用的文件、执行、独立审核、会话创建/启动/查询能力。
将“工具可用”与“已完成真实接力”分开报告；本次只做只读自检。
```

通过标准：两个入口可读，分发包内部引用全部可解析，Agent 能指出当前入口和对应下一阶段，且如实说明缺少的宿主能力。首次使用可直接采用 [README 示例](../README.md#开始使用)。

## 更新与回退安装

先查看 [CHANGELOG](../CHANGELOG.md)，记录正在运行任务所用的 Skill 版本。将新版的两个 Skill 一起复制到单独的候选目录并完成自检；对照旧版检查本地定制。避免直接覆盖仍被活跃会话引用的文件。

在工作边界保存任务交接，将旧的两个目录移到 Skills 扫描目录之外作为备份，再将已检查的新目录放到正式位置。让 Agent 重新读取入口并核对新旧约定。安装回退只恢复两个 Skill 的旧版文件；任务状态、审核和修复次数继续保留，不能随安装回退重置。卸载也只移除所安装的两个目录，不删除项目或外部接力证据。

## 常见问题

| 现象 | 下一步 |
| --- | --- |
| 找不到 autoship | 核对宿主真正扫描的目录和两个入口的 frontmatter；按需重新发现，或直接读取绝对路径。 |
| 入口能读，阶段或 docs-sync 找不到 | 检查是否只复制了 SKILL.md、重复套了一层 skills，或遗漏兄弟目录；重新复制完整包。 |
| 装了新版却仍按旧提示词执行 | 检查同名的项目级/用户级安装和实际读取路径；保留旧任务历史后明确切换版本。 |
| 能创建聊天，但无人接手 | 查询是否启动执行、文件是否可访问、是否登记接手；按 sessions 处理，创建返回成功不等于接力完成。 |
| 没有独立 reviewer | 如实保留待审核项；可以完成准备和独立工作，不能把自审记为独立审核。 |
| 命令或浏览器不可用 | 记录具体待验条件与恢复方式；交付可用增量时保留限制，不写成全部通过。 |
