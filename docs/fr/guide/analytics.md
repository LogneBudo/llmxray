# Analytique

La page Analytique offre une vision approfondie de vos habitudes d'utilisation, des performances et de la qualite des reponses au fil du temps.

**Element de la barre laterale :** Analytique
**Route :** `/analytics`

## Sections

### Qualite des reponses

**Qualite par tour** montre l'evolution de la qualite a travers une conversation multi-tours. Chaque reponse est notee sur une echelle de 0 a 5.

### Analyse de latence

- **P50/P95/P99 de latence** des requetes
- **P50/P95/P99 du temps avant premier token**
- **Distribution de latence inter-tokens**

### Fiabilite

- **Taux d'erreurs par modele** avec classification en 7 categories
- **Chronologie des erreurs**
- **Tendance de chargement des modeles** avec indicateurs de demarrage froid

### Habitudes d'utilisation

- **Volume de requetes** quotidien
- **Repartition des modeles**
- **Carte thermique des heures d'activite** (7j x 24h)

### Impact des parametres

Graphique de correlation entre temperature et vitesse de generation.

### Memoire du modele

Historique des chargements recents avec duree et statut froid/chaud.
