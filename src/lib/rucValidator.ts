/**
 * Validador de RUC peruano (módulo 11).
 *
 * El RUC son 11 dígitos numéricos. El último es dígito verificador
 * calculado con la siguiente fórmula (SUNAT):
 *
 *   sum   = Σ d_i × p_i, con pesos [5,4,3,2,7,6,5,4,3,2] sobre los
 *           primeros 10 dígitos
 *   resto = 11 - (sum % 11)
 *   dv    = resto si resto < 10, 0 si resto = 11, 1 si resto = 10
 *
 * Prefijos comunes:
 *   10 → persona natural con DNI
 *   15 → persona natural sin DNI
 *   17 → persona natural extranjera
 *   20 → persona jurídica
 *   25 → persona jurídica (otras entidades)
 */

export type RucKind = 'persona_natural' | 'persona_juridica' | 'desconocido';

export interface RucValidation {
  ok: boolean;
  reason?: 'longitud' | 'no_numerico' | 'prefijo' | 'digito_verificador';
  kind: RucKind;
}

const VALID_PREFIXES: Record<string, RucKind> = {
  '10': 'persona_natural',
  '15': 'persona_natural',
  '17': 'persona_natural',
  '20': 'persona_juridica',
  '25': 'persona_juridica',
};

const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;

/** Devuelve true si el RUC es de 11 dígitos numéricos (formato base). */
export function isValidRucFormat(ruc: string): boolean {
  return /^\d{11}$/.test(ruc);
}

/** Calcula el dígito verificador esperado para los primeros 10 dígitos. */
export function computeRucCheckDigit(first10Digits: string): number | null {
  if (!/^\d{10}$/.test(first10Digits)) return null;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(first10Digits[i]) * WEIGHTS[i];
  }
  const mod = sum % 11;
  const dv = 11 - mod;
  if (dv === 11) return 0;
  if (dv === 10) return 1;
  return dv;
}

/** Validación completa: formato + prefijo conocido + dígito verificador. */
export function validateRuc(ruc: string): RucValidation {
  const cleaned = (ruc ?? '').trim();

  if (cleaned === '' || !/^\d+$/.test(cleaned)) {
    return { ok: false, reason: 'no_numerico', kind: 'desconocido' };
  }
  if (cleaned.length !== 11) {
    return { ok: false, reason: 'longitud', kind: 'desconocido' };
  }

  const prefix = cleaned.slice(0, 2);
  const kind = VALID_PREFIXES[prefix] ?? 'desconocido';
  if (kind === 'desconocido') {
    return { ok: false, reason: 'prefijo', kind };
  }

  const expected = computeRucCheckDigit(cleaned.slice(0, 10));
  const actual   = Number(cleaned[10]);
  if (expected === null || expected !== actual) {
    return { ok: false, reason: 'digito_verificador', kind };
  }

  return { ok: true, kind };
}

/** Mensaje legible para mostrar al usuario según la razón del fallo. */
export function rucValidationMessage(v: RucValidation): string | null {
  if (v.ok) return null;
  switch (v.reason) {
    case 'longitud':
      return 'El RUC debe tener 11 dígitos.';
    case 'no_numerico':
      return 'El RUC solo admite números.';
    case 'prefijo':
      return 'El RUC debe empezar con 10, 15, 17, 20 o 25.';
    case 'digito_verificador':
      return 'El RUC ingresado no es válido (dígito verificador incorrecto).';
    default:
      return 'RUC inválido.';
  }
}
