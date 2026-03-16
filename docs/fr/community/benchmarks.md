# Benchmarks Communautaires

LLMxRay est livre avec 5 suites de benchmark integrees (ARC, GSM8K, HellaSwag, MMLU-Pro, TruthfulQA). Les membres de la communaute peuvent contribuer des suites supplementaires pour evaluer les modeles sur des sujets specialises.

## Comment contribuer

1. Faites un **fork** du [depot LLMxRay](https://github.com/LogneBudo/llmxray)
2. Creez un fichier JSON dans le repertoire `community-benchmarks/`
3. Respectez le schema defini dans [SCHEMA.md](https://github.com/LogneBudo/llmxray/blob/master/community-benchmarks/SCHEMA.md)
4. Soumettez une Pull Request

## Exigences

- Minimum **20 questions** par suite
- Toutes les questions doivent avoir des **reponses correctes verifiables**
- Exactement **4 choix de reponse** par question (A, B, C, D)
- Definir `"builtIn": false`
- Inclure un melange de niveaux de difficulte lorsque c'est pertinent

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

## Idees de suites

Vous cherchez l'inspiration ? Voici quelques domaines non couverts par les suites integrees :

- **Programmation** — Questions de comprehension et de debogage de code
- **Enigmes logiques** — Logique formelle et raisonnement deductif
- **Comprehension linguistique** — Expressions idiomatiques, ambiguites, pragmatique
- **Domaines specialises** — Connaissances medicales, juridiques, financieres ou en ingenierie
- **Multilingue** — Questions dans d'autres langues que l'anglais

## Suites communautaires

*Aucune suite communautaire soumise pour le moment. Soyez le premier !*

Consultez la [suite d'exemple](https://github.com/LogneBudo/llmxray/blob/master/community-benchmarks/_example.json) pour une reference fonctionnelle.
