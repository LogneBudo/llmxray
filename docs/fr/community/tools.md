# Outils Communautaires

Le Tool Workshop de LLMxRay est livre avec plus de 15 templates integres. Les membres de la communaute peuvent contribuer des templates d'outils supplementaires pour enrichir la bibliotheque.

## Comment contribuer

1. Faites un **fork** du [depot LLMxRay](https://github.com/LogneBudo/llmxray)
2. Creez un fichier JSON dans le repertoire `community-tools/`
3. Respectez le schema defini dans [SCHEMA.md](https://github.com/LogneBudo/llmxray/blob/master/community-tools/SCHEMA.md)
4. Soumettez une Pull Request

## Exigences

- L'outil doit avoir un objectif clair et utile
- Inclure un exemple `testInput` pour la verification
- Aucun appel vers des domaines externes non fiables
- Aucun acces au systeme de fichiers ni operations systeme
- Implementation en JavaScript valide

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

## Categories

| Categorie | Description |
|---|---|
| `api` | Outils qui appellent des API externes |
| `data` | Transformation et traitement de donnees |
| `utility` | Utilitaires polyvalents |
| `custom` | Tout le reste |

## Idees d'outils

- **Formateur JSON** — Affichage formate ou minification de JSON
- **Markdown vers HTML** — Conversion de texte Markdown
- **Analyseur d'URL** — Extraction des composants d'une URL
- **Encodeur/decodeur Base64** — Encodage et decodage de chaines
- **CSV vers JSON** — Transformation de donnees tabulaires
- **Convertisseur de couleurs** — HSL vers RGB, hex vers RGB, etc.

## Outils communautaires

*Aucun outil communautaire soumis pour le moment. Soyez le premier !*

Consultez l'[outil d'exemple](https://github.com/LogneBudo/llmxray/blob/master/community-tools/_example.json) pour une reference fonctionnelle.
