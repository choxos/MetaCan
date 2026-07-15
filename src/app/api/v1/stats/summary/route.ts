import { getSummary } from "@/lib/stats";
import { json, OPTIONS } from "@/lib/api";

export const dynamic = "force-dynamic";
export { OPTIONS };

export async function GET() {
  return json(await getSummary());
}
