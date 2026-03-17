# Tests

LLMxRay utilise **Vitest** pour les tests unitaires et **Playwright** pour les tests de bout en bout (E2E).

## Commandes de test

| Commande | Description |
|---|---|
| `npm run test` | Exécuter les tests unitaires une fois |
| `npm run test:watch` | Exécuter les tests unitaires en mode surveillance |
| `npm run test:coverage` | Exécuter les tests unitaires avec rapport de couverture |
| `npm run test:e2e` | Exécuter les tests E2E (Chromium headless) |
| `npm run test:e2e:headed` | Exécuter les tests E2E avec navigateur visible |
| `npm run test:e2e:ui` | Exécuter les tests E2E avec l'interface Playwright |
| `npm run test:e2e:live` | Exécuter les tests E2E contre Ollama en direct |
| `npm run test:e2e:live:headed` | Tests Ollama en direct avec navigateur visible |
| `npm run test:e2e:all` | Exécuter tous les projets de tests E2E |

## Tests unitaires (Vitest)

### Configuration

**Fichier :** `vitest.config.ts`

```typescript
{
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
}
```

- **Environnement :** `happy-dom` — Une implémentation DOM légère pour tester les composants Vue
- **Globals :** `true` — Rend `describe`, `it`, `expect` disponibles sans import
- **Fichiers de test :** `src/**/*.test.ts` — Co-localisés avec les fichiers source

### Écrire des tests unitaires

Placez les fichiers de test à côté du code qu'ils testent :

```
src/services/
  reasoning-parser.ts
  reasoning-parser.test.ts
```

Exemple de test :

```typescript
import { describe, it, expect } from 'vitest'
import { parseThinkBlocks } from './reasoning-parser'

describe('parseThinkBlocks', () => {
  it('extracts think block content', () => {
    const input = '<think>reasoning here</think>answer'
    const result = parseThinkBlocks(input)
    expect(result.steps).toHaveLength(1)
    expect(result.steps[0].content).toBe('reasoning here')
  })
})
```

## Tests de bout en bout (Playwright)

### Configuration

**Fichier :** `playwright.config.ts`

Deux projets de test :

#### chromium (par défaut)
- Exécute tous les tests **sauf** les spécifications `live-ollama`
- Utilise un serveur de développement Vite sur le port 5199
- Pas d'Ollama requis — les tests simulent les réponses API

#### live-ollama
- Exécute uniquement `live-ollama.spec.ts`
- Nécessite une instance Ollama en cours d'exécution avec des modèles
- Timeout : 120 secondes par test (le chargement du modèle peut être lent)

### Répertoire de tests

```
e2e/
  example.spec.ts        # Tests de base de l'application
  live-ollama.spec.ts    # Tests nécessitant un Ollama réel
```

### Écrire des tests E2E

```typescript
import { test, expect } from '@playwright/test'

test('dashboard loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Chat Diagnostics')).toBeVisible()
})
```

### Exécuter contre Ollama en direct

Le projet `live-ollama` teste des interactions réelles avec le modèle :

```bash
# Assurez-vous qu'Ollama fonctionne avec au moins un modèle
ollama serve
ollama pull llama3.2

# Exécuter les tests en direct
npm run test:e2e:live
```

## Avant de soumettre

Exécutez toujours les deux suites de tests avant de soumettre une PR :

```bash
npm run test          # Les tests unitaires passent
npm run build         # Vérification des types + build réussi
npm run test:e2e      # Les tests E2E passent (pas d'Ollama requis)
```
