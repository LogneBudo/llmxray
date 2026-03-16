# Kit Enseignants

LLMxRay est concu pour l'apprentissage. Ce kit aide les enseignants a integrer LLMxRay dans leurs cours d'IA/ML grace a des exercices de laboratoire prets a l'emploi, des guides de deploiement et des pistes d'evaluation.

## Pourquoi LLMxRay pour l'enseignement ?

| Avantage | Details |
|---|---|
| **Gratuit** | Pas de cles API, pas de couts cloud, pas d'abonnements pour les etudiants. Budget zero. |
| **Local** | Toutes les donnees restent sur la machine de l'etudiant. Aucune preoccupation de confidentialite, aucune politique de donnees institutionnelle a gerer. |
| **Visuel** | Les etudiants voient les tokens arriver en temps reel, observent la coloration de confiance et explorent les motifs d'attention. Les concepts abstraits deviennent concrets. |
| **Sur** | Aucun risque que les etudiants fassent exploser une facture cloud ou exposent des donnees sensibles. |
| **Multiplateforme** | Fonctionne sur Windows, macOS et Linux. Deploiement via npm, Docker ou git clone. |

## Integration dans les cours

LLMxRay s'integre naturellement dans :
- **Introduction a l'IA/ML** — Comprendre comment les modeles de langage generent du texte
- **Traitement du langage naturel** — Analyse de tokens, embeddings, similarite semantique
- **Genie logiciel** — Integration d'API, tool calling, prompt engineering
- **Science des donnees** — Methodologie de benchmarking, analyse statistique des sorties de modeles
- **Ethique de l'IA** — Explorer les biais des modeles a travers les resultats TruthfulQA et la detection d'hallucinations

---

## Exercices de laboratoire

### Exercice 1 : Exploration des tokens

**Objectif :** Comprendre comment la temperature affecte la sortie du modele.

**Duree :** 45 minutes

**Prerequis :** Un modele capable de dialoguer (par ex. `llama3.2`)

**Instructions :**
1. Ouvrez Chat Diagnostics et selectionnez un modele
2. Envoyez le prompt : "Write a short poem about the ocean"
3. Observez le flux de tokens — notez la coloration de confiance (vert = confiant, orange = incertain)
4. Ouvrez l'onglet Stream pour visualiser la latence inter-tokens
5. Allez dans **Compare** et configurez un Temperature Sweep (3 slots : 0.1, 0.7, 1.5)
6. Executez le meme prompt sur les trois temperatures
7. Comparez les sorties en Grid View, puis basculez en Diff View

**Questions pour les etudiants :**
- Comment la sortie evolue-t-elle a des temperatures plus elevees ?
- Quels tokens montrent une confiance plus faible a la temperature 1.5 par rapport a 0.1 ?
- La "meilleure" sortie est-elle toujours obtenue a la temperature la plus basse ? Pourquoi ou pourquoi pas ?

---

### Exercice 2 : Comparaison de modeles

**Objectif :** Analyser les compromis qualite/vitesse entre differentes tailles de modeles.

**Duree :** 60 minutes

**Prerequis :** Deux modeles de tailles differentes (par ex. `llama3.2:1b` et `llama3.2:3b`)

**Instructions :**
1. Ouvrez **Compare** et creez 2 slots, un par modele, tous deux a temperature 0.7
2. Utilisez ce prompt : "Explain how a neural network learns, in simple terms"
3. Lancez l'execution et observez le streaming cote a cote
4. Consultez la **Metrics Bar** : comparez TTFT, tokens/sec et le nombre total de tokens
5. Repetez avec un prompt plus complexe : "Write a Python function to find all prime factors of a number, then explain your approach step by step"
6. Notez les metriques pour les deux prompts

**Questions pour les etudiants :**
- Quel modele est le plus rapide ? De combien ?
- Le modele plus grand produit-il des reponses sensiblement meilleures ?
- A partir de quel point la difference de qualite justifie-t-elle le cout en vitesse ?
- Comment choisiriez-vous un modele pour un chatbot de production par rapport a un assistant de programmation ?

---

### Exercice 3 : Benchmarkez vos modeles

**Objectif :** Executer des evaluations standardisees et interpreter les resultats.

**Duree :** 90 minutes

**Prerequis :** Un ou deux modeles, suites ARC et TruthfulQA

