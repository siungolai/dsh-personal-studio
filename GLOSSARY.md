# GLOSSARY — dsh-personal-studio

> 本词典只收**本项目 context 独有**的概念，通用编程概念（state、props、fetch）不属于这里。
> 每条格式：`**Term**: 定义 _Avoid_: 同义词`。
> 状态：**D0–D4 全部定案，v0.1 已实现并端到端联调通过**（2026-10）。术语随决策与实测同步。

## 宿主与集成面

**better-sidebar**
: DSH 的侧边栏底座，社区项目 [omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)，通过 Cordis 服务 `ctx.betterSidebar` 向三方开放 `registerTab` / `registerFileViewer` / `registerFileIcon` 三个扩展点。本项目是它的**消费插件**。
_Avoid_: 侧边栏（未限定时歧义）、sidebar service。

**consumer plugin**
: 只消费别人已注册的服务、自己不再画侧边栏的插件形态。本项目即此形态：不 import `dsh-better-sidebar` 的值，只 `import type {}` 做类型合并。
_Avoid_: 三方插件（这是发布位置，不是架构形态）。

**host half / client half**
: 一个 DSH 插件的两个执行面。client half 跑在浏览器、能拿到 `ctx.betterSidebar`；host half 跑在 Node、能做 fs / shell / 注册 HTTP 路由。两者同属一个 npm 包，靠 `dsh.plugin.json` 与 `dsh` 字段区分产物。
_Avoid_: 前端/后端（DSH 的 host 不是传统服务器）。

**profile**
: DSH 的一份独立安装配置目录（`~/.dsh/profiles/<name>/`），自带 `package.json`、`cordis.patch.yml`、`node_modules`。本机有 `web` 与 `desktop` 两份，插件集与版本互不影响。
_Avoid_: 环境（env）、instance。

**cordis patch**
: profile 级 Loader 补丁层（`cordis.patch.yml`），用于覆盖 loader entry 的 config、禁用插件、或 `insert` 一段新挂载。**本插件不往这里放任何用户数据或偏好** —— 用户数据在自己的数据文件里，低频偏好走 better-sidebar 的 `pluginToggles`。
_Avoid_: patch 文件、yaml 配置（未限定时歧义）。

**bundle channel（bundle 通道）**
: 经 `dsh plugin add` 安装时，插件自带的 `dsh.bundle.patch`（一个 `cordis.patch.yml`）会被合并进 profile，由它自己 `insert` 挂载行。与手写 profile patch 是**两条互斥通道**，混用会双挂载。better-sidebar 自带 `!!js` 守卫防聚合包双挂载，但防不住同 id 手写重复。
_Avoid_: 安装方式（太宽）。

**webServer**
: 宿主 Cordis 服务名，host half 注册 HTTP 路由与 WebSocket 升级的入口。better-sidebar 的用法：`ctx.effect(() => ctx.webServer.register({ kind: 'prefix' | 'exact', path, handler }), 'label')` 与 `ctx.webServer.registerUpgrade({ path, handler })`。
_Avoid_: router（那是实现里的局部变量）、http server。

**host route（宿主路由）**
: 由插件 host half 注册、跑在宿主进程里的 HTTP 端点。本项目若要自建 `/personal-studio/api/*` 即走此路，`inject` 必须含 `'webServer'`。
_Avoid_: API route（易与 better-sidebar 的 `/sidebar/api/*` 混）、endpoint。

**trust fence（信任栅栏）**
: 宿主对所有 `/sidebar/*` 与 `/api` 路由施加的请求来源校验：Host 头回环 + 宿主的 `trustedHosts`（启动时采样的 LAN IP 字面量 + `--trusted-host` 授权）。better-sidebar 的每个路由都显式调用它。**第三方 host 路由必须自己实现同等校验**，否则局域网内任何人可调。本项目自建同规格的围栏（`src/host/trust-fence.ts`），并把宿主的 `connection.requestRejection` 当可选的第二层闸门（逐请求读取，因为该服务是宿主异步 init 之后才出现的）。
_Avoid_: CORS、auth（都不同物）。

**plugin settings blob（插件设置块）**
: better-sidebar prefs 文档里的 `pluginSettings[<descriptor id>]`，一个**开放嵌套 map**（`prefs-shared.ts:133` "an open map, so third-party keys need no host PrefsSchema field"）。**官方给第三方的通道是 `settings.pluginToggles`**：声明在 `TabDescriptor.settings.pluginToggles`，键是插件局部键，由 better-sidebar 在自己的设置页渲染并落进这个 blob（上游 guide §8）。本项目的三个低频偏好就落在这里。**整份 blob 属于 better-sidebar 自己的 Loader 行**：第三方不能直接写它，只能通过 `pluginToggles` 声明或 better-sidebar 未公开的 `/sidebar/api/settings.update` 私有路由。
_Avoid_: pluginToggles（那只是声明给宿主渲染设置行的键子集）、localStorage。

