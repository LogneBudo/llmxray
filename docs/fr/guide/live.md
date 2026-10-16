# En direct

La page **En direct** montre ce que vos *autres* outils envoient réellement à Ollama : VS Code Copilot, Open WebUI, Continue, n8n, un script Python. Tour par tour, avec ce que le cache a gardé et ce qu'il a jeté.

**Élément de la barre latérale :** En direct (au-dessus du Labo de cache)
**Route :** `/live`
**Ajouté dans :** v0.7.2 (octobre 2026)
**Nécessite :** rien de plus. Le port d'observation s'ouvre avec LLMxRay. Les chiffres de cache demandent Ollama 0.33.3 ou plus récent, qui est la version qui les rapporte.

## À quoi ça sert ?

Toutes les autres pages de LLMxRay observent un trafic que LLMxRay génère lui-même. Celle-ci observe un trafic que vous ne contrôlez pas : la boucle d'agent que Copilot fait tourner sur votre GPU, l'interface de chat de votre équipe, le workflow qui appelle un modèle quarante fois par heure.

C'est là que les installations locales ralentissent sans bruit. Un assistant de code envoie plusieurs milliers de tokens d'instructions et de définitions d'outils avant que vous ayez tapé un mot, place l'état de l'éditeur près du haut de l'invite, et renvoie toute la conversation plus chaque résultat d'outil à chaque tour. Rien de cela n'est visible depuis l'outil ; tout l'est dans les chiffres du démon dès que quelque chose se place entre les deux.

C'est ce qu'est le port d'observation : un sosie d'Ollama qui transmet tout au vrai démon et garde les chiffres.

## Mise en place

L'état vide de la page *est* la mise en place. Elle affiche une adresse, par défaut :

```
http://localhost:11435
```

Utilisez-la partout où un outil demande l'adresse d'Ollama. La page indique le champ exact pour chaque outil courant :

| Outil | Où va l'adresse |
|---|---|
| **VS Code Copilot** | Installez l'extension Ollama (éditeur Ollama) depuis le Marketplace ; l'ancien fournisseur Ollama intégré à VS Code est déprécié. Puis Paramètres, `ollama.endpoint`, ou *Chat: Manage Language Models*, Ollama, URL. Lancez *Ollama: Refresh Models* et choisissez un modèle dans la section Ollama du sélecteur. |
| **Open WebUI** | Panneau d'administration, Paramètres, Connexions, URL de l'API Ollama. Depuis un conteneur Docker, `http://host.docker.internal:11435`. |
| **Continue** | `apiBase` sur chaque modèle Ollama dans `config.yaml`. |
| **n8n** | URL de base de l'identifiant Ollama. |
| **Python / curl** | `ollama.Client(host='http://localhost:11435')`, `base_url='http://localhost:11435/v1'` pour le SDK OpenAI, ou `export OLLAMA_HOST=localhost:11435` pour la ligne de commande (`$env:OLLAMA_HOST = "localhost:11435"` sous PowerShell). |

Envoyez un message depuis l'outil. La page passe d'elle-même en vue directe. Pas de bouton Enregistrer, pas de redémarrage.

Le port se comporte exactement comme Ollama, bannière racine comprise : les outils qui sondent `/` ou `/api/tags` avant de faire confiance à un serveur voient un démon. Téléchargements, listes et suppressions de modèles passent sans être enregistrés ; seuls les tours de modèle sont gardés (`/api/chat`, `/api/generate`, `/api/embed`, et les équivalents OpenAI `/v1/chat/completions`, `/v1/completions`, `/v1/embeddings`).

### Changer ou désactiver le port

```bash
npx llmxray --observe-port 11500   # un autre port
npx llmxray --no-observe           # ne pas l'ouvrir
```

Sous Docker, exposez le port (`-p 11435:11435`) et utilisez `OBSERVE_PORT` ou `OBSERVE=0`. Si le port par défaut est déjà pris, la page le dit et le reste de LLMxRay fonctionne comme avant.

## La vue directe

### Constats

Des phrases simples en haut de page, chacune avec un lien vers le tour qui la prouve. Elles n'apparaissent qu'avec assez de preuves ; un tour bruyant n'en déclenche jamais une.

- **« *Client* envoie des invites de N tokens, mais *modèle* est chargé avec un contexte de M tokens. »** Le démon a rejeté la requête d'emblée, avec les deux nombres dans sa réponse : un seul tour suffit comme preuve. Le remède est la longueur de contexte dans les réglages d'Ollama ; les assistants de code demandent 32K à 64K, et ce contexte plus grand doit tenir en mémoire vidéo à côté des poids.
- **« *Client* a perdu le cache à ce tour avec *modèle* : X % conservés au tour précédent, Y % à celui-ci. »** Un seul tour, pas une médiane : le client était en cache et, à ce tour, sa part de cache a chuté de quarante points ou plus. La phrase dit d'abord si le modèle est resté chargé, d'après le temps de chargement rapporté par le démon : quelques millisecondes signifient que le cache KV était encore là et que rien n'en a été réutilisé, donc un préfixe qui ne correspondait plus, pas une éviction. Un tour où le modèle a été rechargé n'est jamais compté comme une chute. Elle donne ensuite la taille de l'invite et le token où elle a cessé de correspondre au tour précédent. Seule la dernière chute par client et modèle est affichée.
- **« *Client* relit environ N tokens à chaque tour avec *modèle*. »** La part médiane de cache sur au moins trois tours est inférieure à la moitié, et la partie recalculée fait au moins 500 tokens. La phrase nomme le token où l'invite cesse de correspondre au tour précédent, quand le démon a rapporté un compte pour l'y ramener.
- **« *Modèle* tourne à N % sur le processeur. »** D'après le rapport de chargement du démon lui-même (`/api/ps`) : la taille chargée contre la partie en mémoire vidéo. La cause habituelle est un contexte qui ne tient plus à côté des poids ; le remède habituel, un contexte plus petit ou un cache KV quantifié.
- **« Les schémas d'outils représentent N % de chaque invite de *client*. »** Les définitions d'outils occupent plus du quart de l'invite, avec le nombre de celles réellement utilisées dans les tours vus. Elles sont dans le préfixe stable, donc en cache, mais elles occupent le contexte.

