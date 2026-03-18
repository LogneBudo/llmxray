# Module 6 : L'IA peut-elle utiliser des outils ?

<div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.04)); border-left: 4px solid #a855f7; padding: 1rem 1.5rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">

**L'Ingénieur** — Construisez des ponts entre le langage et l'action

**Durée :** 60 min | **Difficulté :** Intermédiaire | **Prérequis :** [Module 1](./module-1), [Module 5](./module-5)

</div>

## Le Moment Eureka

> Le tool calling est de la correspondance de motifs, pas de la compréhension. Le modèle ne sait pas ce que fait une API — il fait correspondre votre requête à une signature de function et génère des arguments JSON. C'est la même prédiction du prochain token, simplement orientée vers une sortie structurée.

Quand un modèle "utilise une calculatrice" ou "consulte la météo", cela ressemble à de l'intelligence en action — un esprit qui reconnaît ses propres limites et cherche l'instrument approprié. La réalité est bien plus mécanique. Le modèle reçoit des définitions d'outils dans son prompt — des schemas JSON décrivant les noms de function, les types de paramètres et des descriptions en langage naturel. Lorsque votre requête correspond à l'une de ces descriptions par correspondance de motifs, la prédiction du prochain token du modèle bascule de la génération de prose vers la génération d'un objet JSON structuré `tool_call`. Il n'a aucune notion de ce que fait la function, aucun modèle mental des requêtes HTTP ou des bases de données. Il remplit un gabarit.

Cette distinction est fondamentale. Comprendre que le tool calling est de la génération structurée — et non de l'agentivité — permet aux étudiants de raisonner sur pourquoi les outils échouent parfois, pourquoi les descriptions doivent être précises, et pourquoi donner à un modèle l'accès à un outil dangereux est fondamentalement un problème de conception de permissions, pas un problème d'intelligence. Le modèle appellera n'importe quel outil qui correspond le mieux au motif, indépendamment des conséquences.

---

## Contexte Conceptuel

### Qu'est-ce que le tool calling ?

Lorsqu'un modèle de langage génère une réponse, il produit normalement du langage naturel — des phrases, des paragraphes, des explications. Le **tool calling** est un mode dans lequel le modèle génère à la place un objet JSON structuré : un nom de function accompagné d'un ensemble d'arguments typés. Cet objet n'est pas exécuté par le modèle. Il est renvoyé à l'application, qui exécute la function réelle, collecte le résultat et le réinjecte dans la conversation pour que le modèle l'intègre dans sa réponse finale.

Le modèle n'exécute jamais rien lui-même. Il ne dispose d'aucun runtime, d'aucun interpréteur, d'aucun accès au réseau ou au système de fichiers. C'est un générateur de texte qui a été entraîné à produire un format JSON spécifique lorsque le contexte suggère qu'un outil devrait être invoqué. La couche applicative — en l'occurrence LLMxRay — est ce qui fait le pont entre la sortie structurée du modèle et l'exécution dans le monde réel.

C'est une frontière architecturale critique. Le modèle propose ; l'application dispose. Chaque appel d'outil passe par du code applicatif qui peut le valider, l'isoler dans un bac à sable, le limiter en débit ou le rejeter avant exécution. Cette séparation est ce qui rend le tool calling sûr (lorsqu'il est correctement conçu) ou dangereux (lorsque l'application fait aveuglément confiance à la sortie du modèle).

### La boucle du tool calling

Le cycle de vie complet d'une conversation augmentée par des outils suit une boucle stricte :

