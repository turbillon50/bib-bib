import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDirections, mapsErrorResponse } from '@/lib/google-maps-server';

export const dynamic = 'force-dynamic';

// GET /api/maps/directions?origin=lat,lng|address&destination=lat,lng|address&mode=driving
export async function GET(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const origin = sp.get('origin');
  const destination = sp.get('destination');
  const mode = sp.get('mode') ?? 'driving';

  if (!origin || !destination) {
    return NextResponse.json({ error: 'Faltan parámetros: origin y destination' }, { status: 400 });
  }

  try {
    const route = await getDirections(origin, destination, mode);
    if (!route) return NextResponse.json({ error: 'Sin ruta encontrada' }, { status: 404 });
    return NextResponse.json({ route });
  } catch (err) {
    const { body, status } = mapsErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
