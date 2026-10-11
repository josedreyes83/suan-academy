export type Tema = "oscuro" | "claro";
export const TEMA_COOKIE = "suan_tema";
export const temaDesde = (valor: string | undefined | null): Tema => (valor === "claro" ? "claro" : "oscuro");
