# Installation

## Prerequis

1. **Node.js 18+** -- [Telecharger](https://nodejs.org)
2. **Ollama** en cours d'execution localement -- [Telecharger](https://ollama.com/download)
3. Au moins un modele telecharge :

```bash
ollama pull llama3.2
```

::: tip Premier modele recommande
`llama3.2` est un excellent point de depart -- rapide, performant et suffisamment leger pour fonctionner sur la plupart des configurations. Pour les fonctionnalites de raisonnement, essayez aussi `deepseek-r1`.
:::

## Installer et lancer

```bash
git clone https://github.com/LogneBudo/llmxray.git
cd llmxray
npm install
npm run dev
```

Ouvrez **http://localhost:5173** dans votre navigateur. C'est tout.

## Fonctionnement du proxy

Le serveur de developpement de LLMxRay redirige automatiquement les appels API vers Ollama :

| Prefixe d'URL | Redirige vers |
|---|---|
| `/api/*` | `http://localhost:11434/api/*` |
| `/v1/*` | `http://localhost:11434/v1/*` |

Si Ollama tourne sur un autre port ou une autre machine, modifiez l'URL dans **Parametres > Connexion**.

## Build de production

```bash
npm run build    # Verification de types + build de production → dist/
npm run preview  # Previsualisation locale du build
```

Le dossier `dist/` contient un site statique que vous pouvez servir depuis n'importe quel serveur web.

## Verifier la connexion

Apres avoir lance l'application, regardez le coin superieur droit de l'en-tete :

- **Indicateur vert** + "Connected" -- Ollama est accessible
- **Indicateur rouge** + "Disconnected" -- Verifiez que `ollama serve` est en cours d'execution

Vous pouvez aussi aller dans les **Parametres** et cliquer sur le bouton de test de connexion.

## Telecharger d'autres modeles

```bash
# Modeles de chat
ollama pull llama3.2
ollama pull mistral
ollama pull deepseek-r1       # Modele de raisonnement avec blocs <think>

# Modeles d'embedding (pour la Base de Connaissances et le Labo Plongements)
ollama pull nomic-embed-text
ollama pull all-minilm

# Modeles de vision (pour les images jointes dans le chat)
ollama pull llava
```

LLMxRay detecte automatiquement les capacites des modeles (raisonnement, vision, embedding, appel d'outils) et adapte l'interface en consequence.
