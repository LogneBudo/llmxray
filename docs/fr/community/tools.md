# Outils Communautaires

Le Tool Workshop de LLMxRay est livré avec plus de 15 templates intégrés. Les membres de la communauté peuvent contribuer des templates d'outils supplémentaires pour enrichir la bibliothèque.

## Comment contribuer

1. Faites un **fork** du [dépôt LLMxRay](https://github.com/LogneBudo/llmxray)
2. Créez un fichier JSON dans le répertoire `community-tools/`
3. Respectez le schéma défini dans [SCHEMA.md](https://github.com/LogneBudo/llmxray/blob/master/community-tools/SCHEMA.md)
4. Soumettez une Pull Request

## Exigences

- L'outil doit avoir un objectif clair et utile
- Inclure un exemple `testInput` pour la vérification
- Aucun appel vers des domaines externes non fiables
- Aucun accès au système de fichiers ni opérations système
- Implémentation en JavaScript valide

## Format JSON

```json
{
  "name": "tool_name",
  "description": "What this tool does",
  "category": "utility",
  "parameters": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "Description of this parameter"
      }
    },
    "required": ["input"]
  },
  "implementation": "function tool_name({ input }) {\n  return input.toUpperCase();\n}",
  "testInput": {
    "input": "hello world"
  }
}
```

## Catégories

| Catégorie | Description |
|---|---|
| `api` | Outils qui appellent des API externes |
| `data` | Transformation et traitement de données |
| `utility` | Utilitaires polyvalents |
| `custom` | Tout le reste |

## Idées d'outils

- **Formateur JSON** — Affichage formaté ou minification de JSON
- **Markdown vers HTML** — Conversion de texte Markdown
- **Analyseur d'URL** — Extraction des composants d'une URL
- **Encodeur/décodeur Base64** — Encodage et décodage de chaînes
- **CSV vers JSON** — Transformation de données tabulaires
- **Convertisseur de couleurs** — HSL vers RGB, hex vers RGB, etc.

## Outils communautaires

*Aucun outil communautaire soumis pour le moment. Soyez le premier !*

Consultez l'[outil d'exemple](https://github.com/LogneBudo/llmxray/blob/master/community-tools/_example.json) pour une référence fonctionnelle.