1. **Message de l'utilisateur** — Vous posez une question ou formulez une requête ("What time is it in Tokyo?")
2. **Le modèle décide d'appeler un outil** — En se basant sur les définitions d'outils dans son contexte, le modèle génère un objet `tool_call` au lieu d'une réponse textuelle (par ex. `{"name": "current_time", "arguments": {"timezone": "Asia/Tokyo"}}`)
3. **L'application exécute l'outil** — LLMxRay reçoit l'appel d'outil, exécute la function correspondante dans un environnement isolé et capture le résultat
4. **Le résultat est réinjecté** — La sortie de l'outil est ajoutée à la conversation sous forme d'un message avec le rôle `tool`
5. **Le modèle génère la réponse finale** — Avec le résultat de l'outil désormais dans le contexte, le modèle produit une réponse en langage naturel ("The current time in Tokyo is 2:34 PM JST")

Cette boucle peut se répéter. Si le modèle détermine qu'il a besoin d'informations supplémentaires après avoir vu le résultat du premier outil, il peut émettre un nouvel appel d'outil. LLMxRay supporte jusqu'à **5 rounds d'appels d'outils par tour**, permettant des chaînes de raisonnement en plusieurs étapes où la sortie de chaque outil guide l'appel suivant.

![La boucle du tool calling](/educators/fr/tool-calling-loop.svg)

### Comment le modèle "décide" d'appeler un outil

Il ne décide pas — il **prédit**. Cette distinction est le noyau conceptuel de ce module.

Lorsque le tool calling est activé, les définitions d'outils sont injectées dans le prompt du modèle sous forme de schemas JSON — généralement dans le message système ou un bloc dédié aux outils. Ces définitions deviennent partie intégrante du contexte que le modèle lit avant de générer ses prochains tokens. Le modèle a été affiné (durant son entraînement) pour reconnaître quand la requête d'un utilisateur s'aligne avec l'une des descriptions d'outils disponibles et pour produire un objet `tool_call` dans ces cas.

C'est pourquoi **les bonnes descriptions sont essentielles**. Le champ description dans une définition d'outil est le seul guide dont dispose le modèle pour savoir ce que fait l'outil. Le modèle ne peut pas inspecter le code source de l'outil. Il ne peut pas le tester. Il lit la description — quelques phrases en langage naturel — et décide (prédit) si la requête actuelle correspond. Une description vague mène à des appels manqués ou erronés. Une description précise mène à une invocation fiable.

Considérez deux descriptions pour le même outil :
- **Bonne** : "Get the current weather conditions for a given city, returning temperature in Celsius and a short description"
- **Mauvaise** : "A utility function"

La première donne au modèle suffisamment de signal pour faire correspondre "What's the weather in Lyon?" à cet outil. La seconde ne lui donne presque rien — le modèle pourrait ignorer l'outil entièrement, ou pire, l'appeler pour des requêtes sans rapport parce qu'il ne peut pas déterminer ce qu'il fait.

### Définitions d'outils : le contrat

Une définition d'outil est un schema JSON qui sert de contrat entre le modèle et l'application. Elle comporte trois parties essentielles :

- **`name`** — Un identifiant unique pour la function (par ex. `weather_check`, `calculate`, `generate_uuid`). C'est ce qui apparaît dans la sortie `tool_call` du modèle.
- **`description`** — Une explication en langage naturel de ce que fait l'outil et quand l'utiliser. C'est le champ le plus important — c'est ce que le modèle lit pour déterminer la pertinence.
- **`parameters`** — Un objet JSON Schema définissant les arguments que la function accepte, incluant leurs types (`string`, `number`, `boolean`, `array`, `object`), descriptions et lesquels sont `required`.

Voici un exemple de définition d'outil bien structurée :

```json
{
  "type": "function",
  "function": {
    "name": "weather_check",
    "description": "Get the current weather conditions for a given city. Returns temperature in Celsius, humidity, and a short description of conditions.",
    "parameters": {
      "type": "object",
      "properties": {
        "city": {
          "type": "string",
          "description": "The name of the city to check weather for"
        },
        "units": {
          "type": "string",
          "enum": ["celsius", "fahrenheit"],
          "description": "Temperature unit (default: celsius)"
        }
      },
      "required": ["city"]
    }
  }
}
```

