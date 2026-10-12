import type { Plugin } from 'vite'
// The same observer the npx/Docker server runs, so `pnpm dev` has a Live page too.
// @ts-expect-error plain ESM without types
import { createObserver, createObserveHandler } from './server/observe.mjs'

/**
 * Dev-only mount of the observe port and its /__observe routes. In production
 * server/index.mjs does the same on Express.
 */
export function observePlugin(): Plugin {
  return {
    name: 'observe',
    configureServer(server) {
      const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
      const observer = createObserver({ ollamaUrl, port: Number(process.env.OBSERVE_PORT || 11435) })
      const handler = createObserveHandler(observer)
      server.middlewares.use('/__observe', (req, res) => void handler(req, res))
      if (process.env.OBSERVE !== '0') {
        observer.listen().then(
          (port: number) => server.config.logger.info(`  ➜  Observe: http://localhost:${port}`),
          () =>
            server.config.logger.warn(
              `  ➜  Observe port not opened: ${observer.state.error}. The Live page has a Try again button.`,
            ),
        )
      }
      server.httpServer?.once('close', () => void observer.close())
    },
  }
}