### Flux des tours

Du plus récent au plus ancien : heure, client et mode (agent quand des outils étaient proposés, chat sinon), modèle, tokens d'invite, part servie depuis le cache sous forme de barre colorée, temps de préremplissage, vitesse de génération, appels d'outils. La part de cache est la seule colonne colorée : un client au préfixe rompu se voit de l'autre bout de la pièce.

Les clients sont nommés d'après leur User-Agent et la forme de la requête. Un client inconnu garde son nom de produit ; l'en-tête brut est au survol.

### Un tour en détail

Cliquez sur une ligne.

**De quoi est faite l'invite.** Une barre découpée en instructions système, schémas d'outils, historique et résultats d'outils, et votre message, ramenée au compte de tokens du démon. Le découpage est en caractères : c'est une proportion, pas un tokeniseur.

**Où le cache a rompu.** La page garde l'invite précédente du même client et du même modèle et trouve le premier caractère où celle-ci diffère. Le cache KV ne survit que sur un préfixe partagé : ce point est exactement là où la réutilisation s'est arrêtée et le recalcul a commencé. La page dit combien de tokens ont suivi, et ce qu'aurait été le préremplissage si la partie changeante était venue en dernier, extrapolé linéairement depuis le temps de préremplissage de ce tour.

Avec **Conserver le texte des invites** activé, le texte des deux côtés de la rupture s'affiche, la partie verte en cache, la rouge non. C'est ce qui vous dit *quelle* valeur a bougé : une position de curseur, un horodatage, un fragment réordonné.

**Les chiffres.** Tokens d'invite, tokens en cache, préremplissage avec le débit réel (tokens non mis en cache sur le temps de préremplissage, jamais le total), génération, appels d'outils, le contexte avec lequel le modèle a été chargé et la part qui tourne sur le processeur, le moteur, le protocole, le User-Agent.

### Par client

Une carte par client : tours, tokens, appels d'outils, préremplissage total, et **Gain si cache corrigé** : le préremplissage que ces tours auraient évité si leurs invites étaient restées en cache jusqu'au nouveau message. C'est extrapolé des chiffres de la session. Le [Labo de cache](./cache-lab) *mesure* la même chose en renvoyant une invite ; cette page ne fait qu'observer, d'où le « environ ».

## Confidentialité

Désactivé par défaut : seuls les comptes et les durées sont gardés, en mémoire, pour la session. Rien n'est écrit sur le disque.

**Conserver le texte des invites** enregistre les corps de requête dans un fichier sous votre dossier personnel (`~/.llmxray/observe/`, un fichier par jour) et affiche le texte autour de chaque rupture sur la page. Cela débloque aussi la **vue de la requête** sous le tour : la requête rendue comme une conversation, un bloc par message avec de vrais retours à la ligne, les appels d'outils en cartes, les résultats d'outils repliés, et la liste des outils avec nom, description, nombre de paramètres et taille. La rupture du cache est dessinée dans le message où elle est tombée. Une recherche couvre messages et outils, et un onglet JSON brut avec Copier et Télécharger garde chaque octet accessible. Désactivez-le et le texte conservé est retiré de la mémoire ; les fichiers restent jusqu'à ce que vous les supprimiez.

Dans les deux modes, rien ne quitte votre machine. Le port d'observation parle à l'adresse Ollama avec laquelle LLMxRay a été lancé, et à rien d'autre.

## Ce que cette page ne fait pas

Elle ne tokenise pas (les proportions sont en caractères, les comptes sont ceux du démon), elle ne garde pas les tours entre deux redémarrages, et elle ne modifie rien de ce qui la traverse. C'est une fenêtre, pas un filtre.

Ce dernier point a une conséquence visible. Une requête en flux sur le point d'entrée compatible OpenAI ne porte aucun compte de tokens sauf si le client les a demandés avec `stream_options: { include_usage: true }` ; Ollama, comme OpenAI, n'ajoute le fragment d'usage que sur demande. LLMxRay n'ajoute pas cette option à la place du client, parce que certains clients s'étrangleraient sur le fragment supplémentaire. Ces tours affichent *non rapporté* dans la colonne du cache, leur anatomie d'invite restant en place. L'API native (`/api/chat`, `/api/generate`) rapporte toujours les comptes, et c'est elle qu'utilisent la ligne de commande Ollama, les SDK Ollama et le fournisseur Ollama de VS Code Copilot.
