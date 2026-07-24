// Lista corta de regiones habituales. No es el listado completo de TMDB (~200 paises):
// se puede pedir que se amplie mas adelante si hace falta buscar un pais que no este aqui.

export type Region = { code: string; name: string };

export const REGIONS: Region[] = [
  { code: "ES", name: "España" },
  { code: "US", name: "Estados Unidos" },
  { code: "MX", name: "México" },
  { code: "AR", name: "Argentina" },
  { code: "CO", name: "Colombia" },
  { code: "CL", name: "Chile" },
  { code: "PE", name: "Perú" },
  { code: "BR", name: "Brasil" },
  { code: "FR", name: "Francia" },
  { code: "DE", name: "Alemania" },
  { code: "GB", name: "Reino Unido" },
  { code: "IT", name: "Italia" },
  { code: "PT", name: "Portugal" },
];

export const DEFAULT_REGION = "ES";
