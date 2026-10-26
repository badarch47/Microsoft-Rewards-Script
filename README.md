# Microsoft Rewards Script 使用说明（中文版）

[![Discord](https://img.shields.io/badge/Join%20Our%20Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/8BxYbV4pkj)
[![Latest Build](https://img.shields.io/github/actions/workflow/status/TheNetsky/Microsoft-Rewards-Script/auto-release.yml?branch=v4&style=for-the-badge&label=Latest%20Build)](https://github.com/TheNetsky/Microsoft-Rewards-Script/actions/workflows/auto-release.yml)
[![Docker](https://img.shields.io/badge/Docker-GHCR-blue?style=for-the-badge&logo=docker)](https://github.com/TheNetsky/Microsoft-Rewards-Script/pkgs/container/microsoft-rewards-script)

> [!TIP]
> 本版本**仅支持全新的现代化 Bing Rewards 仪表盘**，**不支持**旧版仪表盘。
> 如果你的账号仍在使用旧版仪表盘，请改用 [v3 分支](https://github.com/TheNetsky/Microsoft-Rewards-Script/tree/v3) 和 v3.x 版本！
>
> 使用风险自负——部分功能可能无法如预期工作。

---

## 目录

- [目录](#目录)
- [快速上手](#快速上手)
    - [裸机部署](#裸机部署)
        - [获取脚本](#获取脚本)
- [账号配置](#账号配置)
- [配置文件设置](#配置文件设置)
    - [构建并运行脚本（裸机版）](#构建并运行脚本裸机版)
- [GitHub Actions](#github-actions)
- [Docker](#docker)
- [Control API 与仪表盘](#control-api-与仪表盘)
- [Nix 环境配置](#nix-环境配置)
- [配置项详解](#配置项详解)
    - [核心（Core）](#核心core)
    - [任务执行器（Workers）](#任务执行器workers)
    - [活动（Activities）](#活动activities)
    - [搜索设置（Search Settings）](#搜索设置search-settings)
        - [查询词来源](#查询词来源)
    - [实验性功能（Experimental）](#实验性功能experimental)
        - [活动源码目录结构](#活动源码目录结构)
    - [日志（Logging）](#日志logging)
    - [代理（Proxy）](#代理proxy)
    - [Webhook 通知](#webhook-通知)
- [故障排查](#故障排查)
    - [手动登录](#手动登录)
    - [会话管理](#会话管理)
- [免责声明](#免责声明)

---

## 快速上手

### 裸机部署

**环境要求：** Node.js >= 24 和 Git
支持 Windows、Linux、macOS 以及 WSL。

#### 获取脚本

```bash
git clone https://github.com/TheNetsky/Microsoft-Rewards-Script.git
cd Microsoft-Rewards-Script
```

或者下载最新 release 的 ZIP 包并解压。

## 账号配置

- 把 [`env.example`](env.example) 复制并重命名为 `.env`，填入你的账号凭据：

```env
ACCOUNT_1_EMAIL=email@example.com
# ACCOUNT_1_PASSWORD=your_password
```

> [!NOTE]
> `ACCOUNT_N_PASSWORD` 是可选项。需要支持密码登录时才设置；如果是免密登录或仅用 Authenticator 的账号，请留空不填。
>
> 每个账号对应一个 `ACCOUNT_N_*` 配置块。账号序号不需要连续：即使前面的序号缺失，也可以直接配置 `ACCOUNT_2` 或 `ACCOUNT_4`。账号按序号从小到大依次运行。可选的单账号字段包括恢复邮箱、地区、语言、代理和指纹持久化——完整列表见 [`env.example`](env.example)。

`ACCOUNT_N_LANG_CODE` 接受 BCP 47 语言标签，例如 `nl`、`it` 或 `pt-BR`。`ACCOUNT_N_GEO_LOCALE` 接受两位字母的国家代码，或默认使用 `auto`。所选的语言和国家会一致地应用到浏览器指纹、`Accept-Language`、Microsoft Rewards App 请求头以及特定市场的请求中。在 `auto` 模式下，首次成功请求仪表盘后会缓存 Microsoft 账号资料中返回的国家；修改任一地区设置都会自动替换掉不兼容的已保存指纹。

> [!TIP]
> 对于开启了两步验证（2FA）的账号，设置 `ACCOUNT_N_TOTP_SECRET` 后脚本会自动生成并填入 6 位验证码。获取密钥的方法：在 Microsoft 安全设置中打开"管理你的登录方式"，添加一个身份验证器应用，出现二维码时选择"手动输入代码"——把那串代码作为 `.env` 中的值填入即可。

> [!WARNING]
> 每次修改 `.env` 后都必须重新构建脚本。

## 配置文件设置

> [!WARNING]
> 如果你是裸机运行脚本，**不要**跳过这一步。

- **裸机部署：** 把 `config.example.json` 复制或重命名为项目根目录下的 `config.json`，并按需自定义。
- **Docker：** 首次运行时会自动生成一份有效的 `config.json` 并保存到本地 `./config/` 目录。你也可以参照 `config.example.json` 手动创建一份（例如需要填写正则表达式时）。

> [!CAUTION]
> 旧版本的 accounts.json 和 config.json 与当前版本不兼容。

### 构建并运行脚本（裸机版）

```bash
npm run pre-build
npm run build
npm run start
```

## GitHub Actions

仓库内置的 [`daily-rewards.yml`](.github/workflows/daily-rewards.yml) 工作流会在每天**中国标准时间 09:00（UTC 01:00）**运行所有已启用的 Rewards 任务。你也可以通过 **Run workflow** 手动触发。

1. Fork 本仓库，或把你的副本推送到自己的 GitHub 仓库。工作流需保留在仓库的默认分支上。
2. 打开 **Settings → Secrets and variables → Actions → Secrets**，添加：
    - `ACCOUNT_1_EMAIL`（必填）：Microsoft 账号邮箱。
    - `ACCOUNT_1_PASSWORD`：Microsoft 账号密码（若启用了密码登录）。
    - `ACCOUNT_1_TOTP_SECRET`：用于无人值守两步验证的 TOTP 密钥。
    - `ACCOUNT_1_RECOVERY_EMAIL`（可选）：登录过程中使用的恢复邮箱。
    - `WECOM_WEBHOOK_URL`（可选）：企业微信群机器人 Webhook 地址，用于推送成功或失败通知。
3. 可选：打开 **Variables** 标签页，设置 `ACCOUNT_1_GEO_LOCALE`（例如 `CN`）和 `ACCOUNT_1_LANG_CODE`（例如 `zh-CN`）。留空则使用脚本默认值。
4. 打开 **Actions**，按提示启用工作流，选择 **Daily Microsoft Rewards**，点击 **Run workflow** 测试配置。

工作流会校验邮箱是否已配置，安装 Node.js 24 和无头 Chromium（下载到 `~/.cache/patchright` 并通过 `actions/cache` 复用；安装时故意不加 `--with-deps`，因为 Runner 镜像已自带所需系统库，这样可以省掉每次运行数分钟的 apt 安装），生成 `config.json`，并以实时输出的方式运行脚本。每次运行都会在 Actions 页面追加一份结果摘要，包含处理的账号数量、获得的积分、当前余额，以及失败时提取的错误摘要。由于脚本在报告账号级失败（例如登录被拒）时仍会以退出码 0 结束，工作流的包装逻辑会检查输出并在这种情况下将作业标记为失败，避免出错的运行显示为绿色。捕获的输出中会对账号邮箱、用户名、密码、TOTP 密钥和代理凭据做脱敏处理，因为公开仓库的日志可能被公众访问。如果配置了 `WECOM_WEBHOOK_URL`，工作流会向企业微信群机器人发送成功或失败通知；未配置时则跳过通知，不影响 Rewards 任务的执行。

凭据从 GitHub Secrets 读取，不会提交到仓库。当 GitHub 托管的 Runner 繁忙时，定时运行可能晚于设定时间启动。完全的无人值守执行还取决于 Microsoft 是否要求验证码或其他交互式登录验证。

### 在 CI Runner 上登录

`account.live.com/identity/confirm` 是 Microsoft 的「验证你的身份」页面。GitHub 托管的 Runner 每次运行都会换一个 IP，正好命中这个风控条件，而该页面要求输入发送到备用邮箱或手机的验证码——无人值守脚本无法回答。工作流现在会识别这一页面：把页面标题和可见操作写入日志，把 HTML 与截图作为 `rewards-diagnostics` 制品上传，并在约 40 秒内明确失败，而不是空转到超时。

真正能长期无人值守的做法是复用一次已登录的会话：

1. 在本地保持 `config.json` 中 `"headless": false`，带上账号凭据运行 `npm run start`。
2. 在可见的浏览器窗口中手动完成身份验证，脚本会把会话写入 `sessions/sessions.db`。
3. 把该数据库编码后存为仓库 Secret `REWARDS_SESSION_DB_B64`：
    ```bash
    base64 -w0 sessions/sessions.db
    ```
4. 工作流会在每次运行前恢复该会话，并在运行结束后缓存更新过的数据库，之后的运行即可跳过登录页。

会话文件等同于凭据：只放在 Secrets 中，不要提交进仓库；能读取该 Secret 或 Actions 缓存的人都可以用这个账号行事。

## Docker

- 复制示例文件 [`compose.yaml`](compose.yaml)
- 把 [`env.example`](env.example) 复制并重命名为 `.env`，填入你的账号凭据：

```env
ACCOUNT_1_EMAIL=email@example.com
# ACCOUNT_1_PASSWORD=your_password
```

`ACCOUNT_N_PASSWORD` 为可选项；免密或仅用 Authenticator 的账号可省略。

- 检查 `compose.yaml`，按需调整定时计划、时区和配置项。

> [!NOTE]
> 首次运行会使用默认值自动生成一份有效的 `config.json`，并保存到本地 `./config/`。
> 你也可以在 `compose.yaml` 的 `environment:` 段中使用 `CONFIG_*` 变量来自定义选项（例如并发集群数、Webhook 等）。
> 全部可用选项见[下方配置表](#配置项详解)。
> `CONFIG_*` 变量在每次启动时都会生效，且优先级始终高于 `./config/config.json`。

> [!TIP]
> 如果新镜像增加了你本地缺失的配置项，容器日志中会出现警告。
> 更新方法：删除 `./config/config.json` 后重启——系统会根据最新示例重新生成一份，并重新应用你在 `compose.yaml` 中的覆盖配置。

- 启动容器：`docker compose up -d`

> [!TIP]
> 用 `docker logs microsoft-rewards-script` 查看日志，便于获取免密登录验证码或排查问题。
> 也可以在 `compose.yaml` 中启用 Webhook 来接收通知。

---

## Control API 与仪表盘

可选的 Control API 允许本地仪表盘或其他受信任工具通过 HTTP 监控和控制脚本。完整的部署方式、鉴权说明、全部接口、请求字段、响应示例和安全建议见 [Control API 完整文档](scripts/api/README.md)。

常见用途包括：

- 通过 `GET /health` 和 `GET /status` 检查 API 健康状态与当前运行状态；
- 读取实时积分、日志、错误、账号摘要、运行历史和错误诊断信息；
- 列出安全的已存会话元数据，以及删除某个账号的移动端/桌面端会话；
- 通过 `POST /start` 加空 JSON 请求体启动全部账号；
- 通过 `POST /start` 加 `{"accountIndex":2}` 只运行某一个账号；
- 通过 `POST /start` 加 `{"excludedAccountIndexes":[2,4]}` 运行除指定序号外的所有账号；
- 通过 `POST /stop` 或 `POST /restart` 停止或重启运行；
- 通过 `GET /events` 使用 Server-Sent Events（SSE）实时流式获取日志和状态更新；
- 读取当前生效的配置和定时计划；修改配置与计划的接口仅在显式启用对应的 `API_ALLOW_*` 选项后才可用。

例如，用 cURL 只启动 `ACCOUNT_2`：

```bash
curl --request POST \
  --url http://127.0.0.1:3010/start \
  --header 'Authorization: Bearer YOUR_API_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"accountIndex":2}'
```

如需现成的网页界面，可使用官方支持并推荐的 [Rewards Dashboard](https://github.com/mgrimace/rewards-dashboard)。它通过本 Control API 来管理运行、账号、定时计划、日志、积分以及相关脚本设置。

---

## Nix 环境配置

使用 Nix 时执行：`bash scripts/nix/run.sh`

---

## 配置项详解

编辑 `config.json` 来自定义行为，或在 `compose.yaml`（Docker）中设置 `CONFIG_*` 环境变量。以下是当前全部可用选项。

> [!WARNING]
> 每次修改配置后，都需要重新构建脚本（裸机）或重建容器（Docker）。

### 核心（Core）

| 配置项                      | 类型    | 默认值       | 说明                                                    | Docker 环境变量                       |
| --------------------------- | ------- | ------------ | ------------------------------------------------------- | ------------------------------------- |
| `sessionPath`               | string  | `"sessions"` | 存放浏览器会话的目录                                    |                                       |
| `headless`                  | boolean | `false`      | 以无界面方式运行浏览器                                  | Docker 中始终为 `true`                |
| `clusters`                  | number  | `1`          | 并发运行的账号集群数量                                  | `CONFIG_CLUSTERS`                     |
| `errorDiagnostics`          | boolean | `false`      | 将错误页面和未知登录页面的诊断信息保存到 `diagnostics/` | `CONFIG_ERROR_DIAGNOSTICS`            |
| `ensureStreakProtection`    | boolean | `true`       | 确保已开启连续打卡保护（streak protection）             | `CONFIG_ENSURE_STREAK_PROTECTION`     |
| `autoClaimPunchcardRewards` | boolean | `false`      | 自动领取已完成的打卡任务奖励                            | `CONFIG_AUTO_CLAIM_PUNCHCARD_REWARDS` |
| `contintueOnBotWarning`     | boolean | `false`      | 忽略 Microsoft 的机器人评分警告继续执行（不推荐）       | `CONFIG_CONTINTUE_ON_BOT_WARNING`     |
| `skipNonPointTasks`         | boolean | `true`       | 跳过不给积分的任务                                      | `CONFIG_SKIP_NON_POINT_TASKS`         |
| `accountDelay.min`          | string  | `"1min"`     | 开始下一个已配置账号前的最小延迟                        | `CONFIG_ACCOUNT_DELAY_MIN`            |
| `accountDelay.max`          | string  | `"3min"`     | 开始下一个已配置账号前的最大延迟                        | `CONFIG_ACCOUNT_DELAY_MAX`            |
| `searchOnBingLocalQueries`  | boolean | `false`      | ExploreOnBing 使用本地查询词列表                        | `CONFIG_SEARCH_ON_BING_LOCAL`         |
| `globalTimeout`             | string  | `"30sec"`    | 所有操作的超时时间                                      | `CONFIG_GLOBAL_TIMEOUT`               |

### 任务执行器（Workers）

| 配置项                         | 类型    | 默认值  | 说明                                                | Docker 环境变量                      |
| ------------------------------ | ------- | ------- | --------------------------------------------------- | ------------------------------------ |
| `workers.doDailySet`           | boolean | `true`  | 完成每日任务集（Daily Set）                         | `CONFIG_WORKER_DAILY_SET`            |
| `workers.doClaimBonusPoints`   | boolean | `true`  | 领取奖励积分                                        | `CONFIG_WORKER_CLAIM_BONUS_POINTS`   |
| `workers.doMorePromotions`     | boolean | `true`  | 完成"更多活动"                                      | `CONFIG_WORKER_MORE_PROMOTIONS`      |
| `workers.doPunchCards`         | boolean | `true`  | 完成打卡任务（Punch Cards）                         | `CONFIG_WORKER_PUNCH_CARDS`          |
| `workers.doAppPromotions`      | boolean | `true`  | 完成 App 推广任务                                   | `CONFIG_WORKER_APP_PROMOTIONS`       |
| `workers.doDesktopSearch`      | boolean | `true`  | 执行桌面端搜索                                      | `CONFIG_WORKER_DESKTOP_SEARCH`       |
| `workers.doMobileSearch`       | boolean | `true`  | 执行移动端搜索                                      | `CONFIG_WORKER_MOBILE_SEARCH`        |
| `workers.doBonusSearches`      | boolean | `false` | 超出上限后继续刷额外搜索                            | `CONFIG_WORKER_BONUS_SEARCHES`       |
| `workers.doDailyCheckIn`       | boolean | `true`  | 完成每日签到                                        | `CONFIG_WORKER_DAILY_CHECKIN`        |
| `workers.doReadToEarn`         | boolean | `true`  | 完成"阅读赚积分"（Read-to-Earn）                    | `CONFIG_WORKER_READ_TO_EARN`         |
| `workers.doActivateSearchPerk` | boolean | `true`  | 存在时激活"再搜索 N 次"特权（在每日任务集之后运行） | `CONFIG_WORKER_ACTIVATE_SEARCH_PERK` |
| `workers.doVisualSearch`       | boolean | `false` | 激活视觉搜索连续记录并执行视觉搜索                  | `CONFIG_WORKER_VISUAL_SEARCH`        |

### 活动（Activities）

| 配置项                    | 类型    | 默认值 | 说明                      | Docker 环境变量                  |
| ------------------------- | ------- | ------ | ------------------------- | -------------------------------- |
| `activities.urlReward`    | boolean | `true` | 完成 URL 奖励类活动       | `CONFIG_ACTIVITY_URL_REWARD`     |
| `activities.searchOnBing` | boolean | `true` | 完成 ExploreOnBing 类活动 | `CONFIG_ACTIVITY_SEARCH_ON_BING` |

### 搜索设置（Search Settings）

| 配置项                                 | 类型     | 默认值                      | 说明                                                    | Docker 环境变量                    |
| -------------------------------------- | -------- | --------------------------- | ------------------------------------------------------- | ---------------------------------- |
| `searchSettings.scrollRandomResults`   | boolean  | `false`                     | 在搜索结果页随机滚动                                    | `CONFIG_SEARCH_SCROLL_RANDOM`      |
| `searchSettings.clickRandomResults`    | boolean  | `false`                     | 随机点击链接                                            | `CONFIG_SEARCH_CLICK_RANDOM`       |
| `searchSettings.runOnZeroPoints`       | boolean  | `false`                     | 即使搜索积分已用完也继续搜索                            | `CONFIG_SEARCH_RUN_ON_ZERO_POINTS` |
| `searchSettings.maxBonusSearches`      | number   | `110`                       | 单次运行的额外搜索上限（开启 `doBonusSearches` 时生效） | `CONFIG_SEARCH_MAX_BONUS_SEARCHES` |
| `searchSettings.parallelSearching`     | boolean  | `true`                      | 并行执行搜索                                            | `CONFIG_SEARCH_PARALLEL`           |
| `searchSettings.clusterSearch`         | boolean  | `true`                      | 用 Bing 联想词为每个主题构建搜索簇                      | `CONFIG_SEARCH_CLUSTER`            |
| `searchSettings.queryEngines`          | string[] | 见[查询词来源](#查询词来源) | 用于构建搜索词池的来源                                  | `CONFIG_SEARCH_QUERY_ENGINES` \*   |
| `searchSettings.searchResultVisitTime` | string   | `"10sec"`                   | 在每个搜索结果页停留的时间                              | `CONFIG_SEARCH_VISIT_TIME`         |
| `searchSettings.searchDelay.min`       | string   | `"30sec"`                   | 两次搜索之间的最小延迟                                  | `CONFIG_SEARCH_DELAY_MIN`          |
| `searchSettings.searchDelay.max`       | string   | `"1min"`                    | 两次搜索之间的最大延迟                                  | `CONFIG_SEARCH_DELAY_MAX`          |
| `searchSettings.readDelay.min`         | string   | `"30sec"`                   | 阅读内容的最小延迟                                      | `CONFIG_SEARCH_READ_DELAY_MIN`     |
| `searchSettings.readDelay.max`         | string   | `"1min"`                    | 阅读内容的最大延迟                                      | `CONFIG_SEARCH_READ_DELAY_MAX`     |

桌面端和移动端的搜索配额独立于仪表盘计数器单独跟踪。所有 `mobileSearch` 条目合并计算移动端配额，所有 `pcSearch` 条目合并计算桌面端配额；明确标识为 Edge 的计数器也会单独展示以便诊断。脚本只跳过已完成的平台，因此移动端配额已完成（`60/60`）不会阻止尚未完成的桌面端配额继续运行。启用 `parallelSearching` 后，两个未完成的配额可以在各自的浏览器上下文中并发执行。

> [!NOTE]
> \* Docker 的 `CONFIG_*` 数组值使用逗号分隔的字符串，例如 `"error,warn"`。正则表达式必须直接写在 `config.json` 中。

#### 查询词来源

`searchSettings.queryEngines` 控制主搜索主题的来源。可任意组合；所有选中来源的主题会汇入同一个池并去重。启用 `searchSettings.clusterSearch` 时，每个主主题会按需通过 Bing 联想词扩展，该主题簇被打乱后依次完成，然后才进入下一个主主题。

核心来源：

| 选项         | 来源                                            |
| ------------ | ----------------------------------------------- |
| `google`     | Google Trends（热门搜索）                       |
| `wikipedia`  | 维基百科最多阅读文章（前一日）                  |
| `wikirandom` | 随机维基百科文章                                |
| `hackernews` | Hacker News 首页文章                            |
| `reddit`     | Reddit r/popular 帖子标题                       |
| `local`      | 内置的 `src/functions/search-queries.json` 列表 |

RSS 源使用点号路径——`rss` 表示全部源，`rss.<site>` 表示整个站点，`rss.<site>.<endpoint>` 表示单个订阅源：

| 选项               | 订阅源                                                          |
| ------------------ | --------------------------------------------------------------- |
| `rss.googleTrends` | Google Trends RSS（`gb`、`us`）                                 |
| `rss.googleNews`   | Google News（`gb`、`us`、`world`、`technology`、`business`）    |
| `rss.bbc`          | BBC News（`top`、`world`、`technology`、`business`、`science`） |
| `rss.guardian`     | The Guardian（`international`、`world`、`technology`）          |
| `rss.theVerge`     | The Verge（`all`）                                              |
| `rss.arsTechnica`  | Ars Technica（`all`）                                           |
| `rss.reddit`       | Reddit 列表订阅源（`popular`、`worldnews`、`technology`）       |

在 `src/constants/rssFeeds.ts` 中添加你自己的订阅源。默认值：

```json
[
    "google",
    "wikipedia",
    "wikirandom",
    "hackernews",
    "reddit",
    "local",
    "rss.googleTrends",
    "rss.googleNews",
    "rss.bbc",
    "rss.guardian.world",
    "rss.theVerge.all"
]
```

### 实验性功能（Experimental）

需手动开启的功能，可能随时变动。默认全部关闭。

| 配置项                         | 类型    | 默认值  | 说明                                                 | Docker 环境变量                          |
| ------------------------------ | ------- | ------- | ---------------------------------------------------- | ---------------------------------------- |
| `experimental.apiSearch`       | boolean | `false` | 通过 HTTP 执行 Bing 搜索，而不是驱动浏览器页面       | `CONFIG_EXPERIMENTAL_API_SEARCH`         |
| `experimental.apiSearchOnBing` | boolean | `false` | 通过 HTTP 完成 ExploreOnBing 活动，而不使用浏览器    | `CONFIG_EXPERIMENTAL_API_SEARCH_ON_BING` |
| `experimental.blockMedia`      | boolean | `false` | 登录后拦截浏览器的 `image` 和 `media` 请求以减少流量 | `CONFIG_EXPERIMENTAL_BLOCK_MEDIA`        |
| `experimental.edgeBrowsing`    | boolean | `false` | 将 30 分钟的 Edge 浏览活动作为后台 HTTP 任务上报     | `CONFIG_EXPERIMENTAL_EDGE_BROWSING`      |

启用 `experimental.blockMedia` 后，自动化流程只在验证通过身份认证且会话已保存之后才会激活它。手动登录流程全程保持媒体加载开启；`npm run open-session` 仍会立即应用配置的拦截规则，因为它打开的是已保存的会话。

启用 `experimental.edgeBrowsing` 后，该任务会在常规活动序列之前启动，并作为独立的 Promise 与每日任务集、推广活动、App 活动和搜索并行运行。如果前台工作先完成，账号会保持打开状态直到该 Promise 结束。没有对应推广活动、缺少访问令牌或已无剩余 Edge 浏览任务的账号会被立即跳过。

#### 活动源码目录结构

标准活动位于 `src/functions/activities` 下，按职责分组：

- `rewards`：每日任务集、更多推广、打卡任务，以及共享的推广分发逻辑
- `api`：单个 Rewards API 操作
- `app`：单个移动端 App 活动以及 App 推广任务的编排
- `search`：浏览器搜索流程、搜索进度跟踪，以及共享的 SearchOnBing 行为
- `visualSearch`：视觉搜索活动及其浏览器传输层
- `experimental`：API Search、API SearchOnBing、Edge Browsing 及其配套传输层

实验性活动与其他活动一起放在 `src/functions/activities/experimental` 下。仅浏览器使用的媒体拦截器位于 `src/browser/MediaBlocker.ts`。`BrowserFunc` 只包含共享的 Rewards/浏览器/会话传输逻辑，不再包含具体的搜索或视觉搜索实现。

> [!NOTE]
> [Playwright 官方文档](https://playwright.dev/docs/api/class-browsercontext#browser-context-route)指出，路由生效期间浏览器的 HTTP 缓存会被禁用。图片较多的页面在开启媒体拦截后通常能显著减少传输数据量，但缓存密集型站点并不保证总带宽更低或加载更快。如果某站点依赖图片/媒体的 load 事件，请保持该选项关闭。

> [!NOTE]
> API 路径更快，但依赖新版仪表盘的接口。如果某个 ExploreOnBing 活动始终无法计入积分，请关闭 `apiSearchOnBing` 以回退到浏览器路径。无论实验性搜索选项如何设置，常规的 Rewards 操作都使用引导阶段捕获的 Cookie 和操作数据，不会刷新可见页面。浏览器在基于浏览器的搜索开始前会保持空闲。URL 奖励请求失败或未确认时会触发一次上下文刷新和一次重试；成功的请求使用服务端操作返回的余额。

### 日志（Logging）

| 配置项                           | 类型     | 默认值                 | 说明                                            | Docker 环境变量                 |
| -------------------------------- | -------- | ---------------------- | ----------------------------------------------- | ------------------------------- |
| `debugLogs`                      | boolean  | `false`                | 启用调试日志                                    | `CONFIG_DEBUG_LOGS`             |
| `consoleLogFilter.enabled`       | boolean  | `false`                | 启用控制台日志过滤                              | `CONFIG_LOG_FILTER_ENABLED`     |
| `consoleLogFilter.mode`          | string   | `"whitelist"`          | 过滤模式（whitelist 白名单 / blacklist 黑名单） | `CONFIG_LOG_FILTER_MODE`        |
| `consoleLogFilter.levels`        | string[] | `["error", "warn"]`    | 需要过滤的日志级别                              | `CONFIG_LOG_FILTER_LEVELS` \*   |
| `consoleLogFilter.keywords`      | string[] | `["starting account"]` | 需要过滤的关键词                                | `CONFIG_LOG_FILTER_KEYWORDS` \* |
| `consoleLogFilter.regexPatterns` | string[] | `[]`                   | 用于过滤的正则表达式                            |                                 |

> [!NOTE]
> \* Docker 的 `CONFIG_*` 数组值使用逗号分隔的字符串，例如 `"error,warn"`。正则表达式必须直接写在 `config.json` 中。

### 代理（Proxy）

| 配置项                          | 类型    | 默认值  | 说明                                  | Docker 环境变量                          |
| ------------------------------- | ------- | ------- | ------------------------------------- | ---------------------------------------- |
| `proxy.queryEngine`             | boolean | `true`  | 为查询词来源请求使用代理              | `CONFIG_PROXY_QUERY_ENGINE`              |
| `proxy.ignoreCertificateErrors` | boolean | `false` | 为拦截型代理关闭浏览器的 TLS 证书校验 | `CONFIG_PROXY_IGNORE_CERTIFICATE_ERRORS` |

普通 HTTP(S)/SOCKS 代理请保持 `proxy.ignoreCertificateErrors` 关闭。启用它会削弱整个浏览器上下文的 TLS 保护，只有在受信任的拦截型代理确实无法出示有效证书时才应使用。

`proxy.queryEngine` 控制查询词来源的 HTTP 请求是否使用账号的 HTTP 代理。要让这些 HTTP 请求有可用代理，需设置对应的 `ACCOUNT_N_PROXY_HTTP=true`（并配置 `ACCOUNT_N_PROXY_*`）；浏览器流量则独立使用 `ACCOUNT_N_PROXY_URL`。

账号浏览器代理支持 `http://`、`https://`、`socks4://` 和 `socks5://`（只写主机名时按 HTTP 处理）。HTTP(S) 代理可使用 `ACCOUNT_N_PROXY_USERNAME` 和 `ACCOUNT_N_PROXY_PASSWORD`；Patchright 不支持 SOCKS4/SOCKS5 代理的浏览器认证。无效协议、无效端口、不完整的凭据以及带认证的 SOCKS 代理配置，都会在浏览器启动前的账号校验阶段被拒绝。

### Webhook 通知

| 配置项                                   | 类型     | 默认值                                               | 说明                                            | Docker 环境变量                         |
| ---------------------------------------- | -------- | ---------------------------------------------------- | ----------------------------------------------- | --------------------------------------- |
| `webhook.discord.enabled`                | boolean  | `false`                                              | 启用 Discord Webhook                            | `CONFIG_DISCORD_ENABLED`                |
| `webhook.discord.url`                    | string   | `""`                                                 | Discord Webhook 地址                            | `CONFIG_DISCORD_URL`                    |
| `webhook.telegram.enabled`               | boolean  | `false`                                              | 启用 Telegram Webhook                           | `CONFIG_TELEGRAM_ENABLED`               |
| `webhook.telegram.botToken`              | string   | `""`                                                 | Telegram 机器人 Token                           | `CONFIG_TELEGRAM_BOTTOKEN`              |
| `webhook.telegram.chatId`                | string   | `""`                                                 | Telegram 会话 ID                                | `CONFIG_TELEGRAM_CHATID`                |
| `webhook.ntfy.enabled`                   | boolean  | `false`                                              | 启用 ntfy 通知                                  | `CONFIG_NTFY_ENABLED`                   |
| `webhook.ntfy.url`                       | string   | `""`                                                 | ntfy 服务器地址                                 | `CONFIG_NTFY_URL`                       |
| `webhook.ntfy.topic`                     | string   | `""`                                                 | ntfy 主题                                       | `CONFIG_NTFY_TOPIC`                     |
| `webhook.ntfy.token`                     | string   | `""`                                                 | ntfy 认证令牌                                   | `CONFIG_NTFY_TOKEN`                     |
| `webhook.ntfy.title`                     | string   | `"Microsoft-Rewards-Script"`                         | 通知标题                                        | `CONFIG_NTFY_TITLE`                     |
| `webhook.ntfy.tags`                      | string[] | `["bot", "notify"]`                                  | 通知标签                                        | `CONFIG_NTFY_TAGS` \*                   |
| `webhook.ntfy.priority`                  | number   | `3`                                                  | 通知优先级（1-5）                               | `CONFIG_NTFY_PRIORITY`                  |
| `webhook.webhookLogFilter.enabled`       | boolean  | `false`                                              | 启用 Webhook 日志过滤                           | `CONFIG_WEBHOOK_LOG_FILTER_ENABLED`     |
| `webhook.webhookLogFilter.mode`          | string   | `"whitelist"`                                        | 过滤模式（whitelist 白名单 / blacklist 黑名单） | `CONFIG_WEBHOOK_LOG_FILTER_MODE`        |
| `webhook.webhookLogFilter.levels`        | string[] | `["error"]`                                          | 需要发送的日志级别                              | `CONFIG_WEBHOOK_LOG_FILTER_LEVELS` \*   |
| `webhook.webhookLogFilter.keywords`      | string[] | `["starting account", "select number", "collected"]` | 需要过滤的关键词                                | `CONFIG_WEBHOOK_LOG_FILTER_KEYWORDS` \* |
| `webhook.webhookLogFilter.regexPatterns` | string[] | `[]`                                                 | 用于过滤的正则表达式                            |                                         |

> [!NOTE]
> \* Docker 的 `CONFIG_*` 数组值使用逗号分隔的字符串，例如 `"error,warn"`。正则表达式必须直接写在 `config.json` 中。

> [!WARNING]
> **NTFY** 用户请务必将 `webhookLogFilter` 设为 `enabled`，否则你会收到_所有_日志的推送通知。
> 启用后，只有账号开始、2FA 验证码和账号完成摘要会作为推送通知发送。
> 可通过 `keywords` 选项自定义你要接收的通知内容。

---

## 故障排查

> [!TIP]
> 大多数登录问题都可以通过删除 /sessions 文件夹并重新部署脚本来解决。

### 手动登录

当某个账号需要交互式 Microsoft 登录时，使用手动登录命令。它会以有界面模式打开同一个内置的定制版 Chromium 浏览器，且不会调用自动登录处理逻辑。你完成登录后，命令会等待浏览器在 `rewards.bing.com` 上连续停留 5 秒，然后保存会话并自动关闭浏览器。

```bash
# 创建或刷新自动化运行开始时使用的移动端会话
npm run manual-login -- --email user@example.com

# 只创建或刷新桌面端会话
npm run manual-login -- --email user@example.com --platform desktop

# 依次创建移动端和桌面端会话
npm run manual-login -- --email user@example.com --platform both

# 忽略现有 Cookie，执行一次全新登录
npm run manual-login -- --email user@example.com --fresh
```

邮箱必须与 `.env` 中某个 `ACCOUNT_N_EMAIL` 条目一致。默认会恢复已有 Cookie，而 `--fresh` 会在不带 Cookie 的情况下启动，但在启用指纹持久化时仍会保留兼容的已存指纹。该命令会使用 `.env` 中所选账号的语言、地区、代理、代理凭据和指纹设置。会话路径、全局超时、媒体拦截选项和代理 TLS 选项来自 `config.json`。对应的 `CONFIG_GLOBAL_TIMEOUT`、`CONFIG_EXPERIMENTAL_BLOCK_MEDIA` 和 `CONFIG_PROXY_IGNORE_CERTIFICATE_ERRORS` 环境变量覆盖也会在加载 `.env` 之后生效。

为了让手动浏览器和自动化浏览器保持一致的设备身份，请为你使用的平台启用 `ACCOUNT_N_SAVE_FINGERPRINT_MOBILE=true` 和/或 `ACCOUNT_N_SAVE_FINGERPRINT_DESKTOP=true`。

手动登录会强制使用可见浏览器，并在整个交互式认证流程中推迟媒体拦截，即使 `experimental.blockMedia` 已启用也是如此。自动化运行只在登录验证和会话保存之后才恢复配置的拦截规则，因此认证相关的 SVG、二维码和视频不会被该选项拦截。

请在具备图形桌面和完整 Patchright Chromium 安装的电脑上直接运行此命令。默认的 Docker 镜像只包含无头浏览器外壳，无法显示这个交互式窗口。

### 会话管理

会话工具需要显式指定命令，因此不带参数运行只会显示帮助信息，绝不会删除任何内容。

```bash
# 列出已存储的移动端和桌面端会话
npm run clear-sessions -- list

# 删除某个账号的会话
npm run clear-sessions -- email user@example.com

# 删除全部已存储的会话
npm run clear-sessions -- all
```

```bash
# 列出安全的会话元数据
curl --request GET \
  --url http://127.0.0.1:3010/sessions \
  --header 'Authorization: Bearer YOUR_API_TOKEN'

# 只删除 user@example.com 的移动端和桌面端会话
curl --request DELETE \
  --url http://127.0.0.1:3010/sessions/user%40example.com \
  --header 'Authorization: Bearer YOUR_API_TOKEN'
```

响应数据结构、Axios 示例和错误行为见 [Control API 会话文档](scripts/api/README.md#session-management)。

---

## 免责声明

使用风险自负。自动化操作 Microsoft Rewards 可能导致账号被限制或封禁。本软件仅用于教育目的。对于 Microsoft 采取的任何措施，作者概不负责。
