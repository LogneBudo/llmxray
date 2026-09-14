# 安装

## 前置条件

1. **Node.js 18 或更高版本** —— [下载](https://nodejs.org)
2. 本地运行的 **Ollama** —— [下载](https://ollama.com/download)
3. 至少拉取一个模型：

```bash
ollama pull llama3.2
```

::: tip 推荐的第一个模型
`llama3.2` 是很好的起点 —— 速度快、能力够用，而且体积小到大多数硬件都能跑。如果想体验推理功能，可以再试试 `deepseek-r1`。
:::

## 安装并运行

最快的方式是一条命令，无需克隆仓库：

```bash
npx llmxray
```

或者使用 Docker：

```bash
docker run -p 5174:5174 djovaneli/llmxray
```

如果你想从源码运行：

```bash
git clone https://github.com/LogneBudo/llmxray.git
cd llmxray
npm install
npm run dev
```

然后在浏览器中打开 **http://localhost:5173**（使用 `npx` 或 Docker 时为 **http://localhost:5174**）。就这样。

## 代理是如何工作的

LLMxRay 的开发服务器会自动把 API 请求代理到 Ollama：

| URL 前缀 | 代理到 |
|---|---|
| `/api/*` | `http://localhost:11434/api/*` |
| `/v1/*` | `http://localhost:11434/v1/*` |

如果你的 Ollama 运行在其他端口或其他机器上，请在**设置 > 连接**中修改地址。

## 构建生产版本

```bash
npm run build    # 类型检查 + 生产构建 → dist/
npm run preview  # 在本地预览构建结果
```

`dist/` 目录是一个静态站点，可以用任意 Web 服务器托管。

## 验证连接

启动应用后，查看顶栏右上角：

- **绿色指示灯** + 「已连接」—— Ollama 可以访问
- **红色指示灯** + 「未连接」—— 请检查 `ollama serve` 是否在运行

你也可以进入**设置**页面，点击连接测试按钮。

## 拉取更多模型

```bash
# 对话模型
ollama pull llama3.2
ollama pull mistral
ollama pull deepseek-r1       # 带 <think> 推理块的推理模型

# 嵌入模型（用于知识库和嵌入实验室）
ollama pull nomic-embed-text
ollama pull all-minilm

# 视觉模型（用于对话中的图片附件）
ollama pull llava
```

LLMxRay 会自动检测模型能力（推理、视觉、嵌入、工具调用），并相应调整界面。
