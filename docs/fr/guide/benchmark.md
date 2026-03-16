# Benchmark

La page Benchmark execute des evaluations standardisees sur vos modeles locaux en utilisant de vrais logprobs de tokens, vous fournissant des donnees de performance objectives.

**Element de la barre laterale :** Benchmark
**Route :** `/benchmark`

![Interface Benchmark](/screenshots/benchmark.png)

## Qu'est-ce que le Benchmark Chirurgical ?

Contrairement aux benchmarks classiques qui verifient simplement si la reponse est correcte, le Benchmark Chirurgical de LLMxRay capture de **vrais logprobs de tokens** via le endpoint compatible OpenAI d'Ollama (`/v1/chat/completions`). Cela vous donne des donnees de confiance authentiques pour chaque reponse, et pas seulement la precision.

## Suites de tests integrees

| Suite | Questions | Ce qu'elle evalue |
|---|---|---|
| **ARC** | Raisonnement scientifique | Questions de sciences niveau college |
| **GSM8K** | Problemes mathematiques | Raisonnement arithmetique en plusieurs etapes |
| **HellaSwag** | Completion de phrases | Raisonnement de bon sens |
| **MMLU-Pro** | Multi-disciplines | Connaissances academiques larges dans differents domaines |
| **TruthfulQA** | Veracite | Resistance aux idees recues erronees |

## Lancer un benchmark

1. Selectionnez un **modele** dans le menu deroulant.
2. Choisissez une ou plusieurs **suites de tests**.
3. Cliquez sur **Lancer**. Le benchmark diffuse les resultats en temps reel.

Pendant l'execution, vous pouvez voir :
- **Progression en direct** -- Nombre de questions, precision actuelle
- **Resultats par question** -- Correct/incorrect, reponse du modele, scores de confiance
- **Donnees de latence** -- TTFT et tokens/sec par question

## Modeles de raisonnement

Pour les modeles de raisonnement comme DeepSeek-R1, le benchmark utilise des **budgets de tokens dynamiques** -- accordant au modele plus de tokens pour ses blocs `<think>` sans les compter dans la reponse. Cela garantit que les modeles de raisonnement ne sont pas penalises pour avoir montre leur cheminement.

## Visualisation des resultats

Apres completion, les resultats sont affiches sous forme de :

- **Score de precision** -- Pourcentage global de bonnes reponses
- **Detail par categorie** -- Precision par domaine au sein de chaque suite
- **Graphique radar** -- Comparaison visuelle entre les categories
- **Distribution de confiance** -- Histogramme des scores de confiance bases sur les logprobs

## Comparer les resultats

Lancez la meme suite sur plusieurs modeles pour comparer :
- Quel modele est le plus precis sur quels sujets
- Calibration de la confiance -- une confiance elevee correspond-elle a des reponses correctes ?
- Compromis vitesse vs. precision

Les resultats sont stockes dans IndexedDB, ce qui vous permet de comparer entre les sessions.

## Suites personnalisees

Cliquez sur **Importer** pour charger une suite de benchmark personnalisee. Le format attendu est un fichier JSON contenant :
- Nom et description de la suite
- Tableau de questions, chacune avec : texte de la question, choix de reponses, index de la reponse correcte et categorie optionnelle

## Astuces

- **Les logprobs necessitent le endpoint `/v1`** -- Cela utilise l'API compatible OpenAI d'Ollama, et non le endpoint natif `/api`.
- **Commencez par des suites plus petites** -- Demarrez avec un sous-ensemble pour estimer la duree d'une execution complete.
- **Reprise possible** -- Si un benchmark est interrompu, vous pouvez reprendre la ou il s'est arrete.
- **Comparer les quantifications** -- Lancez le meme modele en Q4 et Q8 pour mesurer l'impact sur la precision.