Il s'agit d'un format compatible OpenAI, qui est le standard suivi par Ollama et LLMxRay. Le bloc `parameters` est lui-même un JSON Schema — le même format utilisé pour valider les formulaires web et les requêtes API dans toute l'industrie logicielle. Les étudiants qui apprennent à lire les définitions d'outils ici acquièrent une compétence transférable.

![Anatomie d'une définition d'outil](/educators/fr/tool-definition.svg)

Dans le **Tool Workshop** de LLMxRay, vous pouvez voir ce schema rendu visuellement. L'onglet **Schema** affiche le JSON Schema auto-généré pour tout outil que vous créez, et le **Code Panel** montre l'implémentation exécutable avec synchronisation bidirectionnelle — modifiez le code et le schema se met à jour, modifiez le schema et le code suit.

### Quand le tool calling échoue

Le tool calling peut échouer de plusieurs manières, et comprendre ces modes de défaillance est essentiel pour construire des systèmes fiables :

- **Mauvais outil sélectionné** — Le modèle appelle `calculate` quand vous avez demandé l'heure. Cela signifie généralement que les descriptions sont ambiguës ou se chevauchent. Si deux outils ont des descriptions similaires, le modèle peut faire correspondre le mauvais.
- **Arguments hallucinés** — Le modèle invente des valeurs de paramètres qui ne correspondent pas au schema. Par exemple, passer `{"location": "Paris"}` quand le paramètre s'appelle `city`. C'est le même comportement d'hallucination vu au Module 3, mais appliqué à la sortie structurée.
- **Champs requis manquants** — Le modèle génère un appel d'outil mais omet un paramètre requis. L'application devrait valider contre le schema et renvoyer une erreur, donnant au modèle une chance de réessayer.
- **Le modèle ne supporte pas les outils** — Tous les modèles ne peuvent pas faire du tool calling. Les modèles plus petits ou les architectures plus anciennes peuvent ne pas avoir été affinés pour la sortie structurée. Ils peuvent ignorer entièrement les définitions d'outils ou produire du JSON malformé.
- **L'outil renvoie une erreur** — La function s'exécute mais échoue (timeout réseau, entrée invalide, limite de débit). Le modèle reçoit le message d'erreur et doit décider comment procéder — réessayer, s'excuser ou tenter une approche différente.

![Quand le tool calling échoue](/educators/fr/tool-calling-failures.svg)

::: warning Tous les modèles ne supportent pas le tool calling
LLMxRay détecte automatiquement si un modèle supporte le tool calling en vérifiant ses capacités lors du chargement du modèle. Si un modèle ne supporte pas les outils, les toggles d'outils dans les Chat Settings seront désactivés. Les modèles plus petits (moins de 7B paramètres) manquent souvent de la capacité de tool calling. Vérifiez toujours le support avant de concevoir des exercices autour de modèles spécifiques.
:::

---

## Exercices Pratiques

### Exercice 1 : Votre premier outil

**Ce qu'il faut faire :**

1. Ouvrez le **Tool Workshop** dans LLMxRay
2. Parcourez les **Tool Templates** — sélectionnez **"Current Time"** parmi les modèles Utility
3. Examinez l'outil sous trois vues :
   - Le panneau de **définition de l'outil** : notez le `name`, la `description` et les `parameters`
   - Le **Code Panel** : lisez l'implémentation JavaScript — c'est ce qui s'exécute réellement lorsque l'outil est appelé
   - L'onglet **Schema** : voyez le JSON Schema auto-généré qui est envoyé au modèle
4. Remarquez le canevas visuel basé sur des nœuds — l'outil apparaît comme un nœud connecté montrant les entrées, le traitement et les sorties
5. Allez maintenant dans **Chat** et ouvrez les **Chat Settings**. Trouvez les toggles d'outils et activez "Current Time"
6. Demandez au modèle : *"What time is it?"*
7. Observez la réponse — le modèle devrait générer un `tool_call` au lieu de deviner l'heure
8. Naviguez vers la page **Session** et ouvrez l'onglet **Tools**. Trouvez l'appel d'outil dans le **ToolCallTimeline** et examinez-le

