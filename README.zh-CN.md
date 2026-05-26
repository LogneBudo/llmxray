<p align="center">
  <img src="https://raw.githubusercontent.com/LogneBudo/llmxray/master/public/favicon.svg" alt="LLMxRay" width="80" />
</p>

<h1 align="center">LLMxRay</h1>
<p align="center"><strong>看清您本地 AI 的真实运行状态。</strong></p>
<p align="center">
  面向本地大语言模型的实时词元流、质量分析、性能剖析与成本跟踪。<br/>
  无云端。无 API 密钥。无费用。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/llmxray"><img src="https://img.shields.io/npm/v/llmxray?color=cb3837&logo=npm&logoColor=white" alt="npm" /></a>
  <a href="https://hub.docker.com/r/djovaneli/llmxray"><img src="https://img.shields.io/docker/pulls/djovaneli/llmxray?color=2496ED&logo=docker&logoColor=white" alt="Docker" /></a>
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="License" />
  <img src="https://img.shields.io/badge/ollama-local-000?logo=ollama&logoColor=white" alt="Ollama" />
</p>

<p align="center">
  🌐 <a href="README.md">English</a> &bull;
  <a href="README.fr.md">Français</a> &bull;
  <strong>中文</strong> &bull;
  <a href="README.ar.md">العربية</a> &bull;
  <a href="README.sr.md">Srpski</a>
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> &bull;
  <a href="#功能特性">功能特性</a> &bull;
  <a href="#界面截图">界面截图</a> &bull;
  <a href="#适用人群">适用人群</a> &bull;
  <a href="CHANGELOG.md">更新日志</a>
</p>

<p align="center">
  <img src="docs/public/screenshots/demo.gif" alt="LLMxRay 演示 — 带置信度着色的实时词元流" width="800" />
</p>

---

## 快速开始

**一条命令,30 秒搞定。**

```bash
npx llmxray
```

或使用 Docker:

```bash
docker run -p 5174:5174 djovaneli/llmxray
```

打开 **http://localhost:5174** 即可开始对话。就这么简单。

