# Services

LLMxRay compte 36 modules de services dans `src/services/`. Les services encapsulent la logique métier, la communication API et le traitement des données.

## Couche API

| Service | Fichier | Responsabilité |
|---|---|---|
| **OllamaClient** | `ollama-client.ts` | Client HTTP pour tous les endpoints Ollama : `/api/tags`, `/api/show`, `/api/chat`, `/api/generate`, `/api/embed`, `/v1/chat/completions` |
| **Chat Service** | `chat-service.ts` | Chat multi-tour avec boucle d'appels d'outils (max 5 tours), enregistrement du graphe de l'agent |
| **Generate Service** | `generate-service.ts` | Génération à partir d'un prompt unique avec streaming, analyse du prompt, métriques |
| **Model Service** | `model-service.ts` | Liste des modèles, analyse de l'architecture, détection des capacités |

## Streaming

| Service | Fichier | Responsabilité |
|---|---|---|
| **Stream Handler** | `stream-handler.ts` | Analyse NDJSON et SSE, extraction de tokens, détection du raisonnement, traitement des appels d'outils |
| **Reasoning Parser** | `reasoning-parser.ts` | Analyse les blocs `<think>` de DeepSeek-R1, détection de raisonnement par patterns en fallback |
| **Metrics Calculator** | `metrics-calculator.ts` | Calcule le TTFT, les tokens par seconde et le débit à partir des fragments en streaming |

## Stockage (IndexedDB)

| Service | Fichier | Responsabilité |
|---|---|---|
| **Conversation DB** | `conversation-db.ts` | CRUD pour les conversations, messages, sessions, tokens avec chargement paresseux |
| **Benchmark DB** | `benchmark-db.ts` | Persistance des résultats de benchmarks et des suites personnalisées |
| **Vector DB** | `vector-db.ts` | Stockage de chunks RAG et recherche par similarité |
| **Canvas AI DB** | `canvas-ai-db.ts` | Stockage des paires d'entraînement |
| **Message Memory DB** | `message-memory-db.ts` | Résumés de conversations et mémoire |
| **Storage Estimator** | `storage-estimator.ts` | Estime l'utilisation du stockage IndexedDB et de l'origine |

## Traitement de documents

| Service | Fichier | Responsabilité |
|---|---|---|
| **Document Parser** | `document-parser.ts` | Détection de format et extraction de texte (PDF via pdfjs, DOCX via mammoth) |
| **Document Chunker** | `document-chunker.ts` | Découpage sémantique avec taille/chevauchement configurables et métadonnées |
| **RAG Pipeline** | `rag-pipeline.ts` | Ingestion de bout en bout (analyse → découpage → embedding → stockage) et recherche |

## Système d'outils

| Service | Fichier | Responsabilité |
|---|---|---|
| **Tool Executor** | `tool-executor.ts` | Exécute les appels d'outils, valide les paramètres |
| **Tool Canvas Adapter** | `tool-canvas-adapter.ts` | Convertit les définitions d'outils du canvas au format Ollama |
| **AST Parser** | `ast-parser.ts` | Analyse de code basée sur Recast pour la synchronisation bidirectionnelle |
| **OpenAPI Parser** | `openapi-parser.ts` | Analyse les spécifications OpenAPI/Swagger en définitions d'outils |
| **Code to Blocks** | `code-to-blocks.ts` | Convertit le code TypeScript en blocs exécutables |
| **Path to Code** | `path-to-code.ts` | Extrait le code à partir de chemins JSON |
| **Optimize Tool Code** | `optimize-tool-code.ts` | Optimisation de code assistée par l'IA |
| **Probe** | `probe.ts` | Sondage d'endpoints API et inspection des réponses |
| **Slash Command Registry** | `slash-command-registry.ts` | Enregistrement et dispatch des commandes slash |

## IA et analyse

| Service | Fichier | Responsabilité |
|---|---|---|
| **Canvas AI** | `canvas-ai.ts` | Rédaction d'outils et suggestions d'amélioration assistées par l'IA |
| **Introspection Service** | `introspection-service.ts` | Génère des données illustratives de couches/attention à partir de l'architecture du modèle |
| **Prompt Analyzer** | `prompt-analyzer.ts` | Identifie les sections du prompt (système, utilisateur, contexte, outils, exemples) |
| **Context Manager** | `context-manager.ts` | Construit le contexte à partir des documents RAG, de la mémoire et de l'historique de conversation |
| **Benchmark Runner** | `benchmark-runner.ts` | Orchestre l'exécution des benchmarks avec suivi de progression |

## Externe

| Service | Fichier | Responsabilité |
|---|---|---|
| **Google Auth** | `google-auth.ts` | Flux OAuth2 avec rafraîchissement de token pour l'accès à l'API Google |
| **Feedback Service** | `feedback-service.ts` | Collecte et soumet les retours utilisateur via GitHub Issues |
| **System Info Client** | `system-info-client.ts` | Lit les informations matérielles depuis le module virtuel du plugin Vite |
