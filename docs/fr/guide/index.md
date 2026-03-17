# Introduction

**LLMxRay** est un tableau de bord gratuit et local-first qui se connecte à [Ollama](https://ollama.com) sur votre machine. Il vous permet de discuter avec n'importe quel modèle téléchargé puis d'inspecter tout ce qui s'est passé en coulisses : la vitesse d'arrivée de chaque token, ce que le modèle a pu "penser", comment différents paramètres modifient la sortie, et bien plus encore.

**Pas de cloud. Pas de clés API. Aucun coût.** Tout s'exécute sur votre matériel.

## À qui s'adresse LLMxRay ?

| Vous êtes... | LLMxRay vous aide à... |
|---|---|
| **Débutant curieux** | Voir les réponses de l'IA se former en temps réel et comprendre ce que signifient vraiment "température" ou "tokens" |
| **Étudiant / enseignant** | Explorer visuellement le comportement des modèles -- idéal pour les cours et démonstrations en IA/ML |
| **Développeur** | Déboguer les prompts, comparer les modèles, profiler la latence, inspecter les appels d'outils |
| **Chercheur** | Mener des expériences contrôlées : même prompt, paramètres différents, résultats côté à côté |

## Navigation dans l'application

LLMxRay dispose d'une barre latérale avec 10 éléments de navigation, chacun représentant une fonctionnalité majeure. Ce guide comporte un chapitre par élément, dans l'ordre exact d'apparition dans la barre latérale :

1. **[Diagnostics de Chat](./chat-diagnostics)** -- L'interface de chat principale avec streaming et analyse de session
2. **[Comparer](./compare)** -- Comparaison côté à côté de modèles et de paramètres
3. **[Plongements](./embeddings)** -- Visualisation d'embeddings textuels et similarité
4. **[Base de Connaissances](./knowledge-base)** -- Téléchargement de documents, découpage et recherche RAG
5. **[Atelier d'Outils](./tool-workshop)** -- Constructeur visuel d'outils avec synchronisation du code
6. **[Entraînement IA](./ai-training)** -- Curation et export de données d'entraînement
7. **[Modèles](./models)** -- Navigateur de modèles et détection des capacités
8. **[Benchmark](./benchmark)** -- Évaluation standardisée des modèles avec logprobs
9. **[Mon Système](./system)** -- Détection du matériel et statut d'Ollama
10. **[Paramètres](./settings)** -- Connexion, paramètres et préférences

## Autres éléments

- **Barre d'en-tête** -- Affiche le titre de la page courante, un bouton de thème (sombre/clair) et le statut de connexion à Ollama (vert = connecté, rouge = déconnecté).
- **Bouton de retour d'expérience** -- En bas de la barre latérale. Ouvre une fenêtre superposée pour soumettre directement vos commentaires.

## Étapes suivantes

Si vous n'avez pas encore installé LLMxRay, rendez-vous sur la page [Installation](./installation). Sinon, choisissez n'importe quel chapitre dans la barre latérale pour commencer à explorer.
