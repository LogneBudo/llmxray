# Kit Enseignants

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04)); border-left: 4px solid #a855f7; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">

**Un programme progressif pour enseigner l'IA/ML avec des modèles locaux.**

8 modules. De "Qu'est-ce qu'un token ?" à "J'ai contribué à de la vraie recherche en IA."
Gratuit. Local. Visuel. Aucun coût cloud. Aucune clé API pour les étudiants.

</div>

## Pourquoi LLMxRay pour l'enseignement ?

| Avantage | Détails |
|---|---|
| **Gratuit** | Pas de clés API, pas de coûts cloud, pas d'abonnements étudiants. Zéro budget nécessaire. |
| **Local** | Toutes les données restent sur la machine de l'étudiant. Aucun souci de confidentialité, aucune politique institutionnelle de données. |
| **Visuel** | Les étudiants voient les tokens arriver en temps réel, observent la coloration de confiance, explorent les chaînes de raisonnement. Les concepts abstraits deviennent tangibles. |
| **Sûr** | Aucun risque que les étudiants génèrent accidentellement des coûts cloud ou exposent des données sensibles. |
| **Multiplateforme** | Fonctionne sur Windows, macOS et Linux. Déploiement via `npx llmxray`, Docker ou git clone. |
| **Prêt pour la recherche** | Chaque expérience est reproductible. Les étudiants contribuent de véritables résultats à la communauté open-source. |

## Intégration dans les cours

LLMxRay s'intègre naturellement dans :
- **Introduction à l'IA/ML** — Comprendre comment les modèles de langage génèrent du texte
- **Traitement du langage naturel** — Analyse de tokens, embeddings, similarité sémantique
- **Génie logiciel** — Intégration d'API, tool calling, prompt engineering
- **Science des données** — Méthodologie de benchmark, analyse statistique des sorties de modèles
- **Éthique de l'IA** — Exploration des biais des modèles, détection des hallucinations, équité linguistique

---

## Le programme

### Le parcours : Observer → Mesurer → Questionner → Découvrir → Construire → Contribuer

Chaque module s'appuie sur le précédent. Les étudiants progressent de l'observation à l'expérimentation, puis à la recherche originale.

| Module | Titre | Durée | Difficulté | Le Moment Eureka |
|---|---|---|---|---|
| **1** | [Qu'est-ce qu'un token ?](./module-1) | 45 min | Débutant | L'IA ne pense pas en mots — elle pense en tokens |
| **2** | [Comment fonctionne la Température ?](./module-2) | 60 min | Débutant | La température n'est pas un curseur linéaire — c'est une transition de phase |
| **3** | [L'IA peut-elle mentir ?](./module-3) | 90 min | Intermédiaire | Une confiance élevée ne signifie pas la vérité |
| **4** | [Que voit le modèle ?](./module-4) | 45 min | Intermédiaire | Les embeddings capturent le sujet, pas le sentiment |
| **5** | Quand le modèle oublie-t-il ? | 60 min | Intermédiaire | Le contexte n'est pas de la mémoire — c'est une fenêtre glissante |
| **6** | L'IA peut-elle utiliser des outils ? | 60 min | Intermédiaire | Le tool calling est du pattern matching, pas de la compréhension |
| **7** | Comment comparer les modèles ? | 90 min | Avancé | Aucun modèle n'est universellement le meilleur |
| **8** | La vue d'ensemble | 120 min | Avancé | Vous pouvez contribuer à de la vraie recherche en IA |

::: info Modules disponibles
Les Modules 1 à 4 sont disponibles dès maintenant. Les Modules 5 à 8 arrivent prochainement. Chaque module contient des exercices pratiques avec LLMxRay, un contexte conceptuel ancré dans la recherche publiée, et des options d'évaluation.
:::

---

## Ateliers rapides "Moment Eureka"

Exercices autonomes de 15 minutes pour n'importe quel cours — aucun engagement dans le programme requis :

| Atelier | La surprise | Durée |
|---|---|---|
| L'atelier hallucination | Les modèles inventent de l'histoire avec assurance | 15 min |
| Le biais du tokenizer | La même phrase, 5x plus de tokens dans certaines langues | 15 min |
| Le test du perroquet | Les modèles ne peuvent pas répéter un texte mot pour mot — ils génèrent, ils ne rappellent pas | 15 min |
| La fuite du prompt système | Les étudiants extraient un prompt système "secret" | 15 min |
| La galerie d'art de la température | Le même prompt à 8 températures affiché sous forme de galerie | 15 min |
| La révélation du raisonnement | Observez DeepSeek-R1 raisonner étape par étape sur un problème de mathématiques | 15 min |

*Les guides détaillés de ces ateliers arrivent prochainement.*

---

## Configuration matérielle requise

### Minimum (petits modèles uniquement)
- **RAM :** 8 Go
- **Stockage :** 10 Go libres
- **GPU :** Non requis (l'inférence CPU fonctionne)
- **Modèles :** Modèles de 1B à 3B paramètres (ex. `llama3.2:1b`)

### Recommandé (pour tous les modules)
- **RAM :** 16 Go
- **Stockage :** 20 Go libres
- **GPU :** 6+ Go de VRAM (inférence nettement plus rapide)
- **Modèles :** Jusqu'à des modèles de 7B-8B paramètres

### Installation en salle informatique

**Option A — Installation par étudiant :**
Chaque machine exécute Ollama + LLMxRay de manière indépendante.

```bash
# Sur chaque machine :
ollama pull llama3.2
npx llmxray
```

**Option B — Serveur Ollama partagé :**
Une machine puissante exécute Ollama, les étudiants se connectent via les paramètres de LLMxRay.

```bash
# Sur le serveur GPU :
OLLAMA_HOST=0.0.0.0 ollama serve

# Sur chaque machine étudiante :
npx llmxray --ollama-url http://gpu-server:11434
```

**Option C — Déploiement Docker :**

```bash
docker compose -f docker-compose.example.yml up
```

---

## Options d'évaluation

Chaque module propose plusieurs formats d'évaluation. Choisissez en fonction de votre cours :

| Format | Idéal pour | Module type |
|---|---|---|
| Réflexion écrite (300 mots) | Individuel, tout niveau de cours | Modules 1, 4, 5 |
| Tableau d'analyse de données + rapport | Cours de science des données, NLP | Modules 2, 3, 7 |
| Diaporama / présentation | Travail en groupe, séminaires | Modules 3, 7 |
| Démo en direct + revue de code | Génie logiciel | Module 6 |
| Rapport de recherche complet | Avancé / projet de fin d'études | Module 8 |

---

## Obtenir de l'aide

- **[GitHub Discussions — Aide](https://github.com/LogneBudo/llmxray/discussions/categories/help)** — Posez vos questions sur l'installation ou l'utilisation
- **[Documentation](https://lognebudo.github.io/llmxray/docs/fr/guide/)** — Guide utilisateur complet
- **[Rapports de bugs](https://github.com/LogneBudo/llmxray/issues/new?template=bug-report.yml)** — Signalez des problèmes avec les modèles structurés

---

*Vous utilisez LLMxRay dans votre cours ? Nous aimerions en entendre parler. Partagez votre expérience dans les [GitHub Discussions](https://github.com/LogneBudo/llmxray/discussions/categories/show-and-tell).*
