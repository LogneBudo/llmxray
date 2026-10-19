<p align="center">
  <img src="https://raw.githubusercontent.com/LogneBudo/llmxray/master/public/favicon.svg" alt="LLMxRay" width="80" />
</p>

<h1 align="center">LLMxRay</h1>
<p align="center"><strong>看清你的本地 AI 到底在做什么。</strong></p>
<p align="center">
  一条命令，一个浏览器标签页。逐 token 流式输出、缓存诊断、模型对比、基准测试与成本追踪，<br/>
  面向通过 Ollama 在你自己机器上运行的模型。无云端。无 API 密钥。零成本。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/llmxray"><img src="https://img.shields.io/npm/v/llmxray?color=cb3837&logo=npm&logoColor=white" alt="npm" /></a>
  <a href="https://hub.docker.com/r/djovaneli/llmxray"><img src="https://img.shields.io/docker/pulls/djovaneli/llmxray?color=2496ED&logo=docker&logoColor=white" alt="Docker" /></a>
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="License" />
  <img src="https://img.shields.io/badge/ollama-0.40.x-000?logo=ollama&logoColor=white" alt="Ollama" />
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
  <a href="#llmxray-让你看到什么">它让你看到什么</a> &bull;
  <a href="#适用人群">适用人群</a> &bull;
  <a href="#安装">安装</a> &bull;
  <a href="#ollama-兼容性">Ollama 兼容性</a> &bull;
  <a href="CHANGELOG.md">更新日志</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/demo.gif" alt="LLMxRay 演示：一轮对话逐 token 流式到达，随后显示会话指标" width="800" />
</p>

---

## 快速开始

