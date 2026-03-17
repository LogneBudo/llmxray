# Installation

## Prérequis

1. **Node.js 18+** -- [Télécharger](https://nodejs.org)
2. **Ollama** en cours d'exécution localement -- [Télécharger](https://ollama.com/download)
3. Au moins un modèle téléchargé :

```bash
ollama pull llama3.2
```

::: tip Premier modèle recommandé
`llama3.2` est un excellent point de départ -- rapide, performant et suffisamment léger pour fonctionner sur la plupart des configurations. Pour les fonctionnalités de raisonnement, essayez aussi `deepseek-r1`.
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

Le serveur de développement de LLMxRay redirige automatiquement les appels API vers Ollama :

| Préfixe d'URL | Redirige vers |
|---|---|
| `/api/*` | `http://localhost:11434/api/*` |
| `/v1/*` | `http://localhost:11434/v1/*` |

Si Ollama tourne sur un autre port ou une autre machine, modifiez l'URL dans **Paramètres > Connexion**.

## Build de production

```bash
npm run build    # Vérification de types + build de production → dist/
npm run preview  # Prévisualisation locale du build
```

Le dossier `dist/` contient un site statique que vous pouvez servir depuis n'importe quel serveur web.

## Vérifier la connexion

Après avoir lancé l'application, regardez le coin supérieur droit de l'en-tête :

- **Indicateur vert** + "Connected" -- Ollama est accessible
- **Indicateur rouge** + "Disconnected" -- Vérifiez que `ollama serve` est en cours d'exécution

Vous pouvez aussi aller dans les **Paramètres** et cliquer sur le bouton de test de connexion.

## Télécharger d'autres modèles

```bash
# Modèles de chat
ollama pull llama3.2
ollama pull mistral
ollama pull deepseek-r1       # Modèle de raisonnement avec blocs <think>

# Modèles d'embedding (pour la Base de Connaissances et le Labo Plongements)
ollama pull nomic-embed-text
ollama pull all-minilm

# Modèles de vision (pour les images jointes dans le chat)
ollama pull llava
```

LLMxRay détecte automatiquement les capacités des modèles (raisonnement, vision, embedding, appel d'outils) et adapte l'interface en conséquence.
