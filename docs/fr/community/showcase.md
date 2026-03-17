# Découvert avec LLMxRay

Une sélection de découvertes intéressantes, de comportements surprenants et d'observations précieuses faites par la communauté grâce à LLMxRay.

## Comment soumettre

Vous avez trouvé quelque chose d'intéressant ? Nous serions ravis de le mettre en avant.

1. Ouvrez une issue [Soumission Vitrine](https://github.com/LogneBudo/llmxray/issues/new?template=showcase-submission.yml)
2. Remplissez le formulaire structuré : ce que vous avez trouvé, quels modèles, comment reproduire
3. Incluez des captures d'écran de LLMxRay si possible
4. Nous examinerons votre soumission et l'ajouterons à cette page

---

## Découvertes mises en avant

### Effet de seuil de la température sur la génération de code
**Contributeur :** LogneBudo | **Modèles :** Mistral 7B | **Date :** Mars 2026

En utilisant la fonctionnalité Compare avec le preset Temperature Sweep, nous avons constaté que Mistral 7B produit du code Python nettement plus précis à une température de 0.2 qu'à 0.7. À 0.7, le modèle introduit des noms de variables créatifs mais incorrects et hallucine occasionnellement des méthodes d'API. La coloration de confiance des tokens dans Chat Diagnostics a rendu cette incertitude visible — les tokens de la sortie à 0.7 affichaient systématiquement une confiance plus faible (davantage orange) autour des appels de fonctions.

### La profondeur de réflexion de DeepSeek-R1 varie selon le type de question
**Contributeur :** LogneBudo | **Modèles :** DeepSeek-R1 7B | **Date :** Mars 2026

L'onglet Reasoning a révélé que les blocs `<think>` de DeepSeek-R1 sont considérablement plus longs pour les problèmes mathématiques (GSM8K) que pour le rappel factuel (TruthfulQA). Sur GSM8K, le modèle effectue en moyenne 12 à 15 étapes de raisonnement avec vérification arithmétique explicite. Sur TruthfulQA, il utilise généralement 2 à 3 étapes avant de s'engager sur une réponse. Cela était visible dans les résultats de Benchmark — GSM8K présentait un TTFT plus élevé mais aussi une meilleure précision lorsque le budget de réflexion n'était pas plafonné.

### Impact de la quantification sur la précision des benchmarks
**Contributeur :** LogneBudo | **Modèles :** Llama 3.2 3B (Q4_0 vs Q8_0) | **Date :** Mars 2026

L'exécution de la même suite ARC-Challenge sur Llama 3.2 en Q4_0 et Q8_0 via la page Benchmark a montré une baisse de précision de 4.2 % en Q4_0. La ventilation par catégorie a révélé que cette baisse se concentrait sur les questions de physique (chute de 7.1 %) tandis que les questions de biologie étaient à peine affectées (0.8 % de baisse). Les distributions de logprob ont confirmé que le Q4_0 était globalement moins confiant, mais l'écart de confiance se creusait spécifiquement sur les questions nécessitant un raisonnement numérique en plusieurs étapes.

---

*Vous souhaitez voir votre découverte ici ? [Soumettez une issue Vitrine](https://github.com/LogneBudo/llmxray/issues/new?template=showcase-submission.yml).*