你需要一个正在运行的 [Ollama](https://ollama.com/download)，且至少拉取了一个模型（`ollama pull llama3.2`）。然后：

```bash
npx llmxray
```

或者使用 Docker：

```bash
docker run -p 5174:5174 djovaneli/llmxray
```

打开 **http://localhost:5174**。选一个模型，发一条消息，看看会发生什么。就这么简单。

---

## LLMxRay 让你看到什么

你在运行一个本地模型。你和它对话。LLMxRay 回答接下来的问题：每个 token 有多快，提示花了多少，缓存有没有起作用，哪个设置其实更好，以及你的*其他*工具在向同一个模型发送什么。

下面的每一页都是其中一个答案。

### 对话，逐 token 呈现

每个 token 在到达时即被绘制，并按置信度着色。你能看到模型在哪里犹豫、在哪里笃定。支持 Markdown、多轮对话、文件与图片附件、斜杠命令，以及推理模型的思考预算（关闭、由模型决定，或 low / medium / high / max）。

![对话：按置信度着色的流式回复](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/chat-streaming.png)

每条回复落地时也会被检查。只有出问题时才会出现标记：重复、拒答、乱码、空回复，或在 token 上限处被截断。

### 会话深入

打开任意一轮，把它看作一条时间线：首 token 时间、token 间隔、推理块（如果有）、工具调用，以及实际发送的完整提示。

![会话详情：流时间线与指标](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/session.png)

### Live：你的其他工具在发什么

LLMxRay 会打开第二个端口 **11435**，它的行为与 Ollama 完全一致，并把一切转发过去。把 VS Code Copilot、Open WebUI、Continue、n8n 或你自己的脚本指向 `http://localhost:11435`，它们发送的每一轮都会出现在这里：客户端、模型、提示大小、来自缓存的比例、预填充与生成速度、工具调用。

```
VS Code Copilot ─┐
Open WebUI ──────┤                                   ┌─ Live 页面：每一轮、
Continue / n8n ──┼─► http://localhost:11435 ─► Ollama ┤  缓存命中、预填充速度、
你的脚本 ────────┘        (LLMxRay)                   └─ 缓存在哪里断裂
```

![Live：来自两个客户端的轮次，以及发现](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/live.png)

选中一轮，就能看到提示由什么组成，以及它与上一轮在哪个确切位置开始不再匹配，那就是缓存断裂的地方。发现以平实的句子呈现，每一条都链接到证明它的那一轮：某个客户端每轮都重读整条提示，某个模型部分跑在 CPU 上，工具模式占了每条提示的 40%。只在内存里保留计数和时间。提示文本是可选项，写入本地文件。一切不离开你的机器。

两个端口都监听你的局域网，而不只是 localhost，因此 Live 页面可以在第二块屏幕或另一台机器上全屏运行，看着智能体工作。

### 缓存实验室

本地模型只有在提示从第一个 token 起就完全匹配时才会复用提示缓存。顶部的一个时间戳就会让其后的一切作废。缓存实验室找出在轮次间变化的值，指出复用在哪里断掉，然后在你自己的守护进程上**实测**把它们移到末尾能省下多少。

![缓存实验室：诊断与实测结果](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/cache-lab.png)

在一条真实的 324 token 提示上实测：时间戳在前时复用 4 个 token、预填充 64.6 ms；时间戳在后时复用 290 个、预填充 18.6 ms。**快 3.5 倍，一字不改。**

### 对比

同一个提示放进最多四个槽位，每个槽位有自己的模型、温度和系统提示，并排流式输出。一键预设：温度扫描、确定性配对、语言对比。词级 diff 精确显示两个回答之间的差异。

![对比：同一模型的温度扫描](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/compare.png)

### 外科手术式基准测试

用精选题集（MMLU-Pro、ARC-Challenge、HellaSwag、GSM8K、TruthfulQA）给模型打分，依据的是模型的**真实 token logprobs**，而不是答案看起来对不对。按类别显示置信度与准确率，让你看到模型在哪里自信地答错。可导入你自己的 JSON 题集。

![基准测试：置信度与准确率](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/benchmark.png)

### 决策实验室

决策模型（nimble、tev1、clef）用概率而非文字回答类型化的问题。给实验室一个情境，然后要求在候选项中做选择、给出是/否概率，或在量表上打分。每个答案都以模型自身的分布返回，绘制成柱状。

![决策实验室：每个答案背后的概率柱](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/decision-lab.png)

### 协议观察台

同一个提示并行通过 Ollama 的三种服务协议：原生 `/api/chat`、OpenAI 兼容 `/v1/chat/completions`、Anthropic 兼容 `/v1/messages`。并排流式输出、按协议统计指标，以及一个封装 diff，展示各协议如何表达结束原因、token 计数和错误。

![协议观察台：三种协议并排](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/protocols.png)

### 知识库与嵌入

放入 PDF、DOCX、Markdown 或 CSV 文件。它们会被切块、嵌入并可搜索，让你在模型看到之前就知道检索实际返回了什么。嵌入页面可以按余弦相似度比较任意两段文本、可视化向量，并显示 Matryoshka 截断的代价。

<table>
<tr>
<td width="50%">

![知识库：带分数的搜索结果](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/knowledge-base.png)

</td>
<td width="50%">

![嵌入：两段文本的余弦相似度](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/embeddings.png)

</td>
</tr>
</table>

一切都留在浏览器的 IndexedDB 里。

### 代码补全

面向 Qwen-Coder、CodeLlama、Codestral、DeepSeek-Coder 和 StarCoder 的中段填充：给出前缀和后缀，模型补上中间。拼接预览按你的编辑器会显示的样子呈现结果。

![代码补全：前缀、后缀与拼接预览](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/fim.png)

### 工具工坊

用节点画布构建工具定义，TypeScript 双向同步：改节点或改代码都行。探测一个 API、生成模式，然后用真实调用测试工具。

![工具工坊：节点画布与打开的代码面板](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/tools.png)

### 分析与成本

请求与首 token 的延迟百分位（P50 / P95 / P99）、逐轮质量、按模型统计的错误、使用热力图，以及温度与每秒 token 数的关系。成本页面按云端价格为你的本地用量计价，让你看到本地运行省下了多少。

<table>
<tr>
<td width="50%">

![分析：延迟百分位与质量](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/analytics.png)

</td>
<td width="50%">

![成本：按模型的云端等价价格](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/costs.png)

</td>
</tr>
</table>

### 我的系统与模型

硬件、运行时与推理概览集中在一页：CPU、内存、GPU、哪些模型已加载以及加载在哪里。模型标签页列出每个已安装模型的参数、模板和运行器，并可从目录拉取新模型。

<table>
<tr>
<td width="50%">

![我的系统：硬件与 Ollama 状态](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/system.png)

</td>
<td width="50%">

![模型：已安装模型与目录](https://raw.githubusercontent.com/LogneBudo/llmxray/master/docs/public/screenshots/models.png)

</td>
</tr>
</table>

### 同样包含

- **AI 训练流水线。** 从你的对话中挑选样本对，打标签、复核，导出为 JSONL 用于微调。
- **本地历史数据库。** 每次对话、对比和基准测试都归档在 IndexedDB 中，支持筛选、趋势、导出和保留规则。
- **教育者套件。** [文档站](https://lognebudo.github.io/llmxray/docs/community/educators/)上的九个课程模块，每个都围绕 LLMxRay 的一个页面展开。
- **五种语言。** 英语、法语、塞尔维亚语（拉丁与西里尔）、中文和阿拉伯语，支持 RTL 布局。希伯来语和日语的脚手架已就绪。

---

## 适用人群

| 你是... | LLMxRay 帮你... |
|---|---|
| **开发者** | 调试提示、分析延迟、对比模型、检查工具调用、看清编辑器在发什么 |
| **研究者** | 在多个模型和温度下用相同设置做受控实验 |
| **学生 / 教育者** | 观察模型行为而不是读关于它的文字，配合九个模块的[教育者套件](https://lognebudo.github.io/llmxray/docs/community/educators/) |
| **AI 团队负责人** | 让每位开发者拥有相同的本地环境，并收集他们导出的基准结果和训练样本对 |

---

## 安装

### npx（推荐）
```bash
npx llmxray
npx llmxray --port 3000
npx llmxray --ollama-url http://192.168.1.50:11434
npx llmxray --observe-port 11436     # Live 端口，默认 11435
```

### Docker
```bash
docker run -p 5174:5174 -p 11435:11435 djovaneli/llmxray
docker run -p 5174:5174 -p 11435:11435 -e OLLAMA_URL=http://host.docker.internal:11434 djovaneli/llmxray
```

### 从源码运行
```bash
git clone https://github.com/LogneBudo/llmxray.git
cd llmxray
npm install
npm run dev     # http://localhost:5173
```

---

## Ollama 兼容性

已在 **Ollama 0.40.x** 上测试（2026 年 10 月于 0.40.6 验证）。支持 0.20 及更新版本；更旧的版本可以对话，但没有 `think` 和 JSON 模式 `format`。**推荐 0.33.3 或更新**，它会报告提示缓存复用，预填充速度因此按实际评估的 token 计算。

| 端点 | 用途 |
|---|---|
| `/api/chat` | 流式对话（NDJSON，支持 `tools`、`think` 努力级别、`format` 模式） |
| `/api/generate` | 生成与通过 `suffix` 的中段填充 |
| `/api/tags`、`/api/show` | 模型列表、能力、上下文长度、参数、模板 |
| `/api/embed` | 知识库的向量嵌入，可选 `dimensions` 截断 |
| `/api/pull`、`/api/delete`、`/api/ps`、`/api/version` | 模型管理与状态 |
| `/v1/chat/completions` | OpenAI 兼容路径，基准测试用它获取真实 logprobs |
| `/v1/messages` | Anthropic 兼容路径，协议观察台使用 |
| `/v1/systemone` | 决策模型，决策实验室使用 |

---

## 内部实现

Vue 3.5、TypeScript 5.9（严格模式）、Vite 7、Tailwind CSS 4、按关注点拆分的 Pinia store、Chart.js 与 D3 绘图、Vue Flow 作为工具画布、CodeMirror 6 处理代码。存储使用浏览器的 IndexedDB。后端是本地的 Ollama。

流式传输通过 `fetch()` 和 `ReadableStream` 读取 Ollama 的 NDJSON，token 经由 Pinia 更新界面。对话置信度由 token 间延迟近似得出并如实标注；基准测试使用真实 logprobs。硬件检测是一个直接询问操作系统的小型 Vite 插件。Live 端口是一个透明代理，只在内存中保留计数和时间。

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器（端口 5173） |
| `npm run build` | 类型检查与生产构建 |
| `npm run test` | 单元测试（Vitest） |
| `npm run test:e2e` | 端到端测试（Playwright） |

---

## 贡献

欢迎贡献。安装与规范见 [CONTRIBUTING.md](CONTRIBUTING.md)。尤其欢迎社区翻译：希伯来语和日语的脚手架文件已就绪。

## 许可证

[Apache License 2.0](LICENSE)

## 商标

**LLMxRay** 是 Ivan Stankovic（[LogneBudo](https://github.com/LogneBudo)）的商标。详见 [TRADEMARK.md](TRADEMARK.md)。

---

<p align="center">
  <strong>如果 LLMxRay 帮你更好地理解了你的 AI，请考虑给它一颗星。</strong><br/>
  这能帮助更多人发现这个项目。
</p>

<p align="center">
  <a href="https://github.com/LogneBudo/llmxray">
    <img src="https://img.shields.io/github/stars/LogneBudo/llmxray?style=social" alt="GitHub stars" />
  </a>
</p>
