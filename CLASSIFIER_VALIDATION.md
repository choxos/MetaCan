# MétaCan classifier validation

Validation date: 2026-07-15

## Decision

| Question | Decision |
|---|---|
| Is the training input complete, schema valid, and reproducible? | Pass |
| Does the artifact reproduce its recorded internal evaluation? | Pass |
| Was the classifier applied to every work in the frozen frame? | Pass |
| Is human classification accuracy established? | No |
| Is the output suitable for prevalence estimation or automatic inclusion? | No |
| Is the output operationally available for unvalidated ranking and sampling? | Yes, with the limitations below |

The release is a teacher imitation classifier. It predicts the labels of two machine screening arms. It is not a human validated classifier, and its scores are not calibrated probabilities of field membership.

## Training contract

The training input contains 10,348 sampled works. The Codex and Gemma files each contain exactly one schema valid label for every sampled identifier. Records marked `insufficient_payload` are unknown for every head rather than negative.

Evaluation uses five venue grouped folds. A venue cannot appear in both the training and held out portion of a fold. Missing venues are assigned work specific groups. The vectorizer is fitted inside each training fold, and the recorded sampling weights are used for evaluation. Thresholds prioritize recall through weighted F2.

The artifact contains 39 available binary heads from 40 possible teacher and target pairs. Gemma `design_other` is unavailable because its support is insufficient. The unavailable head remains explicit in the metadata and does not silently produce a score.

## Internal metaresearch evaluation

Average precision and AUROC use all out-of-fold scores. Precision, recall, and F2 use thresholds selected without the evaluated fold.

| Teacher target | Positive support | Average precision | AUROC | Precision | Recall | F2 |
|---|---:|---:|---:|---:|---:|---:|
| Codex metaresearch | 1,300 | 0.348 | 0.903 | 0.122 | 0.380 | 0.267 |
| Gemma metaresearch | 1,454 | 0.210 | 0.887 | 0.116 | 0.456 | 0.288 |

The deployment thresholds are 0.096616 for Codex and 0.048092 for Gemma. At those thresholds, the candidate union is deliberately recall oriented. Against the Codex labels it has weighted precision 0.062 and recall 0.705. Against the Gemma labels it has weighted precision 0.125 and recall 0.562. These union figures reuse deployment thresholds selected from the same out-of-fold scores, so they are descriptive rather than an independent estimate.

The consensus intersection is more selective. Against Codex it has weighted precision 0.134 and recall 0.279. Against Gemma it has weighted precision 0.246 and recall 0.202. Neither decision rule is a gold standard label.

## Full-frame application

The verified application covers all 4,299,418 works in the frozen frame. It ran in 43 fixed partitions. Verification checks every partition against the source slice, model, feature contract, output schema, ordered identifiers, and file hash before accepting the assembled Parquet file.

| Contract field | Verified value |
|---|---|
| Classifier version | `metacan-v1-d91a1de5be90` |
| Frame rows | 4,299,418 |
| Partition count | 43 |
| Application fingerprint | `ad169128802653547cc91bff5b2cb30639daccb3094fda54b601e33586ed131c` |
| Frame SHA256 | `267cc14e52543ffee03957f84bbbd1099eca48337cd05f01be0067b86cdda274` |
| Ordered identifier SHA256 | `f53f6d4f89aaecff6edf46d9d8ae97976efcde078d81df10a9142f1b1e6cdce5` |
| Model SHA256 | `2aa7c89b5df35a262221ad33daf49f52df8ec66a488455cdacce4ff2b3ced617` |
| Output SHA256 | `cfa3252c9ba1ce0864a52300a57c9cf0b8972774f3515b009496f90fc6145cc7` |

The production database also reports 4,299,418 classified works for this exact version. The metaresearch candidate union contains 252,466 works, and the consensus intersection contains 84,002 works.

## Interpretation

The classifier is operationally available for unvalidated ranking, candidate retrieval, and sample allocation. Its human retrieval performance is unknown. It must not be presented as a validated estimate of the size or composition of Canadian metaresearch. A human labelled reference set is required before making that claim.
