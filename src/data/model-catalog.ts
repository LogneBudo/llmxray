export interface CatalogVariant {
  tag: string
  params: string
  size: string
}

export interface CatalogEntry {
  name: string
  description: string
  variants: CatalogVariant[]
}

export interface CatalogCategory {
  key: string
  label: string
  entries: CatalogEntry[]
}

export const MODEL_CATALOG: CatalogCategory[] = [
  {
    key: 'chat',
    label: 'Chat',
    entries: [
      {
        name: 'llama3.2',
        description: 'Meta Llama 3.2 -- fast general-purpose chat',
        variants: [
          { tag: '1b', params: '1B', size: '1.3 GB' },
          { tag: '3b', params: '3B', size: '2.0 GB' },
        ],
      },
      {
        name: 'llama3.1',
        description: 'Meta Llama 3.1 -- strong reasoning and instruction following',
        variants: [
          { tag: '8b', params: '8B', size: '4.7 GB' },
        ],
      },
      {
        name: 'gemma3',
        description: 'Google Gemma 3 -- efficient and multilingual',
        variants: [
          { tag: '1b', params: '1B', size: '815 MB' },
          { tag: '4b', params: '4B', size: '3.0 GB' },
          { tag: '12b', params: '12B', size: '8.1 GB' },
        ],
      },
      {
        name: 'gemma2',
        description: 'Google Gemma 2 -- balanced performance',
        variants: [
          { tag: '2b', params: '2B', size: '1.6 GB' },
          { tag: '9b', params: '9B', size: '5.5 GB' },
        ],
      },
      {
        name: 'mistral',
        description: 'Mistral 7B -- strong European model',
        variants: [
          { tag: '7b', params: '7B', size: '4.1 GB' },
        ],
      },
      {
        name: 'phi4',
        description: 'Microsoft Phi-4 -- small but capable',
        variants: [
          { tag: '14b', params: '14B', size: '9.1 GB' },
        ],
      },
      {
        name: 'qwen2.5',
        description: 'Alibaba Qwen 2.5 -- multilingual powerhouse',
        variants: [
          { tag: '0.5b', params: '0.5B', size: '397 MB' },
          { tag: '1.5b', params: '1.5B', size: '986 MB' },
          { tag: '3b', params: '3B', size: '1.9 GB' },
          { tag: '7b', params: '7B', size: '4.7 GB' },
        ],
      },
      {
        name: 'tinyllama',
        description: 'TinyLlama -- ultra-lightweight for constrained systems',
        variants: [
          { tag: '1.1b', params: '1.1B', size: '637 MB' },
        ],
      },
    ],
  },
  {
    key: 'code',
    label: 'Code',
    entries: [
      {
        name: 'qwen2.5-coder',
        description: 'Qwen 2.5 Coder -- strong code generation and completion',
        variants: [
          { tag: '1.5b', params: '1.5B', size: '986 MB' },
          { tag: '3b', params: '3B', size: '1.9 GB' },
          { tag: '7b', params: '7B', size: '4.7 GB' },
        ],
      },
      {
        name: 'codellama',
        description: 'Meta Code Llama -- code-specialized Llama',
        variants: [
          { tag: '7b', params: '7B', size: '3.8 GB' },
          { tag: '13b', params: '13B', size: '7.4 GB' },
        ],
      },
      {
        name: 'deepseek-coder-v2',
        description: 'DeepSeek Coder V2 -- strong coding with MoE architecture',
        variants: [
          { tag: '16b', params: '16B', size: '8.9 GB' },
        ],
      },
      {
        name: 'starcoder2',
        description: 'BigCode StarCoder 2 -- trained on The Stack v2',
        variants: [
          { tag: '3b', params: '3B', size: '1.7 GB' },
          { tag: '7b', params: '7B', size: '4.0 GB' },
        ],
      },
      {
        name: 'codegemma',
        description: 'Google CodeGemma -- code completion and generation',
        variants: [
          { tag: '2b', params: '2B', size: '1.6 GB' },
          { tag: '7b', params: '7B', size: '5.0 GB' },
        ],
      },
    ],
  },
  {
    key: 'embedding',
    label: 'Embedding',
    entries: [
      {
        name: 'nomic-embed-text',
        description: 'Nomic -- 137M params, fast and good quality',
        variants: [
          { tag: 'latest', params: '137M', size: '274 MB' },
        ],
      },
      {
        name: 'mxbai-embed-large',
        description: 'mixedbread.ai -- 335M params, high quality',
        variants: [
          { tag: 'latest', params: '335M', size: '670 MB' },
        ],
      },
      {
        name: 'all-minilm',
        description: 'MiniLM -- 23M params, very lightweight',
        variants: [
          { tag: 'latest', params: '23M', size: '46 MB' },
        ],
      },
      {
        name: 'snowflake-arctic-embed',
        description: 'Snowflake -- 110M params, balanced',
        variants: [
          { tag: 'latest', params: '110M', size: '229 MB' },
        ],
      },
      {
        name: 'bge-m3',
        description: 'BAAI BGE-M3 -- multilingual, multi-granularity',
        variants: [
          { tag: 'latest', params: '567M', size: '1.2 GB' },
        ],
      },
    ],
  },
  {
    key: 'vision',
    label: 'Vision',
    entries: [
      {
        name: 'llava',
        description: 'LLaVA -- multimodal vision-language model',
        variants: [
          { tag: '7b', params: '7B', size: '4.7 GB' },
          { tag: '13b', params: '13B', size: '8.0 GB' },
        ],
      },
      {
        name: 'llama3.2-vision',
        description: 'Meta Llama 3.2 Vision -- image understanding',
        variants: [
          { tag: '11b', params: '11B', size: '7.9 GB' },
        ],
      },
      {
        name: 'minicpm-v',
        description: 'MiniCPM-V -- lightweight vision model',
        variants: [
          { tag: 'latest', params: '8B', size: '5.5 GB' },
        ],
      },
      {
        name: 'moondream',
        description: 'Moondream -- tiny vision model, runs anywhere',
        variants: [
          { tag: 'latest', params: '1.9B', size: '1.7 GB' },
        ],
      },
    ],
  },
  {
    key: 'thinking',
    label: 'Thinking',
    entries: [
      {
        name: 'deepseek-r1',
        description: 'DeepSeek R1 -- chain-of-thought reasoning',
        variants: [
          { tag: '1.5b', params: '1.5B', size: '1.1 GB' },
          { tag: '7b', params: '7B', size: '4.7 GB' },
          { tag: '8b', params: '8B', size: '4.9 GB' },
          { tag: '14b', params: '14B', size: '9.0 GB' },
        ],
      },
      {
        name: 'qwq',
        description: 'Alibaba QwQ -- strong reasoning with thinking traces',
        variants: [
          { tag: '32b', params: '32B', size: '20 GB' },
        ],
      },
      {
        name: 'phi4-reasoning',
        description: 'Microsoft Phi-4 Reasoning -- compact thinking model',
        variants: [
          { tag: '14b', params: '14B', size: '9.1 GB' },
        ],
      },
      {
        name: 'command-r',
        description: 'Cohere Command R -- reasoning with RAG strengths',
        variants: [
          { tag: '35b', params: '35B', size: '20 GB' },
        ],
      },
    ],
  },
]
