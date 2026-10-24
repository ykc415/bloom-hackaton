import { getProductDetail } from '@/lib/channel3';
import { AppError, userMessage } from '@/lib/server';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id || id.length > 250) return Response.json({ error: 'Invalid product.' }, { status: 400 });
  const requested: Record<string, string> = {};
  for (const [key, value] of new URL(request.url).searchParams) {
    if (key.startsWith('option_') && key.length <= 107 && value.length <= 200) requested[key.slice(7)] = value;
  }
  if (Object.keys(requested).length > 6) return Response.json({ error: 'Too many options.' }, { status: 400 });
  try {
    return Response.json(await getProductDetail(id, requested), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: userMessage(error) }, { status: error instanceof AppError ? 404 : 502 });
  }
}
