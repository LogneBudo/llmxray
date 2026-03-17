# Kit Enseignants

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04)); border-left: 4px solid #a855f7; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">

**Un programme progressif pour enseigner l'IA/ML avec des modeles locaux.**

8 modules. De "Qu'est-ce qu'un token ?" a "J'ai contribue a de la vraie recherche en IA."
Gratuit. Local. Visuel. Aucun cout cloud. Aucune cle API pour les etudiants.

</div>

## Pourquoi LLMxRay pour l'enseignement ?

| Avantage | Details |
|---|---|
| **Gratuit** | Pas de cles API, pas de couts cloud, pas d'abonnements etudiants. Zero budget necessaire. |
| **Local** | Toutes les donnees restent sur la machine de l'etudiant. Aucun souci de confidentialite, aucune politique institutionnelle de donnees. |
| **Visuel** | Les etudiants voient les tokens arriver en temps reel, observent la coloration de confiance, explorent les chaines de raisonnement. Les concepts abstraits deviennent tangibles. |
| **Sur** | Aucun risque que les etudiants generent accidentellement des couts cloud ou exposent des donnees sensibles. |
| **Multiplateforme** | Fonctionne sur Windows, macOS et Linux. Deploiement via `npx llmxray`, Docker ou git clone. |
| **Pret pour la recherche** | Chaque experience est reproductible. Les etudiants contribuent de veritables resultats a la communaute open-source. |

## Integration dans les cours

LLMxRay s'integre naturellement dans :
- **Introduction a l'IA/ML** — Comprendre comment les modeles de langage generent du texte
- **Traitement du langage naturel** — Analyse de tokens, embeddings, similarite semantique
- **Genie logiciel** — Integration d'API, tool calling, prompt engineering
- **Science des donnees** — Methodologie de benchmark, analyse statistique des sorties de modeles
- **Ethique de l'IA** — Exploration des biais des modeles, detection des hallucinations, equite linguistique

---

## Le programme

### Le parcours : Observer → Mesurer → Questionner → Decouvrir → Construire → Contribuer

Chaque module s'appuie sur le precedent. Les etudiants progressent de l'observation a l'experimentation, puis a la recherche originale.

| Module | Titre | Duree | Difficulte | Le Moment Eureka |
|---|---|---|---|---|
| **1** | [Qu'est-ce qu'un token ?](./module-1) | 45 min | Debutant | L'IA ne pense pas en mots — elle pense en tokens |
| **2** | Comment fonctionne la temperature ? | 60 min | Debutant | La temperature n'est pas un curseur lineaire — c'est une transition de phase |
| **3** | L'IA peut-elle mentir ? | 90 min | Intermediaire | Une confiance elevee ne signifie pas la verite |
| **4** | Que voit le modele ? | 45 min | Intermediaire | Les embeddings capturent le sujet, pas le sentiment |
| **5** | Quand le modele oublie-t-il ? | 60 min | Intermediaire | Le contexte n'est pas de la memoire — c'est une fenetre glissante |
| **6** | L'IA peut-elle utiliser des outils ? | 60 min | Intermediaire | Le tool calling est du pattern matching, pas de la comprehension |
| **7** | Comment comparer les modeles ? | 90 min | Avance | Aucun modele n'est universellement le meilleur |
| **8** | La vue d'ensemble | 120 min | Avance | Vous pouvez contribuer a de la vraie recherche en IA |

::: info Modules disponibles
Le Module 1 est disponible des maintenant. Les Modules 2 a 8 arrivent prochainement. Chaque module contient des exercices pratiques avec LLMxRay, un contexte conceptuel ancre dans la recherche publiee, et des options d'evaluation.
:::

---

## Ateliers rapides "Moment Eureka"

Exercices autonomes de 15 minutes pour n'importe quel cours — aucun engagement dans le programme requis :

| Atelier | La surprise | Duree |
|---|---|---|
| L'atelier hallucination | Les modeles inventent de l'histoire avec assurance | 15 min |
| Le biais du tokenizer | La meme phrase, 5x plus de tokens dans certaines langues | 15 min |
| Le test du perroquet | Les modeles ne peuvent pas repeter un texte mot pour mot — ils generent, ils ne rappellent pas | 15 min |
| La fuite du prompt systeme | Les etudiants extraient un prompt systeme "secret" | 15 min |
| La galerie d'art de la temperature | Le meme prompt a 8 temperatures affiche sous forme de galerie | 15 min |
| La revelation du raisonnement | Observez DeepSeek-R1 raisonner etape par etape sur un probleme de mathematiques | 15 min |

*Les guides detailles de ces ateliers arrivent prochainement.*

---

## Configuration materielle requise

### Minimum (petits modeles uniquement)
- **RAM :** 8 Go
- **Stockage :** 10 Go libres
- **GPU :** Non requis (l'inference CPU fonctionne)
- **Modeles :** Modeles de 1B a 3B parametres (ex. `llama3.2:1b`)

### Recommande (pour tous les modules)
- **RAM :** 16 Go
- **Stockage :** 20 Go libres
- **GPU :** 6+ Go de VRAM (inference nettement plus rapide)
- **Modeles :** Jusqu'a des modeles de 7B-8B parametres

### Installation en salle informatique

**Option A — Installation par etudiant :**
Chaque machine execute Ollama + LLMxRay de maniere independante.

```bash
# Sur chaque machine :
ollama pull llama3.2
npx llmxray
```

**Option B — Serveur Ollama partage :**
Une machine puissante execute Ollama, les etudiants se connectent via les parametres de LLMxRay.

```bash
# Sur le serveur GPU :
OLLAMA_HOST=0.0.0.0 ollama serve

# Sur chaque machine etudiante :
npx llmxray --ollama-url http://gpu-server:11434
```

**Option C — Deploiement Docker :**

```bash
docker compose -f docker-compose.example.yml up
```

---

## Options d'evaluation

Chaque module propose plusieurs formats d'evaluation. Choisissez en fonction de votre cours :

| Format | Ideal pour | Module type |
|---|---|---|
| Reflexion ecrite (300 mots) | Individuel, tout niveau de cours | Modules 1, 4, 5 |
| Tableau d'analyse de donnees + rapport | Cours de science des donnees, NLP | Modules 2, 3, 7 |
| Diaporama / presentation | Travail en groupe, seminaires | Modules 3, 7 |
| Demo en direct + revue de code | Genie logiciel | Module 6 |
| Rapport de recherche complet | Avance / projet de fin d'etudes | Module 8 |

---

## Obtenir de l'aide

- **[GitHub Discussions — Aide](https://github.com/LogneBudo/llmxray/discussions/categories/help)** — Posez vos questions sur l'installation ou l'utilisation
- **[Documentation](https://lognebudo.github.io/llmxray/docs/fr/guide/)** — Guide utilisateur complet
- **[Rapports de bugs](https://github.com/LogneBudo/llmxray/issues/new?template=bug-report.yml)** — Signalez des problemes avec les modeles structures

---

*Vous utilisez LLMxRay dans votre cours ? Nous aimerions en entendre parler. Partagez votre experience dans les [GitHub Discussions](https://github.com/LogneBudo/llmxray/discussions/categories/show-and-tell).*
