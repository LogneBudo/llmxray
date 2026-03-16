# Services

LLMxRay compte 36 modules de services dans `src/services/`. Les services encapsulent la logique metier, la communication API et le traitement des donnees.

## Couche API

| Service | Fichier | Responsabilite |
|---|---|---|
| **OllamaClient** | `ollama-client.ts` | Client HTTP pour tous les endpoints Ollama : `/api/tags`, `/api/show`, `/api/chat`, `/api/generate`, `/api/embed`, `/v1/chat/completions` |
| **Chat Service** | `chat-service.ts` | Chat multi-tour avec boucle d'appels d'outils (max 5 tours), enregistrement du graphe de l'agent |
| **Generate Service** | `generate-service.ts` | Generation a partir d'un prompt unique avec streaming, analyse du prompt, metriques |
| **Model Service** | `model-service.ts` | Liste des modeles, analyse de l'architecture, detection des capacites |

## Streaming

| Service | Fichier | Responsabilite |
|---|---|---|
| **Stream Handler** | `stream-handler.ts` | Analyse NDJSON et SSE, extraction de tokens, detection du raisonnement, traitement des appels d'outils |
| **Reasoning Parser** | `reasoning-parser.ts` | Analyse les blocs `<think>` de DeepSeek-R1, detection de raisonnement par patterns en fallback |
| **Metrics Calculator** | `metrics-calculator.ts` | Calcule le TTFT, les tokens par seconde et le debit a partir des fragments en streaming |

## Stockage (IndexedDB)

| Service | Fichier | Responsabilite |
|---|---|---|
| **Conversation DB** | `conversation-db.ts` | CRUD pour les conversations, messages, sessions, tokens avec chargement paresseux |
| **Benchmark DB** | `benchmark-db.ts` | Persistance des resultats de benchmarks et des suites personnalisees |
| **Vector DB** | `vector-db.ts` | Stockage de chunks RAG et recherche par similarite |
| **Canvas AI DB** | `canvas-ai-db.ts` | Stockage des paires d'entrainement |
| **Message Memory DB** | `message-memory-db.ts` | Resumes de conversations et memoire |
| **Storage Estimator** | `storage-estimator.ts` | Estime l'utilisation du stockage IndexedDB et de l'origine |

## Traitement de documents

| Service | Fichier | Responsabilite |
|---|---|---|
| **Document Parser** | `document-parser.ts` | Detection de format et extraction de texte (PDF via pdfjs, DOCX via mammoth) |
| **Document Chunker** | `document-chunker.ts` | Decoupage semantique avec taille/chevauchement configurables et metadonnees |
| **RAG Pipeline** | `rag-pipeline.ts` | Ingestion de bout en bout (analyse → decoupage → embedding → stockage) et recherche |

## Systeme d'outils

| Service | Fichier | Responsabilite |
|---|---|---|
| **Tool Executor** | `tool-executor.ts` | Execute les appels d'outils, valide les parametres |
| **Tool Canvas Adapter** | `tool-canvas-adapter.ts` | Convertit les definitions d'outils du canvas au format Ollama |
| **AST Parser** | `ast-parser.ts` | Analyse de code basee sur Recast pour la synchronisation bidirectionnelle |
| **OpenAPI Parser** | `openapi-parser.ts` | Analyse les specifications OpenAPI/Swagger en definitions d'outils |
| **Code to Blocks** | `code-to-blocks.ts` | Convertit le code TypeScript en blocs executables |
| **Path to Code** | `path-to-code.ts` | Extrait le code a partir de chemins JSON |
| **Optimize Tool Code** | `optimize-tool-code.ts` | Optimisation de code assistee par l'IA |
| **Probe** | `probe.ts` | Sondage d'endpoints API et inspection des reponses |
| **Slash Command Registry** | `slash-command-registry.ts` | Enregistrement et dispatch des commandes slash |

## IA et analyse

| Service | Fichier | Responsabilite |
|---|---|---|
| **Canvas AI** | `canvas-ai.ts` | Redaction d'outils et suggestions d'amelioration assistees par l'IA |
| **Introspection Service** | `introspection-service.ts` | Genere des donnees illustratives de couches/attention a partir de l'architecture du modele |
| **Prompt Analyzer** | `prompt-analyzer.ts` | Identifie les sections du prompt (systeme, utilisateur, contexte, outils, exemples) |
| **Context Manager** | `context-manager.ts` | Construit le contexte a partir des documents RAG, de la memoire et de l'historique de conversation |
| **Benchmark Runner** | `benchmark-runner.ts` | Orchestre l'execution des benchmarks avec suivi de progression |

## Externe

| Service | Fichier | Responsabilite |
|---|---|---|
| **Google Auth** | `google-auth.ts` | Flux OAuth2 avec rafraichissement de token pour l'acces a l'API Google |
| **Feedback Service** | `feedback-service.ts` | Collecte et soumet les retours utilisateur via GitHub Issues |
| **System Info Client** | `system-info-client.ts` | Lit les informations materielles depuis le module virtuel du plugin Vite |