**settings forms service（设置表单服务）**
: DSH 0.1.7+ 的官方持久化面，host half 服务名就是 `ctx.settings`（`dsh-settings\lib\index.js:330` `super(ownerContext, "settings")`）。API：`describe()` / `update(ns, patch, expectedRevision?)` / `replace` / `mutate(ns, ops, rev)` / `configure`；`ns` 必须是 **profile 内 Loader entry id**，schema 来自 `entry.fiber?.runtime?.Config`。**client half 拿不到这个服务**（web profile 无 dsh-settings 副本），浏览器侧要读写只能走 host half 自建的 fenced 路由或自有 RPC channel。
_Avoid_: settings namespace（0.1.7 前已退役的机制）、settings RPC（只服务白名单命名空间）。

**own row config（自有行配置）**
: 插件用 schemastery 从 DSH 导出的 `Config` 对象声明的自有字段集，宿主当设置表单渲染并持久化。**patch 里出现 schema 未声明的键会整单被拒**；`.volatile()` 字段走实时提交路径；**schemastery 必须从 DSH 导入**，用公开包会静默丢掉每一次实时偏好写入。
_Avoid_: Config（未限定时歧义）、prefs。

**write amplification（写入放大）**
: 改一个 volatile 字段触发的完整代价链：`withFileLock`（跨进程串行，超时 2s）→ 整行 config 节点替换 → `writeFileAtomic(0640)` → **全树 recompose + 受影响 fiber 重启** → chokidar 无 debounce 只跳过内容未变的写入。**这是把高频小对象（待办/笔记/书签）放进 patch 行 config 的真正障碍**，与体积上限无关（DSH 侧无任何字节数上限）。
_Avoid_: 性能问题（太宽）、YAML 重写（那只是其中一环）。

**data domain（数据域）**
: 本项目自有 JSON 存储文件里的一个顶层 key，承载一类用户数据（待办 / 笔记 / 书签）。三域共用同一载体与同一读写路径，只是 key 不同 —— 因此「存储层」只有一个，「数据模型」有三个。
_Avoid_: collection、table、namespace（后者已被 settings namespace 占用）。

**data file（数据文件）**
: host half 在 `~/.dsh/personal-studio/` 下自管的 JSON 文件，用户数据的 store of record（m00526 定）。写法照抄生态范式：tmp + `rename` 原子替换（dsh-server-deck `~/.dsh/server-deck.json`）或 `withLedgerLock` + 版本不符 rename 为 `.corrupt-${Date.now()}`（dsh-cost-meter `~/.dsh/storages/cost-meter/ledger.json`）。**不含密钥**；含密钥的文件按 0600 落。**上限 8 MiB，超限直接拒绝写入**（不截断、不丢旧数据）。**patch 行 config 完全不碰本项目的东西** —— 低频偏好走 better-sidebar 的 `pluginToggles`。
_Avoid_: 数据库（不是 db）、storage（DSH 的 `ctx.storage` 是另一个服务）、ledger（cost-meter 的专有名）。

**tab meta**
: `SidebarTab.meta`，官方划给插件的 JSON 序列化状态（v0.12.0+），随布局持久化、reload 后 verbatim 恢复；白名单字段只有 id/type/title/path/meta。**但持久化是 200ms 去抖 + best-effort localStorage**，只能做 UI 状态，不能当 store of record。
_Avoid_: tab state（那是整个布局）、pluginSettings（不同层）。

**soft probe（软探测）**
: 不把可选服务写进静态 `inject`，改用 `ctx.plugin({ inject: ['betterSidebar'], apply })` 在运行时挂载的方式。**原因**：cordis 对未声明的服务访问会抛错，且每个插件拿到的是**兄弟 context** —— 「轮询 `ctx.betterSidebar` 直到它出现」永远不可能成功；而静态 inject 一个冷启动缺失的服务会让整个插件 pending、拖垮 web boot。
_Avoid_: optional peer（那是包级声明，不是运行时挂载方式）、惰性加载。

**settings namespace（设置命名空间）**
: better-sidebar 的 side-card 偏好独占 `'dsh-better-sidebar'` 一个命名空间（`SIDEBAR_PREFS_NS`）。宿主 settings RPC 域**只服务白名单命名空间**，所以第三方插件读不到这个文档，只能走 better-sidebar 自己的 fenced `/sidebar/api/settingsGet|settingsUpdate` 路由。
_Avoid_: 命名空间（未限定时歧义）。