> **前置条件:** 本地运行 [Ollama](https://ollama.com/download),并至少拉取一个模型(`ollama pull llama3.2`)。

---

## 为什么选择 LLMxRay?

您运行了一个本地大语言模型,与它对话,但实际发生了什么?

- 每个词元生成有多快?模型对哪些词元更有信心?
- 长对话中响应质量是否在下降?
- 如果在云端运行,这次对话要花多少钱?
- 模型是否在重复自己?拒绝回答?生成乱码?
- 在**相同提示**下,温度 0.3 与 0.9 有何区别?

**LLMxRay 用可视化方式实时免费回答以上所有问题。**

---

## 功能特性

### 实时对话与词元智能
与任何 Ollama 模型对话,观察词元到达时的**置信度着色** —— 每个词元根据生成速度被染色。支持 Markdown、多轮对话、文件附件、视觉模型与斜杠命令。

### 响应质量门禁
每条响应都会被自动分析。仅在出现问题时才显示彩色徽章:
- **重复** —— 短语过度重复(4-gram 分析)
- **拒绝** —— "作为一个 AI 语言模型" 等 7 种模式
- **乱码** —— 非 ASCII 比例过高
- **空响应** —— 少于 10 个词
- **截断** —— 在完成前触及词元上限

### 模型对比工作台
最多 **4 个槽位**,每个槽位独立配置模型、温度与系统提示。功能包括并排流式输出、词级别差异高亮、指标对比,以及一键预设(温度扫描、确定性配对、带词元税可视化的语言对比)。

### 性能分析
- **延迟百分位**(P50/P95/P99),涵盖总时长与首词元时间
- **错误情报** —— 7 类分类器与时间轴
- **使用热力图** —— 您活跃时段的 7×24 网格
- **设置影响** —— 温度与每秒词元数的散点图
- **冷启动与热启动**跟踪,含模型加载历史

### 成本仪表板
按模型/日统计词元用量,估算等效云端价格。看看您本地运行**节省**了多少。

### 外科手术式基准测试
用多选题套件测试模型知识。通过 OpenAI 兼容端点使用真实 logprobs 进行准确的置信度测量。可视化构建自定义题组,或让 AI 根据主题自动生成。

### 嵌入实验室与 RAG 流水线
嵌入文本、可视化向量、测量余弦相似度。从 PDF、DOCX 与 CSV 构建本地知识库 —— 分块、嵌入、可搜索。全部存储在 IndexedDB。零成本。

### 工具工坊(可视化画布)
拖拽式节点画布用于构建工具定义。双向代码同步(编辑节点或 TypeScript —— 两边同步更新)。探测 API、自动生成 schema、实时执行测试。

### 中段填充游乐场 *(v0.4.7 新增)*
为 Qwen-Coder、CodeLlama、Codestral、DeepSeek-Coder 与 StarCoder 提供代码补全。两个文本框(前缀 / 后缀),模型填补中间空缺。使用 Ollama 的 `/api/generate` 的 `suffix` 字段。拼接预览展示编辑器中的最终效果。

### 协议观察台 *(v0.4.7 新增)*
将同一提示并行发送至 Ollama 的三种服务协议 —— **原生** `/api/chat`、**OpenAI 兼容** `/v1/chat/completions`、**Anthropic 兼容** `/v1/messages` —— 全部针对您的本地模型运行。并排流式输出、各协议指标对比,以及信封差异标签页,展示各协议如何封装结束原因、词元计数与错误信封。无云端、无 API 密钥 —— 三个端点全部位于 `localhost:11434`。

### AI 训练流水线
从您的对话中筛选训练数据。标记、审查并导出为 JSONL 用于微调。

### 本地 AI 历史数据库
每次实验(基准测试、对比、对话、训练对)都会自动归档到可查询的 IndexedDB 数据库中,支持过滤、趋势、导出与保留策略。

### 多语言支持
完整翻译涵盖英语、法语、塞尔维亚语(拉丁与西里尔)、中文与阿拉伯语。支持 RTL 布局。希伯来语与日语的社区脚手架已就绪。

---

## Ollama 兼容性

针对 **Ollama 0.24.0**(2026 年 5 月最新稳定版)进行了测试与验证。LLMxRay 使用以下 Ollama 端点:

| 端点 | 用途 |
|---|---|
| `/api/chat` | 流式对话(NDJSON,支持 `tools`、`think`、`format` schema) |
| `/api/generate` | 生成与中段填充(通过 `suffix`) |
| `/api/tags`、`/api/show` | 模型列表与能力检测(`thinking`、`tools`、`vision`) |
| `/api/embed` | RAG 的向量嵌入 |
| `/api/pull`、`/api/delete`、`/api/ps`、`/api/version` | 模型管理与状态 |
| `/v1/chat/completions` | OpenAI 兼容路径,外科手术式基准测试用于获取真实 logprobs |
| `/v1/messages` | Anthropic 兼容路径,协议观察台使用 |

**兼容版本:** Ollama 0.20 及更新版本(更早版本支持对话/生成但缺少 `think` 与 JSON-schema `format`)。**推荐版本:** Ollama 0.24+,可获得完整功能,包括 Anthropic 兼容端点(0.23 新增)与 `think: "max"` 模式(0.21.3 新增)。

---

## 界面截图

<table>
<tr>
<td width="50%">

**带词元流与置信度的对话**
![Chat](docs/public/screenshots/chat-diagnostics.png)

</td>
<td width="50%">

**模型对比 — 并排**
![Compare](docs/public/screenshots/compare-sidebyside.png)

</td>
</tr>
<tr>
<td width="50%">

**会话深度分析 — 指标与时序**
![Session](docs/public/screenshots/session-details.png)

</td>
<td width="50%">

**基准测试与置信度雷达**
![Benchmark](docs/public/screenshots/benchmark.png)

</td>
</tr>
<tr>
<td width="50%">

**嵌入 — 余弦相似度**
![Embeddings](docs/public/screenshots/embed-similarity.png)

</td>
<td width="50%">

**系统监视器 — 硬件与 Ollama 状态**
![System](docs/public/screenshots/my-system.png)

</td>
</tr>
</table>

---

## 适用人群

| 您是... | LLMxRay 帮您... |
|---|---|
| **开发者** | 调试提示、剖析延迟、对比模型、检视工具调用、跟踪成本 |
| **研究者** | 在跨模型与温度的一致设置下运行受控实验 |
| **学生 / 教育者** | 可视化探索模型行为 —— 内置教育者工具包含 9 个交互式模块 |
| **AI 团队负责人** | 了解本地集群的质量趋势、错误模式与资源使用情况 |

---

## 安装方式

### npx(推荐)
```bash
npx llmxray
npx llmxray --port 3000
npx llmxray --ollama-url http://192.168.1.50:11434
```

### Docker
```bash
docker run -p 5174:5174 djovaneli/llmxray
docker run -p 5174:5174 -e OLLAMA_URL=http://host.docker.internal:11434 djovaneli/llmxray
```

### 从源码构建
```bash
git clone https://github.com/LogneBudo/llmxray.git
cd llmxray
npm install
npm run dev     # http://localhost:5173
```

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 框架 | Vue 3.5 + Composition API |
| 语言 | TypeScript 5.9(严格模式) |
| 构建 | Vite 7.3 |
| 样式 | Tailwind CSS 4.2 |
| 状态管理 | Pinia 3(按关注点拆分 store) |
| 图表 | Chart.js 4、D3.js 7 |
| 画布 | Vue Flow(可视化节点编辑器) |
| 代码编辑器 | CodeMirror 6 |
| 存储 | IndexedDB(浏览器原生) |
| LLM 后端 | Ollama(本地) |

---

## 架构

**流式传输** —— 通过 `fetch()` + `ReadableStream` 读取 Ollama NDJSON。词元通过 Pinia store 响应式地更新 UI。

**词元置信度** —— 根据词元间延迟近似计算(越快 = 越有信心)。明确标注为近似值。基准测试通过 OpenAI 兼容端点使用真实 logprobs。

**按关注点拆分 store** —— 每个领域都有自己的 Pinia store:tokens、sessions、metrics、reasoning、comparison、embeddings、quality、cost 等。

**硬件检测** —— 自定义 Vite 插件直接查询操作系统(PowerShell/proc/sysctl)获取准确的硬件规格。

---

## 开发

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器(端口 5173) |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run test` | 单元测试(Vitest) |
| `npm run test:e2e` | 端到端测试(Playwright) |

---

## 贡献

欢迎贡献!请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解设置与指南。

**特别欢迎社区翻译** —— 希伯来语与日语的脚手架文件已就绪。

---

## 许可证

[Apache License 2.0](LICENSE)

## 商标

**LLMxRay** 是 Ivan Stankovic([LogneBudo](https://github.com/LogneBudo))的商标。请参阅 [TRADEMARK.md](TRADEMARK.md)。

---

<p align="center">
  <strong>如果 LLMxRay 帮助您更好地理解您的 AI,请考虑给项目点亮一颗星。</strong><br/>
  这能帮助更多人发现这个项目。
</p>

<p align="center">
  <a href="https://github.com/LogneBudo/llmxray">
    <img src="https://img.shields.io/github/stars/LogneBudo/llmxray?style=social" alt="GitHub stars" />
  </a>
</p>
