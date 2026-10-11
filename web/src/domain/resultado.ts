/** Resultado de un caso de uso: éxito con valor, o error con mensaje para el usuario. */
export type Resultado<T = void> = { ok: true; valor: T } | { ok: false; error: string };
export const exito = <T>(valor: T): Resultado<T> => ({ ok: true, valor });
export const falla = <T = never>(error: string): Resultado<T> => ({ ok: false, error });
