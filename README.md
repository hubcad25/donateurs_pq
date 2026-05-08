Dans ce projet, on veut identifier les codes postaux qui 1. donnent au PQ 2. ont un revenu élevé et d'autres variables socio demo pertinentes à notre objectif.

L'objectif est d'identifier des endroits propices à aller "quêter" de l'argent pour un think tank qui aurait comme mandat: comprendre scientifiquement ce qui convainc les Québécois de la souveraineté, pour que les organisations du mouvement communiquent plus efficacement

L'output je crois pourrait être un genre de React hosté sur Netlify où on peut naviguer dans une map interactive, zoomer etc. mais aussi pt un genre de dataviewer?

Est-ce qu'on aurait besoin d'un backend complexe pour les données où on pourrait simplement packager ça en amont pour que les données sur le UI soient légères?

Données des donateurs:
    - https://api.electionsquebec.qc.ca/donateurs/recherche-provincial/?debut_page=0&nombre_ligne_retourner=20&entite=PAR&type_contribution=GCE&col_tri=annee&ordre_tri=desc
    OU
    - https://donnees.electionsquebec.qc.ca/production/provincial/financement/contribution/contributions-pro-fr.csv
        (encoding à régler ici)

Via le package R cancensus pour les données socio-demo: https://cran.r-project.org/web/packages/cancensus/vignettes/cancensus.html
    (j'ai déjà une API key)

Les geocodes json ou shapefiles par code postal 6 chiffres
    Je sais pas où trouver ça exactement live, facile à trouver