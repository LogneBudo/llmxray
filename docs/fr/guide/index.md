# Introduction

**LLMxRay** est un tableau de bord gratuit et local-first qui se connecte a [Ollama](https://ollama.com) sur votre machine. Il vous permet de discuter avec n'importe quel modele telecharge puis d'inspecter tout ce qui s'est passe en coulisses : la vitesse d'arrivee de chaque token, ce que le modele a pu "penser", comment differents parametres modifient la sortie, et bien plus encore.

**Pas de cloud. Pas de cles API. Aucun cout.** Tout s'execute sur votre materiel.

## A qui s'adresse LLMxRay ?

| Vous etes... | LLMxRay vous aide a... |
|---|---|
| **Debutant curieux** | Voir les reponses de l'IA se former en temps reel et comprendre ce que signifient vraiment "temperature" ou "tokens" |
| **Etudiant / enseignant** | Explorer visuellement le comportement des modeles -- ideal pour les cours et demonstrations en IA/ML |
| **Developpeur** | Deboguer les prompts, comparer les modeles, profiler la latence, inspecter les appels d'outils |
| **Chercheur** | Mener des experiences controlees : meme prompt, parametres differents, resultats cote a cote |

## Navigation dans l'application

LLMxRay dispose d'une barre laterale avec 10 elements de navigation, chacun representant une fonctionnalite majeure. Ce guide comporte un chapitre par element, dans l'ordre exact d'apparition dans la barre laterale :

1. **[Diagnostics de Chat](./chat-diagnostics)** -- L'interface de chat principale avec streaming et analyse de session
2. **[Comparer](./compare)** -- Comparaison cote a cote de modeles et de parametres
3. **[Plongements](./embeddings)** -- Visualisation d'embeddings textuels et similarite
4. **[Base de Connaissances](./knowledge-base)** -- Telechargement de documents, decoupage et recherche RAG
5. **[Atelier d'Outils](./tool-workshop)** -- Constructeur visuel d'outils avec synchronisation du code
6. **[Entrainement IA](./ai-training)** -- Curation et export de donnees d'entrainement
7. **[Modeles](./models)** -- Navigateur de modeles et detection des capacites
8. **[Benchmark](./benchmark)** -- Evaluation standardisee des modeles avec logprobs
9. **[Mon Systeme](./system)** -- Detection du materiel et statut d'Ollama
10. **[Parametres](./settings)** -- Connexion, parametres et preferences

## Autres elements

- **Barre d'en-tete** -- Affiche le titre de la page courante, un bouton de theme (sombre/clair) et le statut de connexion a Ollama (vert = connecte, rouge = deconnecte).
- **Bouton de retour d'experience** -- En bas de la barre laterale. Ouvre une fenetre superposee pour soumettre directement vos commentaires.

## Etapes suivantes

Si vous n'avez pas encore installe LLMxRay, rendez-vous sur la page [Installation](./installation). Sinon, choisissez n'importe quel chapitre dans la barre laterale pour commencer a explorer.