**Ce que vous allez découvrir :**

Le modèle ne connaît pas l'heure actuelle — c'est un modèle de langage, pas une horloge. Mais avec l'outil activé, il reconnaît que votre question correspond à la description de l'outil et génère un appel structuré. L'application exécute la function, obtient l'heure réelle et la réinjecte. Le modèle intègre alors l'heure réelle dans une réponse en langage naturel.

---

### Exercice 2 : L'expérience de la description

**Ce qu'il faut faire :**

1. Dans le **Tool Workshop**, créez un nouvel outil personnalisé à partir de zéro :
   - **Name** : `weather_check`
   - **Description** : "Get the current weather for a location"
   - **Parameters** : un paramètre requis `city` de type `string`
2. Utilisez le workflow **Probe & Pick** pour tester le schema — vérifiez que l'onglet Schema affiche le JSON Schema correct
3. Allez dans **Chat**, activez l'outil dans les **Chat Settings**, et demandez : *"What's the weather in Paris?"*
4. Le modèle devrait appeler `weather_check` avec `{"city": "Paris"}`
5. Retournez maintenant dans le **Tool Workshop** et modifiez la description pour quelque chose de vague : **"A function"**
6. Retournez dans Chat (démarrez une nouvelle conversation) et posez la même question. Le modèle appelle-t-il toujours l'outil ?
7. Modifiez la description une dernière fois — supprimez-la entièrement (laissez-la vide)
8. Demandez à nouveau. Que se passe-t-il ?

**Ce que vous allez découvrir :**

