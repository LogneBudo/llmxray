# Benchmarks Communautaires

LLMxRay est livré avec 5 suites de benchmark intégrées (ARC, GSM8K, HellaSwag, MMLU-Pro, TruthfulQA). Les membres de la communauté peuvent contribuer des suites supplémentaires pour évaluer les modèles sur des sujets spécialisés.

## Comment contribuer

1. Faites un **fork** du [dépôt LLMxRay](https://github.com/LogneBudo/llmxray)
2. Créez un fichier JSON dans le répertoire `community-benchmarks/`
3. Respectez le schéma défini dans [SCHEMA.md](https://github.com/LogneBudo/llmxray/blob/master/community-benchmarks/SCHEMA.md)
4. Soumettez une Pull Request

## Exigences

- Minimum **20 questions** par suite
- Toutes les questions doivent avoir des **réponses correctes vérifiables**
- Exactement **4 choix de réponse** par question (A, B, C, D)
- Définir `"builtIn": false`
- Inclure un mélange de niveaux de difficulté lorsque c'est pertinent

## Format JSON

```json
{
  "id": "my-suite",
  "name": "My Custom Suite",
  "description": "What this suite tests",
  "builtIn": false,
  "questions": [
    {
      "id": "my-suite_001",
      "category": "my-suite",
      "subcategory": "topic",
      "question": "The question text?",
      "choices": [
        "A) First option",
        "B) Second option",
        "C) Third option",
        "D) Fourth option"
      ],
      "correctAnswer": "B",
      "difficulty": "medium"
    }
  ]
}
```

## Idées de suites

Vous cherchez l'inspiration ? Voici quelques domaines non couverts par les suites intégrées :

- **Programmation** — Questions de compréhension et de débogage de code
- **Énigmes logiques** — Logique formelle et raisonnement déductif
- **Compréhension linguistique** — Expressions idiomatiques, ambiguïtés, pragmatique
- **Domaines spécialisés** — Connaissances médicales, juridiques, financières ou en ingénierie
- **Multilingue** — Questions dans d'autres langues que l'anglais

## Suites communautaires

*Aucune suite communautaire soumise pour le moment. Soyez le premier !*

Consultez la [suite d'exemple](https://github.com/LogneBudo/llmxray/blob/master/community-benchmarks/_example.json) pour une référence fonctionnelle.
