# Complétion au Milieu (FIM)

La **page FIM** est un petit terrain de jeu dédié à la **complétion de code**. Vous fournissez un **préfixe** (le code avant le curseur) et un **suffixe** (le code après le curseur), et le modèle remplit le trou entre les deux.

**Élément de barre latérale :** Complétion de code (sous Atelier d'Outils)
**Route :** `/fim`
**Ajouté dans :** v0.4.7 (mai 2026)

## Qu'est-ce que la complétion au milieu ?

La plupart des APIs de chat ne supportent que la génération de gauche à droite : vous donnez un prompt, le modèle continue à partir de là. **FIM** est différent — le modèle voit aussi ce qui vient *après* le trou, et écrit du contenu qui s'insère naturellement entre les deux ancres.

C'est ce qui anime des outils comme la suggestion en milieu de ligne de GitHub Copilot et la « complétion tab » de Cursor. Plusieurs modèles servis par Ollama le supportent nativement :

- **Qwen2.5-Coder** (toutes tailles)
- **CodeLlama** (variantes `-code`)
- **Codestral**
- **DeepSeek-Coder**
- **StarCoder**

Ollama expose le FIM via un champ `suffix` sur l'endpoint `/api/generate`. LLMxRay le rend disponible dans la page FIM.

## Utilisation

1. Choisissez un modèle dans la liste déroulante — les modèles de code sont listés en premier sous « Modèles de code (compatibles FIM) ».
2. Tapez votre **préfixe** (le code qui vient avant le curseur) dans la zone de texte de gauche.
3. Tapez votre **suffixe** (le code qui vient après le curseur) dans la zone de droite.
4. Cliquez sur **Générer**.

Le modèle diffuse le milieu manquant en temps réel. Après la génération, un **aperçu assemblé** apparaît — le préfixe, le milieu généré (surligné en couleur d'accent), et le suffixe rendus comme un seul bloc continu, comme ils apparaîtraient dans votre éditeur.

## Métriques

Quand la génération se termine, quatre cartes de métriques apparaissent sous la sortie :

- **Durée totale** — temps mural entre la requête et le dernier token
- **Chargement modèle** — temps qu'Ollama a passé à charger le modèle en mémoire (0 ms pour les démarrages à chaud)
- **Tokens générés** — nombre de tokens produits par le modèle
- **Vitesse** — tokens par seconde

## Si le modèle ne supporte pas FIM

Si vous choisissez un modèle qui n'est pas de code, la page vous avertit en amont. Si vous essayez quand même, Ollama renvoie une erreur claire : `qwen2.5:3b does not support insert` (ou similaire, avec le nom du modèle à la place). La page affiche ce message dans la zone de sortie sans planter.

## Sous le capot

La page appelle `/api/generate` avec le nouveau champ `suffix` qu'Ollama expose :

```json
{
  "model": "qwen2.5-coder:7b",
  "prompt": "def fibonacci(n):\n    if n <= 1:\n        return n\n    ",
  "suffix": "\n\nprint(fibonacci(10))"
}
```

La réponse NDJSON streamée est analysée de la même façon qu'un chat normal — un objet JSON par ligne, accumulant les deltas `response` jusqu'à `done: true`.

## Voir aussi

- [Diagnostics de Chat](./chat-diagnostics) pour le chat général
- [Atelier d'Outils](./tool-workshop) pour construire des outils agentiques
