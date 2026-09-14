# 协议观察台

**协议观察台**把同一个提示词，通过**三种不同的服务协议**并行发送给你本地的 Ollama 守护进程，并清楚地展示每种协议是如何组织同一段对话的。

**侧边栏位置：** 协议观察台（在代码补全下方）
**路由：** `/protocols`
**加入版本：** v0.4.7（2026 年 5 月）

## 这有什么意义？

Ollama 并不只说一种协议。它实际上通过三种不同的传输格式暴露同一个本地模型：

| 接口 | 格式 | 流式封装 |
|---|---|---|
| `/api/chat` | Ollama 原生 | NDJSON（每行一个 JSON） |
| `/v1/chat/completions` | OpenAI 兼容 | SSE（`data: …`） |
| `/v1/messages` | Anthropic 兼容 | 带 `event:` 标签的 SSE |

不同的生态通过不同的协议与大模型通信。如果你在做集成、调试客户端库，或者只是好奇同一个模型在不同封装下表现如何，这个页面会把差异直观地呈现出来 —— **全部针对同一个本地模型，无云端、无 API key、无需注册。**

## 使用这个页面

1. 从下拉框选择一个模型。
2. 输入提示词（已提供默认值）。
3. 按需调整最大 token 数。
4. 点击**运行全部 3 种协议**。

三列会并行流式输出。每一列显示：

- **协议名称**与接口路径
- 实时**状态标识**（空闲 → 流式中 → 已完成）
- **流式回复文本**
- **指标网格**：TTFT、总耗时、token 数、token/秒、结束原因
- 可展开的**报文检查**面板，显示原始的首个与最后一个数据块 / 事件

## 报文差异标签页

三次运行全部完成后，下方会出现一个分标签区域。切换到**报文差异**，可以并排比较每种协议如何组织自己的响应：

| 方面 | 原生 | OpenAI 兼容 | Anthropic 兼容 |
|---|---|---|---|
| 流式封装 | NDJSON | SSE | 带 `event:` 标签的 SSE |
| 结束原因所在字段 | `done` + `done_reason` | `choices[].finish_reason` | `message_stop` 事件 |
| token 计数所在字段 | `eval_count` + `prompt_eval_count` | `usage.{prompt,completion,total}_tokens` | `usage.{input,output}_tokens` |
| 错误报文结构 | `{"error": "string"}` | `{"error": {"message", "type", "code"}}` | `{"type": "error", "error": {...}, "request_id"}` |

标着「本次运行」的行会填入你这次运行中实际观察到的值 —— 于是你可以看到，比如原生协议返回了 `done_reason: "stop"`，而 Anthropic 协议把同一个结果称为 `stop_reason: "end_turn"`。

## 为什么是三种协议？

这并非纸上谈兵 —— 很多真实工具都依赖这些兼容层：

- **OpenAI 兼容**是 IDE 插件、Cursor、Continue.dev，以及大多数「面向 OpenAI API」的 Python 库与本地模型通信的方式。
- **Anthropic 兼容**是 Claude Code、Claude Cowork、OpenClaw 这类工具与 Ollama 通信的方式（Ollama v0.23 / 2026 年 1 月加入）。
- **原生**协议给出的指标最丰富 —— 包括各项耗时、评估计数和 `done_reason` 字段。

如果某个第三方工具在你的本地 Ollama 上表现异常，协议观察台能让你透过那种协议的视角，看清传输层到底长什么样。

## 另见

- [对话诊断](./chat-diagnostics)：单一协议下的深入分析
- [对比](./compare)：用同一个提示词比较不同*模型*（协议观察台则固定模型、变换协议）
