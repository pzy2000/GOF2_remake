# GOF2 by pzy

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [Français](README.fr.md)

Une tranche verticale WebGL jouable dans le navigateur pour un jeu original de combat et de commerce spatial. Pilotez un vaisseau en vue a la troisieme personne, combattez des pirates, minez des asteroides, recuperez du fret, amarrez-vous aux stations, commercez, acceptez des missions et explorez six systèmes frontaliers plus la base dédiée PTD Home avec sauvegarde/chargement navigateur.

## Captures

| Vue | Capture |
| --- | --- |
| Menu principal | ![Menu principal presentant six systèmes frontaliers plus PTD Home, le choix de langue et les emplacements de sauvegarde](docs/screenshots/main-menu.png) |
| HUD de vol | ![HUD de vol a la troisieme personne avec jauges, checklist d'accueil, histoire, economie, statut legal et suivi des signaux](docs/screenshots/flight-hud.png) |
| Marche de station | ![Marche et services de station pour acheter, vendre, suivre les missions et lire l'etat economique local](docs/screenshots/station-market.png) |
| Carte galactique | ![Carte galactique montrant systemes decouverts, routes de station, objectifs Dispatch, histoire et Quiet Signals](docs/screenshots/galaxy-map.png) |
| Chantier de carrieres | ![Cartes de chantier naval montrant coques de carriere, traits, chemins de plans et conditions d'achat](docs/screenshots/shipyard-careers.png) |

## Lancer

```bash
npm install
npm run dev
npm run dev:full
npm run build
npm test
```

`npm run dev:full` demarre ensemble le serveur economique local faisant autorite sur `127.0.0.1:19777` et le frontend Vite. Utilisez `npm run dev` si vous voulez seulement l'economie de repli dans le navigateur.

Vous pouvez aussi utiliser le script de demarrage en un seul appel :

```bash
./start.sh
```

## Commandes

- W/S : augmenter/reduire la poussee
- A/D : roulis
- Mouvement de souris : tangage/lacet apres avoir clique dans la vue de vol
- Clic gauche : tirer au laser a impulsion, ou miner pres d'un asteroide
- Clic droit ou Space : tirer un missile a tete chercheuse
- Shift : postcombustion
- E : s'amarrer, interagir, collecter le butin
- Tab : changer de cible pirate
- M : carte galactique
- C : changer de camera
- Esc : pause

## Ressources

Les ressources raster originales ont ete generees avec `$imagegen` integre a Codex, converties en WebP, puis copiees dans `public/assets/generated/`. L'application les charge via `public/assets/generated/manifest.json`.

Ressources generees du projet :

- `key-art.webp`
- `commodity-icons.webp`
- `equipment-icons.webp`
- `nebula-bg.webp`
- `skybox-panorama.webp`
- `skybox-*.webp` par systeme stellaire
- `planet-*.webp` par planete visitable
- `ships/*.glb` pour les cinq silhouettes generees de vaisseaux joueur
- `asteroid-textures.webp`
- `faction-emblems.webp`
- `hud-overlay.webp`

Aucun pack externe d'images ou de modeles soumis au droit d'auteur n'est inclus. La scene de vol utilise des skyboxes generees par systeme comme spheres interieures verrouillees a la camera, avec `skybox-panorama.webp` et `nebula-bg.webp` conserves en fallback. Les planetes utilisent des textures WebP equirectangulaires generees sur de grandes spheres Three.js, afin que chaque station soit placee pres de son propre monde visible. Les modeles de vaisseaux joueur sont des fichiers GLB locaux generes par `scripts/generate-ship-models.mjs`; le runtime les charge via le manifest d'assets et revient a une geometrie procedurale si un modele manque. Stations, asteroides, projectiles, butin et vaisseaux de fallback utilisent des primitives Three.js. Les musiques dans `public/assets/music/` sont des pistes CC0, avec sources et licences notees dans `public/assets/music/credits.json`.

## Voyage par saut

La carte galactique cible maintenant les stations planetaires decouvertes plutot que des systemes entiers. Le vaisseau quitte la station, vole vers la porte de saut locale, amorce un transit par trou de ver et ressort pres de la station choisie au lieu de s'amarrer automatiquement. Les systemes connus revelent leur planete principale par defaut. Les autres planetes apparaissent en vol local comme des cibles Unknown Beacon et deviennent des destinations de saut lorsque le joueur entre dans la portee de scan. Les entrees de pilotage manuel annulent l'autopilote pendant les phases de navigation; une fois la charge de porte ou le trou de ver commence, le transit se termine.

## Commerce et contrats

Les marches de station suivent le stock sauvegarde, la demande et le retour vers la baseline. Acheter reduit le stock local et fait monter les prix d'achat; vendre augmente le stock et calme la demande. Le backend economique local REST + SSE simule globalement mineurs, coursiers, cargos, marchands et contrebandiers NPC, puis renvoie dans le jeu les evenements de marche et le trafic NPC visible. L'onglet Economy de station sert aussi de Dispatch Board : les courses legales de ravitaillement et les livraisons de contrebande peuvent etre acceptees, routees, suivies sur le HUD/la carte, puis terminees avec effet sur la pression de marche.

Les contrats utilisent le temps de bord sauvegarde. Les missions de courrier, fret, passagers, minage, prime, escorte, recuperation et dispatch ont des delais et consequences de reputation. Les contrats passagers reservent de la capacite cargo, le transport consomme les biens fournis par le joueur a la livraison, les missions d'escorte font apparaitre un convoi en vol et les missions de recuperation font apparaitre des caisses recuperables. Les NPC economiques visibles peuvent etre contactes, escortes, braques, secourus ou signales; quand le service local est en ligne, braquage, secours et signalement ecrivent leurs consequences backend.

L'histoire principale est Glass Wake Protocol, une chaine de 13 chapitres autour d'une sonde Mirr, de balises commerciales usurpees, de pirates relais d'Ashen, des Unknown Drones, des cibles Echo Lock et du Listener Scar. Les stations incluent un onglet Captain's Log qui suit la progression des chapitres, les objectifs courants, les echecs rejouables et les journaux d'histoire debloques sans ajouter d'etat de sauvegarde dedie.

## Vaisseaux et equipement

L'equipement utilise un modele de loadout de vaisseau plus inventaire. Les modules primaires, secondaires, utilitaires, defensifs et d'ingenierie consomment les emplacements correspondants. Installer retire un objet de l'inventaire, decharger le remet dans l'inventaire, et les armes actives viennent de l'ordre du loadout installe. La fabrication du Blueprint Workshop consomme credits et materiaux de fret puis ajoute le resultat a l'inventaire au lieu de l'installer automatiquement. Les routes d'equipement de carriere soutiennent les builds minage, contrebande, combat et exploration.

La flotte compte neuf coques jouables sur cinq silhouettes GLB generees : les carrieres starter, hauler, miner, smuggler, fighter, gunship et explorer ont maintenant des stats, emplacements, traits, loadouts et conditions d'achat distincts. Acheter un nouveau vaisseau installe son loadout d'origine et stocke l'ancienne coque avec son equipement installe a la station dediee PTD Home. Les vaisseaux stockes ne peuvent etre repris gratuitement que lorsque vous etes amarres a PTD Home.

## Sauvegardes, donnees et audio

Le systeme de sauvegarde du navigateur utilise trois emplacements manuels plus un emplacement auto/rapide. Les anciens saves v1 a emplacement unique sont migres dans l'emplacement auto lors de la premiere lecture de l'index v2. Les metadonnees affichent systeme, etat station/vol, credits, temps de jeu, date de sauvegarde et version.

Le contenu du jeu est separe en modules de donnees fortement types pour marchandises, vaisseaux/equipements, systemes/stations, factions et missions, avec des tests de validation pour les ids dupliques et references cassees.

L'audio utilise un runtime hybride : SFX, alertes et musique fallback sont synthetises avec la Web Audio API, tandis que les pistes de fond CC0 sont routees selon le systeme courant, l'archetype de station et l'etat de combat. Le manifest d'assets mappe les themes de vol, de station et de combat vers les fichiers `public/assets/music/`; si une piste externe ne peut pas etre lue, la couche musicale procedurale prend le relais. Les parametres incluent volume general, SFX, musique, voix et muet.

## Limites connues

C'est une tranche verticale, pas une campagne complete. Le backend economique faisant autorite est un service de developpement local; s'il est hors ligne, le navigateur revient a une simulation locale du marche afin que le commerce reste jouable, tandis que les evenements NPC/economie dependants du backend se degradent proprement. Les spritesheets de marchandises, equipements et factions sont decoupees dans l'UI via positionnement CSS d'atlas. Les SFX proceduraux et la musique fallback restent volontairement legers, tandis que la couverture BGM creee a la main est limitee a l'ensemble actuel de pistes CC0.
