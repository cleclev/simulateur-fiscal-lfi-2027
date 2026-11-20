# Simulateur fiscal 2026–2027

Application web autonome, sans serveur ni dépendance, basée sur le document « Comparatif Fiscal Programme LFI 2027.pdf ».

## Utilisation

Ouvrez directement `index.html` dans un navigateur récent. Tous les calculs sont locaux; aucun serveur, Node.js ou paquet externe n'est nécessaire.

## Fichiers

- `index.html` : parcours en cinq étapes, paramètres hybrides, impression et résultats.
- `style.css` : identité responsive et mise en page A4 `@media print`.
- `calculator.js` : moteur fiscal, social, patrimonial et successoral.
- `app.js` : navigation, profils, URL, partage et graphiques SVG.

## Hypothèses

- Les revenus mensuels sont convertis sur douze mois et les barèmes sont appliqués au RNI annuel fourni. Les profils du document sont ainsi cohérents sans déduction forfaitaire supplémentaire.
- Pour un couple marié ou pacsé, le régime 2026 utilise l'imposition commune à trois parts avec deux enfants. L'exercice 2027 individualise les revenus des conjoints.
- Le plafond d'avantage du quotient familial est fixé à 1 807 € par demi-part, avec décote 2026.
- Les gains financiers 2026 utilisent le PFU à 31,40 %. Le scénario 2027 les réintègre dans le barème + 18,6 % de prélèvements sociaux.
- Les barèmes à 14 tranches, le crédit enfant, l'ISF climatique et les tranches successorales exactes restent des scénarios paramétrables lorsqu'ils ne sont pas publiés.
- La réquisition immobilière est estimée proportionnellement aux logements excédant le cinquième bien.

## Sources principales

`L'Avenir en commun 2027 – Nouvelle France`, contre-budget du 6 octobre 2026, Plan BTP et logement, Plan abolir la pauvreté, ainsi que les références citées aux pages 16–17 du document joint:

- https://melenchon2027.fr/
- https://lafranceinsoumise.fr/
- https://www.economie.gouv.fr/
- https://www.assemblee-nationale.fr/

Cette simulation reste pédagogique. Les mesures sont soumises au calendrier parlementaire, au Conseil constitutionnel, à la CEDH et au droit européen.
