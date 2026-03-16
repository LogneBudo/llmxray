# Decouvert avec LLMxRay

Une selection de decouvertes interessantes, de comportements surprenants et d'observations precieuses faites par la communaute grace a LLMxRay.

## Comment soumettre

Vous avez trouve quelque chose d'interessant ? Nous serions ravis de le mettre en avant.

1. Ouvrez une issue [Soumission Vitrine](https://github.com/LogneBudo/llmxray/issues/new?template=showcase-submission.yml)
2. Remplissez le formulaire structure : ce que vous avez trouve, quels modeles, comment reproduire
3. Incluez des captures d'ecran de LLMxRay si possible
4. Nous examinerons votre soumission et l'ajouterons a cette page

---

## Decouvertes mises en avant

### Effet de seuil de la temperature sur la generation de code
**Contributeur :** LogneBudo | **Modeles :** Mistral 7B | **Date :** Mars 2026

En utilisant la fonctionnalite Compare avec le preset Temperature Sweep, nous avons constate que Mistral 7B produit du code Python nettement plus precis a une temperature de 0.2 qu'a 0.7. A 0.7, le modele introduit des noms de variables creatifs mais incorrects et hallucine occasionnellement des methodes d'API. La coloration de confiance des tokens dans Chat Diagnostics a rendu cette incertitude visible — les tokens de la sortie a 0.7 affichaient systematiquement une confiance plus faible (davantage orange) autour des appels de fonctions.

### La profondeur de reflexion de DeepSeek-R1 varie selon le type de question
**Contributeur :** LogneBudo | **Modeles :** DeepSeek-R1 7B | **Date :** Mars 2026

L'onglet Reasoning a revele que les blocs `<think>` de DeepSeek-R1 sont considerablement plus longs pour les problemes mathematiques (GSM8K) que pour le rappel factuel (TruthfulQA). Sur GSM8K, le modele effectue en moyenne 12 a 15 etapes de raisonnement avec verification arithmetique explicite. Sur TruthfulQA, il utilise generalement 2 a 3 etapes avant de s'engager sur une reponse. Cela etait visible dans les resultats de Benchmark — GSM8K presentait un TTFT plus eleve mais aussi une meilleure precision lorsque le budget de reflexion n'etait pas plafonne.

### Impact de la quantification sur la precision des benchmarks
**Contributeur :** LogneBudo | **Modeles :** Llama 3.2 3B (Q4_0 vs Q8_0) | **Date :** Mars 2026

L'execution de la meme suite ARC-Challenge sur Llama 3.2 en Q4_0 et Q8_0 via la page Benchmark a montre une baisse de precision de 4.2 % en Q4_0. La ventilation par categorie a revele que cette baisse se concentrait sur les questions de physique (chute de 7.1 %) tandis que les questions de biologie etaient a peine affectees (0.8 % de baisse). Les distributions de logprob ont confirme que le Q4_0 etait globalement moins confiant, mais l'ecart de confiance se creusait specifiquement sur les questions necessitant un raisonnement numerique en plusieurs etapes.

---

*Vous souhaitez voir votre decouverte ici ? [Soumettez une issue Vitrine](https://github.com/LogneBudo/llmxray/issues/new?template=showcase-submission.yml).*
