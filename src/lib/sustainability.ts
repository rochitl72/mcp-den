export type TransportMode = "air" | "road" | "rail" | "sea";
export type PackagingType = "plastic" | "paper" | "cardboard" | "mixed";

const EF_TRANSPORT_CO2E_G_PER_TKM: Record<TransportMode, number> = {
    air: 500,   // g CO2e per tonne-km (rough defaults; tune for production)
    road: 120,
    rail: 30,
    sea: 10,
};

const EF_PACKAGING_CO2E_G_PER_KG: Record<PackagingType, number> = {
    plastic: 3300,   // g CO2e per kg of material
    paper: 800,
    cardboard: 700,
    mixed: 1500,
};

export function estimateShippingCO2e(
    weightKg: number,
    distanceKm: number,
    transport: TransportMode
) {
    // tonne-km = (kg / 1000) * km
    const tonneKm = (weightKg / 1000) * distanceKm;
    const ef = EF_TRANSPORT_CO2E_G_PER_TKM[transport];
    const g = tonneKm * ef;
    return { gramsCO2e: Math.max(0, g), tonneKm, ef_g_per_tkm: ef };
}

export function estimatePackagingCO2e(
    packaging: PackagingType,
    packagingWeightKg = 0.2 // default 200g packaging
) {
    const ef = EF_PACKAGING_CO2E_G_PER_KG[packaging];
    const g = packagingWeightKg * ef;
    return { gramsCO2e: Math.max(0, g), packagingWeightKg, ef_g_per_kg: ef };
}

export function toKgCO2e(g: number) {
    return Number((g / 1000).toFixed(3));
}