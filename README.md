# dsh-personal-studio

> 把**待办、笔记、书签、会话统计、服务器状态**收进 DeepSeek Harness 右侧栏的一个 tab 里。

![license](https://img.shields.io/badge/license-MIT-green)
![dsh](https://img.shields.io/badge/DSH-%E2%89%A5%200.2.0--rc.2-8A8A8A)

个人工作台 —— 一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）侧边栏插件。它通过 [dsh-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) 注册一个侧边栏页面，五个面板在**同一个 tab 里切换**，不占你一整个右栏。

| 面板 | 能做什么 | 数据来自哪 |
| --- | --- | --- |
| **待办** | 标题、勾选完成、优先级、截止日、关联到某个会话；可按手动 / 截止日 / 优先级排序 | 你的本机数据文件 |
| **笔记** | 目录树 + 正文，文件夹可嵌套 | 你的本机数据文件 |
| **书签** | 扁平列表，点一下用浏览器打开 | 你的本机数据文件 |
| **会话** | 每个会话烧了多少 token、跑了多久 | DSH 的会话统计（只读） |
| **状态** | 这台机器的 CPU / 内存 / 磁盘占用 | 你正在跑 DSH 的这台机器（只读） |

> **v0.1 已实现并端到端联调通过** —— 在真机 web profile（DSH 0.2.1-rc.2 + better-sidebar 0.28.0）上跑通全链路：启动零告警、七个接口全部可用、五个面板逐个点开验证、控制台无任何报错。

---

## 快速入门

> 面向使用者。全程约 3 分钟，复制粘贴就行。

### 第 0 步：确认环境

| 项 | 要求 |
| --- | --- |
| DSH | **0.2.0-rc.2 或更新**（桌面版 / `dsh web` 都行） |
| dsh-better-sidebar | **0.28.0**（本插件依赖它提供侧边栏；0.26.x 在新宿主上起不来，见下方提示） |
| Node.js | 20 或更新（只在「源码安装」时需要） |

### 第 1 步：装侧边栏（如果还没装）

```sh
dsh plugin --profile web add dsh-better-sidebar@0.28.0
```

> ⚠️ **版本必须对上**。better-sidebar 的 npm `latest` 标签和 DSH 宿主的 `latest` 标签**不同步**，`dsh plugin add dsh-better-sidebar`（不写版本）可能装到在当前宿主上永远起不来的版本。**在 DSH 0.2.1-rc.2 及更新版本上请钉 0.28.0**；老宿主线的对应版本见[兼容性矩阵](#兼容性矩阵)。
>
> 如果启动时看到 `better-sidebar: pending (waiting for service: webRuntime)`，就是版本装错了。

### 第 2 步：装本插件

**方式 A —— 源码安装**（现在唯一可用的方式，包还没发到 npm）：

```sh
git clone https://github.com/siungolai/dsh-personal-studio.git
cd dsh-personal-studio
pnpm install
pnpm run build                                   # 必须先构建：插件入口是 lib/ 下的产物
dsh plugin --profile web add .                  # 在仓库根目录执行
```

> `add .` 会把仓库以 `link:` 方式挂进 profile，并**自动完成挂载** —— 不需要再手改 `cordis.patch.yml`。
>
> 用绝对路径也可以：`dsh plugin --profile web add /path/to/dsh-personal-studio`。

**方式 B —— 从 npm 装**（等包发布后）：

```sh
dsh plugin --profile web add dsh-personal-studio
```

**桌面版（DeepSeek Harness GUI）**把 `--profile web` 换成 `--profile desktop`：

```sh
dsh plugin --profile desktop add .
```

> 桌面 profile 由 Electron 独占，**必须用 DeepSeek Harness 自带的 `dsh` 命令**（全局 npm 版的 `dsh` 会拒绝 desktop profile 并给出提示）。

### 第 3 步：重启

| 场景 | 动作 |
| --- | --- |
| `dsh web` | 停掉再起（host 半要重启才会注册路由） |
| 桌面版 | **完全退出** DeepSeek Harness 再打开（桌面 profile 没有热重载） |
| 浏览器 | 硬刷新 `Ctrl/Cmd + Shift + R`（client 半是热加载的，但硬刷新最省事） |

### 第 4 步：找到它

装完之后，**两处**都能看到工作台：

1. **DSH 原生右侧栏** —— 出现一个叫「工作台」的 tab，标题后面带未完成待办数（`工作台 3`）
2. **better-sidebar 的底部工作台** —— 一张叫「工作台」的卡片

点开就是五个面板的切换器：**待办 / 笔记 / 书签 / 会话 / 状态**。

### 第 5 步：试一下

- **待办** → 底部输入框敲一条，回车；勾一下左边的框看数字会不会变
- **笔记** → 新建一个文件夹，在里面写点什么
- **书签** → 贴个网址进去，回车就能点开
- **会话** → 看看你刚才跑的那些会话烧了多少 token
- **状态** → 这台机器的 CPU / 内存 / 磁盘；默认 5 秒刷新一次

---

## 你的数据在哪

| 内容 | 落点 |
| --- | --- |
| 待办 / 笔记 / 书签 | `~/.dsh/personal-studio/data.json`（Windows：`C:\Users\<你>\.dsh\personal-studio\data.json`） |
| 三个设置偏好 | better-sidebar 自己的偏好文档里，跟着侧边栏一起存 |

关于这个数据文件：

- **原子写** —— 先写临时文件再改名，不会写到一半坏掉
- **上限 8 MiB**，超了**直接拒绝写入并报错**，不会悄悄截断、也不会丢你已有的数据
- 写之前会校验：没标题的条目会被丢弃，书签只收 `http` / `https` 链接
- 文件里**不含任何密钥**
- **v1 不做跨设备同步** —— 数据只在这台机器上

**备份**：直接复制那个 `data.json` 就行。**迁移到另一台机器**：把文件拷到同样的位置。

## 设置

三个设置在 **better-sidebar 自己的设置面板**里，本插件那张卡片下：

| 设置 | 类型 | 默认 | 作用 |
| --- | --- | --- | --- |
| 刷新间隔 | 数字（1–300 秒） | 5 | 「状态」面板多久刷一次 |
| 默认排序 | 下拉 | 手动排序 | 待办默认按手动 / 截止日 / 优先级排 |
| 显示已完成待办 | 开关 | 关 | 已勾掉的待办是否留在列表里 |

## 常见问题

**装完右栏里没有「工作台」？**

按顺序查：

1. 启动时有没有 `pending (waiting for service: ...)` 的告警 —— 有就是某个依赖的版本不对（多半是 better-sidebar）
2. better-sidebar 装了吗、版本是 0.28.0 吗
3. 改过 `cordis.patch.yml` 之后**重启**了吗（桌面版要完全退出重启）
4. 挂载是不是重了？`~/.dsh/profiles/<profile>/cordis.patch.yml` 里手写的 `dsh-personal-studio` 挂载行与 `dsh plugin add` 的自动挂载**只该留一个** —— 多余的手挂行删掉

**接口返回 405 / 404？**

路由没挂上 —— 宿主没重启。改完依赖或配置一定要重启宿主（client 半不用）。

**数据文件里的内容乱了？**

宿主读文件时发现 JSON 非法会直接报 `data-corrupt` 并**停下**，不会拿空数据覆盖你的文件。手工修好 JSON 再重启即可。

**怎么卸载？**

```sh
dsh plugin --profile web remove dsh-personal-studio
```

会一起从依赖和挂载列表里摘掉。数据文件留在原地（`~/.dsh/personal-studio/data.json`），要删自己删。

**能不能跟手机 / 另一台电脑同步？**

v1 不能，也不打算在 v1 做。

## 已知限制（v1 刻意不做）

| 事项 | 现状 |
| --- | --- |
| **未完成待办数的显示位置** | 侧边栏的「badge」徽标功能只渲染在 better-sidebar 自己的底部工作台里，进了 DSH 原生右栏后画不出来。所以数字挂在 **tab 标题**（`工作台 3`）和**面板切换器**（`待办 3`）上 —— 两处都看得到 |
| **跨设备同步** | 不做 |
| **笔记正文渲染** | 按纯文本编辑。要渲染 Markdown 得用宿主的渲染器，而插件规范禁止引用宿主 UI 包 |
| **会话排序** | 不按时间。宿主的会话摘要里只有 id / 目录 / 标题 / 父会话 / 是否运行中，**没有任何时间戳** |
| **会话统计口径** | 只 token 与时长；输入含缓存读取与写入，总量 = 输入 + 输出；没数据的会话整行不显示（不是显示 0） |
| **快捷键 / 划词** | 不做 |
| **每个面板单独的 badge / 快捷按钮** | 单 tab 内部分屏，宿主给 tab 的这些能力只剩一层 |

---

## 开发

> 以下内容面向想改这个插件的人。

### 它是什么

一个 **better-sidebar 消费插件**：不自绘侧边栏，而是向 better-sidebar 注册一个 tab（`TabDescriptor`），由 better-sidebar 把它注册成 DSH 原生右侧栏的一个 tab 类型。

技术形态：

- **双半包**：`host half`（Node 侧，持有数据文件与本机系统指标）+ `client half`（浏览器侧，React 页面）
- **软依赖**：`dsh-better-sidebar` 是 optional peerDependency。没装侧边栏时插件照常加载，只是不会出现在任何栏里 —— 依赖用**动态插件**表达（`ctx.plugin({ inject: ['betterSidebar'], apply })`），静态 `inject` 会让插件在没有该服务的 profile 上永远停在 `pending`
- **不 import 宿主 UI 包**：官方插件规范明令禁止 value-import `@deepseek-ai/dsh-client-ui-primitives`（「它们随时可能变化，纯 JS 插件没有类型检查，一个抛错的组件会把自己的入口渲染成空白」）。本项目**自建全部控件**（类名统一加 `psw-` 前缀），只与宿主共享 `--dsw-alias-*` 颜色令牌
- **视觉走宿主令牌**：面板表面读 `var(--dsw-alias-bg-layer-1)`，**绝不**消费 `--dsw-specific-sidebar-fill`（那是宿主左导航的表面色），因此日间 / 夜间 / 第三方皮肤都自动正确

### 目录结构

```text
dsh-personal-studio/
├── src/
│   ├── index.ts             # host half 入口：注册 /personal-studio/api 路由
│   ├── shared/types.ts      # 两半共用的数据形状与常量
│   ├── host/
│   │   ├── api.ts           # 路由处理器、方法表、输入校验
│   │   ├── store.ts         # 数据文件读写（tmp + rename 原子写）
│   │   ├── metrics.ts       # CPU / 内存 / 磁盘采集
│   │   ├── trust-fence.ts   # 浏览器信任围栏
│   │   └── wire.ts          # 请求体读取与信封
│   └── client/
│       ├── index.tsx        # client half 入口：注册 tab、切换器、五个面板
│       ├── controls.tsx     # 自建控件（Button / Input / Checkbox / Switch / SegmentedControl / Tag）
│       ├── controls.module.css
│       ├── icons.tsx        # 自绘图标（16 个，viewBox 0 0 16 16）
│       ├── prefs.ts         # 三个设置键的读写与 pluginToggles 声明
│       ├── api.ts           # 走 hostRouteUrl 的 API 客户端
│       ├── workbench-store.ts
│       ├── workbench.module.css
│       ├── session-metrics.ts  # token 与时长口径（对齐上游）
│       ├── sidebar-types.ts    # 从上游类型面派生的最小声明
│       ├── css-modules.d.ts    # CSS Modules 的类型声明
│       └── panels/          # todo / note / bookmark / session / server
├── GLOSSARY.md              # 领域词汇表
├── cordis.patch.yml         # 挂载补丁（只插一行，不带任何 config）
├── dsh.plugin.json          # 插件市场 manifest
├── tsdown.config.ts         # 三产物构建 + 纯度门 + CSS Modules
└── package.json
```

### 存储决策

| 内容 | 落点 | 理由 |
| --- | --- | --- |
| 待办 / 笔记 / 书签 | `~/.dsh/personal-studio/data.json` | 宿主对第三方路由**没有任何**字节上限，但改一个 volatile 字段会付一次全树 recompose + 受影响 fiber 重启。待办是高频小对象，每次勾选一条都付一次全树重放，代价太大 |
| 三个低频偏好 | better-sidebar 的 `pluginSettings['dsh-personal-studio:workbench']` | 官方给第三方的局部设置通道，不需要宿主 `PrefsSchema` 有对应字段，也不需要插件拥有 Loader 行 |

写入规则：

- **原子写**：先写临时文件再 `rename`，避免半截文件
- **上限 8 MiB，超限直接拒绝写入**（HTTP 413 / `data-too-large`）—— 不静默截断，不丢旧数据
- **写入前在 host 侧校验**：无 id / 无标题的行被丢弃，孤儿 `parentId` 降级为顶层，书签只接受 `http(s)` URL
- 数据文件**不含密钥**；v1 **不做跨设备同步**

### 接入契约（本项目遵守的规则）

#### 1. 依赖声明

`dsh-better-sidebar` 必须是 **peerDependency** 且 `optional: true`：

```jsonc
{
  "peerDependencies": {
    "@deepseek-ai/cordis": "^4.0.5",
    "dsh-better-sidebar": "^0.26.0 || ^0.28.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "peerDependenciesMeta": {
    "dsh-better-sidebar": { "optional": true }
  }
}
```

类型导入走子路径 `dsh-better-sidebar/client/service`（纯浏览器侧、零 Node 依赖）；主入口 `dsh-better-sidebar` 会把宿主半的 Node 类型图一起拉进来。

#### 2. 注册骨架

注册**必须**包在 `ctx.effect(...)` 里 —— `registerTab` 返回 disposer，fiber 卸载（HMR / 插件禁用）时自动调用；不包 effect 会导致下次激活抛 `"already registered"`。

```ts
// src/client/index.tsx
export function apply(ctx: Context): void {
  ctx.effect(() => {
    // betterSidebar 是可选 peer：缺失时这一层不激活，插件不出现，
    // 但绝不阻塞整个插件树。
    const fiber = ctx.plugin({
      name: 'dsh-personal-studio:tab',
      inject: ['betterSidebar'],
      apply: (inner) => {
        inner.effect(() => {
          const service = inner.get('betterSidebar')
          if (service === undefined) return () => {}
          const dispose = service.registerTab(descriptor)
          return () => { dispose() }
        })
      },
    })
    return () => { void fiber.dispose?.() }
  })
}
```

#### 3. 能力探测与优雅降级

可选服务一律用 `ctx.get(name)` 读（cordis 免 inject 的读取通道），不用 `ctx.xxx` —— 后者在没有声明 inject 时会抛 `cannot get property "xxx" without inject`。

- `ctx.get('betterSidebar')` 缺失 → 插件不注册任何 tab
- `ctx.get('sessions')` 缺失 → 会话面板显示为空，而不是挂载失败
- `ctx.get('uiWorkspace')` 缺失 → 退回 `sessions.open?.(id)`（老宿主路径）

`SIDEBAR_FEATURES` 共 14 项且**永不删除**，但 v0.19.0 已把 `'floatWindows'` 摘掉 —— 消费者**禁止**再 gate 这个已消失的特性（gate 一个永不出现的特性等于把代码路径永久关死）。

#### 4. 皮肤契约（令牌驱动）

- 面板表面背景：`var(--dsw-alias-bg-layer-1)`
- **绝不消费** `var(--dsw-specific-sidebar-fill)`（宿主左导航专属）
- 选中态：`var(--dsw-alias-interactive-bg-active)` + `var(--dsw-alias-state-business-primary)` 标记
- 稳定寻址面：`[data-dsh-better-sidebar]`、`[data-dsh-panel]`
- 面板根必须自撑满：`flex: 1; height: 100%; min-height: 0`（宿主面板体是**有确定高度的块级滚动容器，不是 flex 容器**，不撑会塌成内容高度）

#### 5. 布局契约与「可见性」信号

`TabComponentProps.visible` = 当前激活 tab 且面板打开。**不可见时必须暂停轮询**（计时器 / fetch 都要停），否则隐藏面板会持续打请求。本项目的状态面板轮询受它门控。

better-sidebar 的会话统计面（`projectionsBySession`）由宿主每连接加载一次，**没有 observe/unobserve 握手**；缺 projection 或缺键时上游选择**静默省略该行**而不是显示 0 —— 因为 0 与「从未工作」不可区分。本项目沿用同一口径。

#### 6. 宿主 API 路由

路由必须走 `hostRouteUrl()` 解析，**不要手写前导斜杠**：

```ts
const res = await fetch(service.hostRouteUrl('personal-studio/api/data.get'), { /* … */ })
```

`hostRouteUrl` 的实现是 `new URL(path.replace(/^\/+/, ''), directoryBase(baseUrl))`：剥掉所有前导斜杠、丢掉 query/hash 并强制尾斜杠。

#### 7. 已知安全边界

宿主对第三方路由**不施加任何** server-wide 认证或 Origin 策略（官方原话：*"route owners such as `dsh-client-connection` enforce their own request policy"*）。所以本插件自建两层：

1. **浏览器信任围栏**（`src/host/trust-fence.ts`）：Host 头必须是本机回环或部署声明的可信 authority，`sec-fetch-site: cross-site` 一律拒绝，Origin 必须同主机（桌面壳的 `dsh-app://app` 显式放行 —— 实际上桌面壳转发请求时会改写 origin，这行是冗余保险）
2. **宿主自己的请求闸门**（若宿主发布了 `connection.requestRejection`，逐请求读取 —— 宿主异步 init 之后才有这个服务，mount 时读会永远看不到）

> 这是 **DNS rebinding 防御，不是认证**。知道登录的层是宿主的 connection 服务。

### 兼容性矩阵

better-sidebar 的 npm `latest` 标签与 DSH 宿主的 `latest` 标签**不同步**，安装前必须按下表对齐版本。

| DSH 宿主版本 | better-sidebar 版本 | 说明 |
| --- | --- | --- |
| **0.2.1-rc.1+** | `0.28.0` | 上游当前稳定线；**本机 0.2.1-rc.2 实测基线** |
| 0.2.1-alpha.5 | `0.28.0-alpha.0` | alpha 线专用 |
| 0.2.0-rc.2 | `0.26.1` | v0.27.0 未发布，勿用 `latest` |
| 0.2.0-rc.1 | `0.24.1` | |
| 0.1.7-rc.1 ~ 0.1.7 stable | `0.22.1` | caret 范围跨 minor 不成立 |
| 0.1.7-alpha.x | 无兼容版本 | 需先升级 DSH |
| 0.1.6 及更早 | `0.19.1` | 已移除自绘右面板与终端 |

#### 本机已验证基线（2026-10 实测）

开发机上存在**两套版本错位的 DSH 安装**，排查问题时必须先分清「哪个进程才是宿主」：

| 位置 | 版本 | 角色 |
| --- | --- | --- |
| npm 全局目录下的 `@deepseek-ai/dsh` | **0.1.7-rc.2** | 全局 CLI（`dsh` 命令），**不是** GUI 宿主 |
| DeepSeek Harness 安装目录下的 `resources/app.asar.unpacked/dsh/` | **0.2.1-rc.2** | `@deepseek-ai/dsh-desktop-runtime`，实际伺服 Web GUI 的宿主 |

> 两条路径都随机器而变，**不要照抄绝对路径** —— 用 `where dsh`（CLI）与宿主安装目录自己定位。

profile 实测：

- **web profile**（`~/.dsh/profiles/web/`）装 `dsh-better-sidebar` **0.28.0** —— 本项目的联调基线
- **desktop profile**（`~/.dsh/profiles/desktop/`）装 **0.28.0**（exact，无 caret）
- 宿主提供 `@deepseek-ai/cordis` **4.0.5**，满足 better-sidebar 的 peer 下限
- profile 下的 `react` / `react-dom` / `@deepseek-ai/cordis` **均不可从 `node_modules` 解析**：`pnpm-workspace.yaml` 是 `nodeLinker: hoisted` + `autoInstallPeers: false`，peer 由宿主在运行时注入。**本地 build / typecheck 必须在 devDependencies 里自备这些包**

> 本项目以 better-sidebar **0.26.0 / 0.28.0 的公共 API 子集**实现（两版的 `TabDescriptor` / `registerTab` / `updateTab` / `hostRouteUrl` / `pluginToggles` / `badge` 完全同形），peer 范围写 `^0.26.0 || ^0.28.0`。

> ⚠️ **better-sidebar 0.26.0 在 DSH 0.2.1-rc.2 上不会激活**：0.26.0 的 host 半 `inject` 了 `webRuntime`，而该宿主已删除这个服务名，插件会永远停在 `pending (waiting for service: webRuntime)`。0.28.0 把 inject 换成 `['webServer','sessions','connection','tools']` 才能正常起来。所以**在 0.2.1-rc.2 上请钉 0.28.0**；0.26.x 只适用于更老的宿主线。

安装命令（钉 exact version，装完**硬刷新浏览器** Cmd/Ctrl+Shift+R）：

```sh
dsh plugin --profile web add dsh-better-sidebar@0.28.0   # DSH 0.2.1-rc.1+（本机基线）
dsh plugin --profile web add dsh-better-sidebar@0.26.1   # 仅 DSH 0.2.0-rc.2
```

### 开发环境

| 项 | 要求 |
| --- | --- |
| Node.js | >= 20（`fs.statfs` 需 ≥ 18.15 稳定） |
| pnpm | >= 10 |
| TypeScript | ^5.6 |
| React | ^18.2 |
| DSH 宿主 | 0.2.1-rc.2+（本机 0.2.1-rc.2） |
| better-sidebar | 0.28.0（本机基线）/ 0.26.1（老宿主线） |

> `react` / `react-dom` / `@deepseek-ai/cordis` 必须写进 **devDependencies**：profile 用 `nodeLinker: hoisted` + `autoInstallPeers: false`，peer 只在宿主运行时注入，本地 `tsc` 解析不到。

### 构建

```sh
pnpm install
pnpm exec tsc --noEmit     # 类型检查
pnpm run build             # 产出 lib/
```

三个产物：

| 文件 | 形态 | 用途 |
| --- | --- | --- |
| `lib/index.js` | ESM / Node | host half（Loader 行） |
| `lib/client.js` | CJS 工厂闭包 | client half（profile bundle 通道，bundle id = 包名） |
| `lib/client-registry.js` | CJS 工厂闭包 | client half（插件市场通道，bundle id = manifest id） |

client bundle 的三条硬规则（由 `tsdown.config.ts` 强制）：

- **纯度门**：任何 Node builtin 或非白名单的 `@deepseek-ai/*` value import 直接让构建失败。跨插件协作只走 cordis 服务，不走 import（`import type` 会被擦除，不触发门禁）
- **CSS Modules**：编译成哈希类名映射，在工厂执行时注入 `<style data-plugin>` 标签
- **关闭 code splitting**：模块加载器的 `require` 无法在浏览器里加载相对路径的 chunk

> 在 PowerShell 里 `pnpm run typecheck` 会把 tsc 的 stderr 报成 `NativeCommandError`（看起来像失败）。拿真实退出码请用 `pnpm.cmd exec tsc --noEmit; "EXIT=$LASTEXITCODE"`。

### 手动挂载（不走 `dsh plugin add`）

`dsh plugin add` 会自动把包加进 `dsh.profile.bundles` 并应用本包自带的 `cordis.patch.yml`，一般不需要手动操作。手挂的写法是：

1. `~/.dsh/profiles/web/package.json` 的 `dependencies` 加 `"dsh-personal-studio": "link:<本仓库路径>"`
2. `~/.dsh/profiles/web/cordis.patch.yml` 追加挂载行：
   ```yaml
   - insert:
       - id: dsh-personal-studio
         name: dsh-personal-studio
   ```
3. 在 profile 目录执行 `pnpm install`
4. 浏览器硬刷新（Cmd/Ctrl+Shift+R）

> ⚠️ 追加挂载行时**另起一行**，不要改已有行。同 id 重复挂载在实测中**不会报错**（后者覆盖前者，插件照常工作、界面不会出现两个工作台），但会让合成配置里出现两条同 id 记录，以后排查时容易误判。**手挂的行与 `dsh plugin add` 的自动挂载只留一个。**

**desktop profile（桌面 GUI）**由 Electron 独占，**改动后必须重启 GUI 宿主**才会重新合成挂载树（改完 patch 但不重启时，宿主仍会回答 405 —— 路由没挂上）：

1. `~/.dsh/profiles/desktop/package.json` 的 `dependencies` 加同样的 `link:` 依赖
2. `~/.dsh/profiles/desktop/cordis.patch.yml` 追加同样的挂载行
3. 在 profile 目录执行 `pnpm install`
4. **完全退出并重启 DeepSeek Harness**

> 桌面 profile 的 `patchReload` 未开启（web profile 是 `live`），所以没有热重载可依赖。

### 发布到 DSH 插件市场时的约束

- manifest 走 `dsh.plugin.json`，`manifestVersion: 1`
- `dependencies` / `peerDependencies` / `optionalDependencies` 一律**不得出现 `cordis`**
- `scripts` 不得含 install 类钩子
- client bundle 禁止 value-import `@dsh-external/*` 或非白名单的 `@deepseek-ai/*`
- 仓库打 `dsh-better-sidebar` topic 后可进生态推荐目录

### 参考

- [dsh-better-sidebar 仓库](https://github.com/omdsh-dev/DSH-better-sidebar)（上游 latest v0.28.0，MIT；本机 baseline 0.28.0）
- [外部插件接入指南](https://github.com/omdsh-dev/DSH-better-sidebar/blob/main/docs/external-plugin-guide.md)（接入契约的权威来源）
- [better-sidebar 生态 topic](https://github.com/topics/dsh-better-sidebar)
- 同生态先例：[dsh-sentinel](https://github.com/fuhefei/dsh-sentinel)、[dsh-docs-panel](https://github.com/mlosun/dsh-docs-panel)

设计细节见 [`GLOSSARY.md`](GLOSSARY.md)（领域词汇表：宿主与集成面 / 侧边栏结构 / 数据面 / 工作台领域 / 实现面）。

## 许可

MIT —— 跟随 better-sidebar 与生态主流。见 [LICENSE](LICENSE)。
