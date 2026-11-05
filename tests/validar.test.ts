import { describe, expect, it } from "vitest";
import { Convite, Id, Kind, valido } from "@/lib/validar";

describe("validação das ações do servidor", () => {
  it("aceita ids uuid e recusa o resto", () => {
    expect(valido([Id, "7e07d9f6-e527-4136-ba18-08e9040cd84e"])).toBe(true);
    expect(valido([Id, "1; drop table eventos"])).toBe(false);
    expect(valido([Kind, "evento"], [Id, "x"])).toBe(false);
  });

  it("normaliza o email do convite", () => {
    const r = Convite.safeParse({ email: "  Ana@Exemplo.PT ", nome: "Ana", role: "membro", atleta: true });
    expect(r.success && r.data.email).toBe("ana@exemplo.pt");
    expect(Convite.safeParse({ email: "não-é-email", nome: "", role: "membro", atleta: false }).success).toBe(false);
  });
});
