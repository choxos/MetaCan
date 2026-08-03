import model from '@/data/distillation_model.json'
import predictions from '@/data/frame_predictions.json'
import { json, OPTIONS } from '@/lib/api'

export { OPTIONS }

export async function GET() {
  return json({
    meta: {
      sources: {
        model: 'pilot/results/distillation_model.json',
        predictions: 'data/db/frame_predictions_v3.meta.json',
      },
      evidence_level: 'machine_not_human_accuracy',
      note: 'All predictions are machine_predicted_unvalidated. The Gemma side is a direct title-only model label for every work; the Codex side is a distilled classifier calibrated to design-weighted sample rates and support-gated per head. Candidate is the union of the two sides; consensus is their intersection. Scores are not calibrated probabilities.',
    },
    predictions,
    model,
  })
}
