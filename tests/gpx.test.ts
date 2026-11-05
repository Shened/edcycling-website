import { describe, expect, it } from "vitest";
import { distanciaKm, fmtDuracao, fmtKm, ganhoAltitude } from "@/lib/gpx";

describe("GPX", () => {
  it("D+ ignora oscilações abaixo de 3 m (ruído do GPS)", () => {
    expect(ganhoAltitude([100, 102, 100, 102, 100])).toBe(0);
    // sobe 10, desce 5 (conta como descida real), sobe 15
    expect(ganhoAltitude([100, 110, 105, 120])).toBe(25);
  });

  it("distância entre dois pontos a 1 grau de latitude ≈ 111 km", () => {
    expect(distanciaKm([[41, -8.5], [42, -8.5]])).toBeCloseTo(111.2, 0);
  });

  it("formata durações sem nunca mostrar 60 minutos", () => {
    expect(fmtDuracao(5400)).toBe("1h30");
    expect(fmtDuracao(3599)).toBe("1h00");
    expect(fmtDuracao(null)).toBe("");
  });

  it("formata km com uma casa decimal abaixo de 100", () => {
    expect(fmtKm(45.32)).toBe("45,3");
    expect(fmtKm(202.4)).toBe("202");
  });
});

describe("horasMin", () => {
  it("separa horas e minutos sem dar 60 minutos", async () => {
    const { horasMin } = await import("@/lib/gpx");
    expect(horasMin(3599)).toEqual({ h: 1, m: 0 });
    expect(horasMin(5400)).toEqual({ h: 1, m: 30 });
  });
});
