import { NextRequest, NextResponse } from 'next/server';

const SUNAT_SERVICE = process.env.SUNAT_SERVICE_URL || 'http://127.0.0.1:8000';

export async function GET(req: NextRequest) {
  const nombre = new URL(req.url).searchParams.get('nombre')?.trim() ?? '';

  if (nombre.length < 3) {
    return NextResponse.json(
      { error: 'Ingresa al menos 3 caracteres' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `${SUNAT_SERVICE}/consultar-nombre?nombre=${encodeURIComponent(nombre)}`,
      { signal: AbortSignal.timeout(30000) }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: (err as any).detail || 'Error consultando SUNAT' },
        { status: res.status }
      );
    }

    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json(
      { error: 'No se pudo conectar con el servicio SUNAT' },
      { status: 503 }
    );
  }
}
