import { priceInsight } from '@/lib/channel3';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id || id.length > 250) return Response.json(null, { status: 400 });
  const insight = await priceInsight(id).catch(() => null);
  return Response.json(insight, { headers: { 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
}