## 侧边栏结构

**tab**
: 侧边栏里的一个可打开页面，由 `TabDescriptor` 描述。本项目**只注册一个** tab（`dsh-personal-studio:workbench`），五个面板在它内部做切换器。
_Avoid_: 面板（panel 在本项目专指 tab 内部的五个分区：待办/笔记/书签/会话统计/服务器状态）、页面、视图。

**panel（工作台面板）**
: 本项目 tab 内部的一个分区，共五个：待办 / 笔记 / 书签 / 会话统计 / 服务器状态。每个面板有自己的领域模型与存储域，但共享同一个 tab 容器与同一份数据文件。**注意与 better-sidebar 的「bottom panel」（底部工作台宿主 DOM 面）区分**。
_Avoid_: tab（那是外层容器）、view、widget。

**sessions service（会话服务）**
: Cordis 服务 `ctx.sessions`，宿主提供（不是 better-sidebar 提供）。它是 `list: { getSnapshot(), subscribe(fn) }` 形态，快照含 `byId`（每会话一行摘要）与 `projectionsBySession`（每会话一份投影）。**注意 better-sidebar 只 augment 了 `betterSidebar` 一个服务名**，第三方插件若要读会话面，必须自己 `import type` 重述那一组类型。
_Avoid_: session store（better-sidebar 内部另有一个 host 侧 session-store.ts，不同物）、conversation。

**session summary（会话摘要）**
: `byId` 里每会话一行的最小元数据，字段只有 `id` / `cwd?` / `displayTitle` / `origin?` / `parentId?` / `running?`。**没有 createdAt / updatedAt / 消息数 / phase** —— 想按时间排序或显示活跃度的面板拿不到这些（因此 D3.4 定为「不按时间排序」）。
_Avoid_: session record、session info。

**bottom workbench（底部工作台）**
: 侧边栏下方的可拖拽分区。better-sidebar 的**插件自留 tab 条**在这里 —— `descriptor.badge` 徽标只有这一条渲染路径（`src/client/Sidebar.tsx:597-610` → `TabBar.tsx:261`）。`bottomOnly: true` 的 tab 只投这里；**本项目不设 `bottomOnly`**，因此 tab 同时落进 DSH 原生右栏，徽标在原生落点下不显示 —— 未完成待办数改挂在 tab 标题与面板切换器上。
: **实测（本项目 v0.1）**：不设 `bottomOnly` 的 descriptor 会在**两处**都出现 —— better-sidebar 的底部工作台（它自己的 `+` 卡片入口）与 DSH 原生右侧栏（`registerTab` 的默认落点，`src/client/native/index.ts` 的 `sync()` 会把每个非 `bottomOnly` 的 descriptor 注册成原生 tab 类型）。原生落点下的 tab 标题取自 tab 记录，所以挂在标题上的未完成数在原生 chip 上同样可见。
_Avoid_: bottom panel（易与宿主 DOM 面 `[data-dsh-bottom-panel]` 混淆）、dock。

**guide entry（指南条目）**
: 侧边栏「+」菜单 / 新手指南里代表一个 tab 类型的入口行。宿主只在条目 ≤ 4 条时渲染各条目的 `description`；`bottomOnly` 的 tab 不占条目。
_Avoid_: 菜单项（未限定时歧义）。

**workbench tab（工作台 tab）**
: 本项目注册的那**一个** tab，id 固定为 `dsh-personal-studio:workbench`。它是五个面板的共同外壳，内部切换器决定当前显示哪个面板；面板选择存 `tab.meta.panel`。
_Avoid_: workbench（那是 bottom workbench 那个宿主 DOM 面）、sidebar。

**file viewer**
: 按扩展名认领文件、决定其渲染方式的注册点（`FileViewerDescriptor`）。宿主已内置表格 / PDF / 图片 / Office 预览，第三方 viewer 接不到这些扩展名。
_Avoid_: 预览器、renderer。

## 数据面

**session projection（会话投影）**
: 宿主为每个会话计算的一份派生数据快照，挂在 `projectionsBySession[sessionId]` 上，携带 `tokenUsage`、`subagentTiming`、`subagentCatalog`、`agentTeam` 四类值。**每连接加载一次，被动读，无 observe/unobserve 握手。** 本项目「会话统计」面板的唯一数据源。
_Avoid_: 统计、metrics（那是对投影做变换后的产物）。

