import type { Lang } from "@/lib/lang";

const COPY = {
  en: {
    title: "Screening evidence",
    source: "Label source",
    direct: "Direct machine screening",
    classifier: "Classifier predictions",
    category: "Category",
    anyCategory: "Any category",
    design: "Study design",
    anyDesign: "Any design",
    agreement: "Direct agreement",
    anyAgreement: "Any direct screener",
    allAgreement: "All direct screeners",
    directCoverage: "Direct coverage",
    anyDirectCoverage: "Any coverage",
    directOnly: "Screened directly",
    directNone: "Not screened directly",
    mode: "Prediction mode",
    candidate: "Candidate union",
    consensus: "Consensus intersection",
    classifierCoverage: "Classifier coverage",
    anyClassifierCoverage: "Any coverage",
    classifiedOnly: "Classified",
    classifiedNone: "Not classified",
    version: "Classifier version",
    activeVersion: "Active version",
    directHint:
      "Direct labels are sparse and unvalidated. Missing labels are unknown.",
    classifierHint:
      "Predictions imitate two machine teachers. Scores are not calibrated prevalence probabilities.",
    predicted: "Classifier candidate",
    predictionConsensus: "Classifier consensus",
    predictionUnavailable:
      "No classifier prediction is available for this work.",
    releaseUnavailable: "No classifier release is available for this query.",
    predictionTitle: "Classifier prediction",
    scores: "Teacher imitation scores",
    versionLabel: "Version",
  },
  fr: {
    title: "Données de dépistage",
    source: "Source des étiquettes",
    direct: "Dépistage automatique direct",
    classifier: "Prédictions du classificateur",
    category: "Catégorie",
    anyCategory: "Toute catégorie",
    design: "Plan d’étude",
    anyDesign: "Tout plan d’étude",
    agreement: "Accord direct",
    anyAgreement: "Au moins un dépisteur direct",
    allAgreement: "Tous les dépisteurs directs",
    directCoverage: "Couverture directe",
    anyDirectCoverage: "Toute couverture",
    directOnly: "Dépisté directement",
    directNone: "Non dépisté directement",
    mode: "Mode de prédiction",
    candidate: "Union des candidats",
    consensus: "Intersection consensuelle",
    classifierCoverage: "Couverture du classificateur",
    anyClassifierCoverage: "Toute couverture",
    classifiedOnly: "Classifié",
    classifiedNone: "Non classifié",
    version: "Version du classificateur",
    activeVersion: "Version active",
    directHint:
      "Les étiquettes directes sont rares et non validées. Une absence reste inconnue.",
    classifierHint:
      "Les prédictions imitent deux enseignants automatiques. Les scores ne sont pas des probabilités de prévalence calibrées.",
    predicted: "Candidat du classificateur",
    predictionConsensus: "Consensus du classificateur",
    predictionUnavailable:
      "Aucune prédiction du classificateur n’est disponible pour ce travail.",
    releaseUnavailable:
      "Aucune version du classificateur n’est disponible pour cette requête.",
    predictionTitle: "Prédiction du classificateur",
    scores: "Scores d’imitation des enseignants",
    versionLabel: "Version",
  },
} as const;

export function classifierCopy(lang: Lang) {
  return COPY[lang];
}