Avec une description claire, le modèle fait correspondre votre requête à l'outil de manière fiable. Avec une description vague, il peut encore appeler l'outil (s'il est le seul disponible) mais avec moins de confiance. Sans aucune description, le comportement devient imprévisible — certains modèles ignoreront l'outil, d'autres l'appelleront au hasard. Cela prouve que la description n'est pas de la métadonnée pour les humains — c'est le signal principal que le modèle utilise pour déterminer la pertinence.

---

### Exercice 3 : Anatomie d'un appel d'outil

**Ce qu'il faut faire :**

1. Après avoir terminé les Exercices 1 et 2, ouvrez la page **Session** et trouvez une conversation contenant des appels d'outils
2. Ouvrez l'onglet **Tools** pour voir le **ToolCallTimeline** — une vue chronologique de chaque invocation d'outil dans la session
3. Cliquez sur un **ToolCallCard** pour le développer. Examinez :
   - **Nom de la function** — Quel outil le modèle a-t-il appelé ?
   - **Arguments** — Quels arguments JSON le modèle a-t-il générés ? Sont-ils valides par rapport au schema ?
   - **Statut d'exécution** — L'outil a-t-il réussi ou échoué ?
   - **Durée** — Combien de temps l'exécution a-t-elle pris (en millisecondes) ?
   - **Résultat** — Quelles données sont revenues de l'outil ?
4. Lisez maintenant la réponse finale du modèle qui a suivi cet appel d'outil
5. Comparez : la réponse en langage naturel du modèle était-elle fidèle au résultat de l'outil ? A-t-il ajouté des informations qui n'étaient pas dans le résultat ? A-t-il omis quelque chose ?

**Ce que vous allez découvrir :**

Le ToolCallCard vous offre une transparence complète sur la boucle du tool calling. Vous pouvez voir exactement ce que le modèle a demandé, ce qu'il a reçu et comment il a utilisé cette information. Parfois le modèle est parfaitement fidèle au résultat. D'autres fois, il paraphrase, ajoute un langage de prudence ("Based on the data..."), ou complète même le résultat de l'outil avec ses propres connaissances — qui peuvent ou non être exactes.

---

### Exercice 4 : Orchestration multi-outils

**Ce qu'il faut faire :**

1. Activez **3 outils ou plus** dans les Chat Settings — par exemple : **Current Time**, **Calculator** et **UUID Generator**
2. Posez une question composée qui nécessite les trois : *"Generate a UUID, then tell me the current time, then calculate 42 * 17."*
3. Observez attentivement la réponse du modèle :
   - Appelle-t-il les trois outils ?
   - Les appelle-t-il dans l'ordre que vous avez spécifié ?
   - Essaie-t-il de les appeler tous en même temps (parallèle) ou un par un (séquentiel) ?
4. Consultez le **ToolCallTimeline** sur la page Session pour voir la séquence exacte et le timing
5. Essayez maintenant une requête plus ambiguë : *"I need a unique identifier and some math — what's 256 divided by 8?"*
   - Le modèle appelle-t-il le UUID generator même si vous avez dit "unique identifier" et non "UUID" ?
   - Utilise-t-il la calculatrice ou répond-il au calcul à partir de ses propres connaissances ?

**Ce que vous allez découvrir :**

L'orchestration multi-outils révèle comment le modèle priorise et séquence les appels. Certains modèles appelleront tous les outils en parallèle ; d'autres les enchaîneront séquentiellement. L'ordre peut ne pas correspondre à votre requête — le modèle génère ce qu'il prédit devoir venir ensuite, pas ce que vous avez demandé en premier. Un phrasé ambigu teste si le modèle peut faire correspondre un langage informel ("unique identifier") à des noms d'outils formels (`generate_uuid`). C'est la correspondance de motifs en action — et elle ne correspond pas toujours de la manière attendue.

---

## Points Clés

1. **Le tool calling est de la génération structurée, pas de l'intelligence.** Le modèle produit un objet JSON correspondant à un schema — il ne comprend pas ce que fait la function ni comment elle fonctionne.
2. **Le champ description est primordial.** C'est le seul signal que le modèle utilise pour décider quand et si appeler un outil. Des descriptions vagues mènent à un comportement peu fiable.
3. **Le modèle propose, l'application dispose.** Chaque appel d'outil passe par du code applicatif qui peut le valider, l'exécuter ou le rejeter. La sécurité repose sur cette séparation.
4. **L'orchestration multi-outils dépend des motifs.** Le modèle peut appeler les outils dans un ordre inattendu, en ignorer certains ou appeler le mauvais lorsque les descriptions se chevauchent. Testez minutieusement.
5. **Tous les modèles ne peuvent pas utiliser des outils.** Le tool calling nécessite un affinage spécifique. LLMxRay détecte automatiquement le support pour que vous n'ayez pas à deviner.

---

## Questions de Discussion

1. Si le tool calling n'est que de la correspondance de motifs, qu'est-ce qui empêche le modèle d'appeler un outil dangereux — par exemple, un outil qui supprime des fichiers ou envoie des e-mails ? Comment devrait-on concevoir les permissions d'outils dans un système en production ?
2. Que se passe-t-il si un outil renvoie une erreur — le modèle la gère-t-il avec élégance ? L'application devrait-elle masquer les erreurs au modèle ou les montrer ? Quels sont les compromis ?
3. Le modèle sélectionne les outils en se basant sur des descriptions rédigées par des humains. Que se passe-t-il si la description est trompeuse — intentionnellement ou accidentellement ? Cela pourrait-il être exploité ?
4. Certains systèmes de tool calling permettent au modèle d'écrire du code arbitraire (comme un outil interpréteur Python). Cela franchit-il la ligne entre "sortie structurée" et "agentivité" ? Où devrait se situer la frontière ?
5. Si deux outils ont des descriptions qui se chevauchent (par ex. "search the web" et "look up information online"), comment le modèle choisit-il entre eux ? Qu'est-ce que cela nous apprend sur les limites du routage basé sur les descriptions ?

---

## Lectures Complémentaires

### Articles académiques

| Article | Auteurs | Année | Lien |
|---|---|---|---|
| Toolformer: Language Models Can Teach Themselves to Use Tools | Schick et al. | 2023 | [arXiv:2302.04761](https://arxiv.org/abs/2302.04761) |
| Gorilla: Large Language Model Connected with Massive APIs | Patil et al. | 2023 | [arXiv:2305.15334](https://arxiv.org/abs/2305.15334) |
| ToolBench: An Open Platform for Training, Serving, and Evaluating LLM Tool Learning | Qin et al. | 2023 | [arXiv:2305.16504](https://arxiv.org/abs/2305.16504) |
| Function Calling and Tool Use | OpenAI | 2023 | [platform.openai.com/docs](https://platform.openai.com/docs/guides/function-calling) |

### Tutoriels et explications

| Ressource | Auteur | Lien |
|---|---|---|
| Ollama Tool Calling Documentation | Ollama | [ollama.com/blog/tool-support](https://ollama.com/blog/tool-support) |
| LLMxRay Tool Workshop Guide | LLMxRay Docs | [Tool Workshop](/fr/guide/tool-workshop) |

---

## Évaluation

**Option A — Démonstration en direct + revue de code (individuel) :**
Construisez un outil personnalisé dans le Tool Workshop à partir de zéro (pas à partir d'un modèle). Lors d'une démonstration en direct, montrez : la définition de l'outil avec une description et des paramètres bien élaborés, le code d'implémentation, le schema auto-généré et une session de chat en direct où le modèle appelle votre outil. Expliquez chaque étape de la boucle du tool calling au fur et à mesure. Soyez prêt à répondre à : "Que se passerait-il si vous changiez la description ?"

**Option B — Test de résistance des descriptions (en binôme) :**
Créez un outil unique et testez-le avec 5 descriptions progressivement dégradées : (1) précise et détaillée, (2) correcte mais brève, (3) vague, (4) trompeuse, (5) vide. Pour chaque version, exécutez 3 prompts de chat et notez si le modèle a appelé l'outil correctement. Présentez vos résultats sous forme de tableau avec les taux de réussite et une courte analyse du seuil à partir duquel les descriptions deviennent trop pauvres pour être utiles.

**Option C — Défi de conception multi-outils (groupes de 3-4) :**
Concevez un ensemble de 4 outils qui fonctionnent ensemble pour résoudre une tâche réaliste (par ex. un planificateur de voyage : consultation météo, convertisseur de devises, convertisseur de fuseaux horaires, calculateur de distances). Rédigez les définitions d'outils avec descriptions et schemas. Testez-les dans LLMxRay avec des requêtes composées. Présentez : vos définitions d'outils, une transcription du modèle orchestrant les quatre outils et une analyse de ce qui a fonctionné et de ce qui a échoué.

---

## La Suite

Dans le **[Module 7 : Comment comparer les modèles ?](./module-7)**, vous passerez de l'observation d'un seul modèle à la comparaison de plusieurs modèles côte à côte. Vous découvrirez qu'un modèle obtenant 90 % sur un benchmark et 40 % sur un autre n'est pas défaillant — cela reflète les motifs spécifiques qu'il a appris durant l'entraînement. Le benchmarking est la méthode qui rend les différences entre modèles mesurables, reproductibles et honnêtes.

---

<div style="background: rgba(168,85,247,0.06); border-radius: 8px; padding: 1rem 1.5rem; margin-top: 2rem; font-size: 0.9rem; color: var(--vp-c-text-2);">

**Module 6 sur 8** du Kit Enseignants LLMxRay
[&larr; Module 5 : Quand le modèle oublie-t-il ?](./module-5) | [Retour au programme](./index) | [Module 7 : Comment comparer les modèles ? &rarr;](./module-7)

</div>