**token usage（token 四桶）**
: `uncachedInputTokens` / `cacheReadTokens` / `cacheWriteTokens` / `outputTokens`。四桶**互斥**，是会话累计值而非单轮值；reasoning token 已含在 `outputTokens` 内。
_Avoid_: input/output tokens（未说明是否含 cache 时歧义）。

**silent degradation（静默降级）**
: 缺数据时**省略该行**而不是显示 `0` 的口径。因为 `0` 与「从未工作」不可区分。上游 session-metrics 适配器即此口径，本项目沿用。
_Avoid_: 容错、fallback（都太宽）。

## 工作台领域（本项目自有，v1 边界已钉死）

**task（待办）**
: 用户写下的一条待办事项。v1 字段集：id / 标题 / done / 优先级 / 截止日 / 归属会话（sessionId）/ 排序。**与 DSH 的 `@deepseek-ai/dsh-tool-todo` 无关** —— 后者是模型侧工具，「the list belongs to the agent session that created it … ships no UI」，没有可读的宿主 todo 服务。
_Avoid_: todo（拼写变体，勿混用）、checklist。

**note（笔记）**
: 用户持有的一段 Markdown，组织单位 = **目录树**（m00511 定）。存在 data file 里，不落 `~/.dsh/docs` 纯文件（那是 dsh-docs-panel 的选择，本项目不跟随，理由：单一存储面更易维护）。
_Avoid_: doc（DSH 里 doc 另有所指）、memo。

**bookmark（书签）**
: 用户收藏的一条链接，组织单位 = **扁平列表**（m00511 定）。v1 字段：id / url / 标题? / 排序。
_Avoid_: link、favorite。

**server status（服务器状态）**
: 宿主机器的实时系统事实，v1 指标集 = **CPU / 内存 / 磁盘**，默认 5s 刷新（可在设置里改）。**已确认必须自建 host half**：better-sidebar 与宿主都没有任何客户端可用的 OS 指标 API（grep `uptime`/`freemem`/`cpus`/`loadavg`/`systemInfo`/`processList`/`cpuUsage` 全零命中），`ctx.subprocess` 明言 "The seam adds no continuous process-table monitor"；唯一的合规形态是 host half 用 node `os` 采集 + 注册 host route + client 经 `hostRouteUrl` 拉取。**v1 不做 loadavg / uptime+OS / 进程列表**（loadavg 在 Windows 无 node API；进程列表要自己 spawn `ps`/`tasklist` 并跨平台解析）。
_Avoid_: 机器状态、系统监控。

**remote host monitor（远程主机监控）**
: 已装的 `dsh-server-deck` 所属类别：经 SSH 把只读 POSIX 探针送到远端 `/bin/sh -s` 执行（读 /proc/stat、/proc/meminfo、/proc/uptime、/proc/cpuinfo、`df -P /`），**没有 localhost 概念**，也不是声明式 better-sidebar 消费者（`lib\client.js:7569-7576` 动态 `ctx.plugin({inject:['betterSidebar']})` 作三层挂载的中层，只发 bundle 无 src/）。与 server status 是两个领域，不复用。
_Avoid_: server status（那是本机）、主机面板。

## 实现面（v0.1 引入）

**api envelope（接口信封）**
: 本项目 host route 的统一响应形状：`{ ok: true, value }` 或 `{ ok: false, error: { code, message } }`。错误**只走信封**、不用 HTTP 状态码表达业务失败（403/404 保留给围栏与方法不存在），因为 client 侧只有一处解析点。
_Avoid_: REST error body、HTTP status code（那是传输层语义，不是本项目的错误面）。

**purity gate（纯度门）**
: 构建期强制插件的 client bundle **不 import 任何 Node builtin 或非白名单 `@deepseek-ai/*` 的值**（`import type` 会被擦除、不触发）。跨插件协作只走 cordis 服务，不走 import —— 宿主模块表随时可能变，插件自带一份副本会漂移。
_Avoid_: bundle check、lint rule（那只是本项目的一条构建门）。

**workbench store（工作台状态仓）**
: client half 里把「数据文件内容 + 加载/保存状态 + 系统指标」合成一份快照的内存对象，用 `useSyncExternalStore` 订阅。**它是 client 侧的派生视图，不是 store of record** —— 真值永远在 host 的数据文件里。
_Avoid_: store（那是 better-sidebar 的 `SidebarStore`）、cache。

---

_术语冲突处理规则：一旦某条与上游 better-sidebar / DSH 已发布的术语同名不同义，立即在此处标红并改选本项目的 canonical term。_