**Instructions :**
1. Ouvrez la page **Benchmark**
2. Selectionnez un modele et lancez la suite ARC-Challenge
3. Pendant l'execution, observez la progression en direct et les resultats par question
4. Apres la fin de l'execution, analysez les resultats :
   - Precision globale
   - Ventilation par categorie (quels sujets sont les plus forts ?)
   - Distribution de confiance (la haute confiance est-elle correlee a l'exactitude ?)
5. Lancez TruthfulQA sur le meme modele
6. Comparez les graphiques radar entre les suites
7. Si le temps le permet, executez les memes suites sur un second modele

**Questions pour les etudiants :**
- Dans quelles categories le modele obtient-il les meilleurs/pires resultats ?
- Le modele est-il plus precis sur les questions "faciles" ? Verifiez les donnees de logprob.
- Comment la precision sur TruthfulQA se compare-t-elle a ARC ? Qu'est-ce que cela revele sur les differents types de connaissances ?
- Si vous deviez deployer ce modele, quelles faiblesses vous preoccuperaient le plus ?

---

### Exercice 4 : Espaces d'embedding

**Objectif :** Explorer comment les modeles representent le sens sous forme de vecteurs.

**Duree :** 45 minutes

**Prerequis :** Un modele d'embedding (par ex. `nomic-embed-text`)

**Instructions :**
1. Ouvrez la page **Embeddings**
2. Generez les embeddings de ces trois phrases individuellement :
   - "The cat sat on the mat"
   - "A feline rested on the rug"
   - "The stock market crashed today"
3. Comparez la phrase 1 et la phrase 2 (la similarite devrait etre elevee)
4. Comparez la phrase 1 et la phrase 3 (la similarite devrait etre faible)
5. Observez les scores de similarite cosinus
6. Testez maintenant des cas limites :
   - "I love this movie" vs "I hate this movie" (meme sujet, sentiment oppose)
   - "Bank of the river" vs "Bank account" (meme mot, sens different)

**Questions pour les etudiants :**
- Pourquoi "cat/mat" et "feline/rug" sont-ils similaires malgre des mots differents ?
- Le modele capture-t-il les differences de sentiment ? Que dit le score de similarite ?
- Comment l'ambiguite lexicale ("bank") affecte-t-elle la similarite des embeddings ?
- Comment ces embeddings seraient-ils utiles pour un moteur de recherche ?

---

### Exercice 5 : Construire un outil

**Objectif :** Creer un outil personnalise qu'un modele de langage peut appeler.

**Duree :** 60 minutes

**Prerequis :** Un modele compatible avec le tool calling (verifiez le badge dans le Model Browser)

**Instructions :**
1. Ouvrez le **Tool Workshop**
2. Partez du template "Calculator" pour comprendre le format
3. Creez un nouvel outil a partir de zero :
   - **Nom :** `word_count`
   - **Description :** "Count the number of words in a given text"
   - **Parametres :** `text` (string, requis)
   - **Implementation :** Ecrivez la fonction JavaScript
4. Visualisez le JSON Schema genere automatiquement
5. Retournez dans Chat Diagnostics et demandez : "How many words are in the sentence: The quick brown fox jumps over the lazy dog?"
6. Observez l'appel d'outil dans l'onglet **Tools**

**Questions pour les etudiants :**
- Comment le modele decide-t-il d'appeler un outil plutot que de repondre directement ?
- Que se passe-t-il si la description de l'outil est vague ?
- Que se passe-t-il si vous modifiez la description pour la rendre trompeuse ?
- Pourquoi le JSON Schema est-il important pour le modele ?

---

### Exercice 6 : Curation de donnees d'entrainement

**Objectif :** Constituer un petit jeu de donnees curate a partir d'interactions avec l'IA.

**Duree :** 60 minutes

**Prerequis :** LLMxRay avec quelques sessions de chat prealables

**Instructions :**
1. Utilisez Chat Diagnostics pour mener 5 a 10 conversations sur un sujet precis (par ex. "Explain Python concepts")
2. Ouvrez la page **AI Training**
3. Passez en revue les paires d'entrainement collectees
4. Pour chaque paire, decidez : Accepter (bonne reponse), Rejeter (mauvaise reponse) ou Editer (reponse ameliorable)
5. Etiquetez les paires acceptees par sous-theme (par ex. "loops", "functions", "classes")
6. Exportez le jeu de donnees curate
7. Examinez le format d'export

**Questions pour les etudiants :**
- Qu'est-ce qui distingue une "bonne" paire d'entrainement d'une "mauvaise" ?
- Comment ce jeu de donnees serait-il utilise pour fine-tuner un modele ?
- Quels biais pourraient exister dans vos donnees curatees ?
- Combien de paires faudrait-il pour un fine-tuning significatif ?

---

## Configuration materielle

### Minimum (petits modeles uniquement)
- **RAM :** 8 Go
- **Stockage :** 10 Go disponibles
- **GPU :** Non requis (l'inference CPU fonctionne)
- **Modeles :** Modeles de 1B a 3B parametres (par ex. `llama3.2:1b`)

### Recommande (pour tous les exercices)
- **RAM :** 16 Go
- **Stockage :** 20 Go disponibles
- **GPU :** 6+ Go de VRAM (inference sensiblement plus rapide)
- **Modeles :** Jusqu'a 7B-8B parametres

### Configuration en salle informatique
- **Installation par etudiant :** Chaque machine execute Ollama + LLMxRay de maniere independante
- **Serveur Ollama partage :** Une machine puissante execute Ollama, les etudiants s'y connectent via les parametres LLMxRay (modifier l'URL Ollama). Necessite un acces reseau sur le port 11434.
- **Deploiement Docker :** Utilisez `docker compose` pour des environnements homogenes :

```bash
docker compose -f docker-compose.example.yml up
```

## Pistes d'evaluation

| Exercice | Methode d'evaluation |
|---|---|
| Exploration des tokens | Rapport ecrit comparant les effets de la temperature avec captures d'ecran |
| Comparaison de modeles | Tableau de donnees avec metriques + analyse de 500 mots |
| Benchmark | Presentation de diapositives avec graphiques radar |
| Espaces d'embedding | Notebook Jupyter avec matrices de similarite et analyse |
| Construire un outil | Demonstration en direct de l'outil fonctionnel + revue de code |
| Donnees d'entrainement | Jeu de donnees exporte + reflexion sur les choix de curation |

## Obtenir de l'aide

- **[GitHub Discussions](https://github.com/LogneBudo/llmxray/discussions/categories/help)** — Posez vos questions dans la categorie Help
- **[Documentation](https://lognebudo.github.io/llmxray/docs/en/guide/)** — Guide utilisateur complet avec presentation des fonctionnalites
- **[Rapports de bugs](https://github.com/LogneBudo/llmxray/issues/new?template=bug-report.yml)** — Signalez les problemes avec nos modeles structures

---

*Vous utilisez LLMxRay dans votre cours ? Nous aimerions en entendre parler. Ouvrez une [discussion Model Insights](https://github.com/LogneBudo/llmxray/discussions/categories/model-insights) et partagez votre experience.*
