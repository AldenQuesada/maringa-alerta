"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fluxo = require("../fluxo-ajuda.js");

const agora = 1700000000000;
const ocorrencia = (id, extra = {}) => ({ id, tenantId: "maringa", confirmado: true, tipo: "Distribuição de água e alimentos", bairro: "Zona 7", pos: [-23.4, -51.94], status: "ativa", gravidade: 2, reportadoEm: agora - 300000, ...extra });
const voluntario = (id, extra = {}) => ({ id, tenantId: "maringa", bairro: "Zona 7", pos: [-23.4, -51.94], contribuicoes: ["Comida"], alertaPreferencia: "todos", disponibilidadeZona: "somente_minha", ativo: false, ...extra });

test("só uma ocorrência confirmada pode gerar convites", () => {
  const o = ocorrencia("a", { confirmado: false });
  const v = voluntario("v1");
  assert.equal(fluxo.ativar(o, [v], [o]).motivo, "ocorrencia_nao_confirmada");
  assert.equal(o.participacoes, undefined);
  assert.equal(v.ativo, false);
  o.confirmado = true;
  assert.deepEqual(fluxo.ativar(o, [v], [o], { agora, limite: 1 }).novos, ["v1"]);
  assert.equal(o.status, "ativa");
  assert.equal(o.confirmadoEm, undefined);
});

test("filtra município, disponibilidade, preferência, zona e habilidade antes da proximidade", () => {
  const o = ocorrencia("a");
  const vs = [
    voluntario("outra-cidade", { tenantId: "exemplo" }),
    voluntario("indisponivel", { disponivel: false }),
    voluntario("depois", { alertaPreferencia: "depois" }),
    voluntario("antes", { alertaPreferencia: "antes" }),
    voluntario("outra-zona", { bairro: "Centro" }),
    voluntario("incompativel", { contribuicoes: ["Gerador"] }),
    voluntario("longe", { distanciaTeste: 900 }),
    voluntario("perto", { contribuicoes: ["Mão de obra"], distanciaTeste: 50 }),
    voluntario("disponivel-fora", { bairro: "Centro", disponibilidadeZona: "qualquer_zona", distanciaTeste: 300 })
  ];
  const result = fluxo.ativar(o, vs, [o], { agora, distancia: (v, alvo) => {
    assert.equal(alvo, o);
    return v.distanciaTeste || 1;
  } });
  assert.deepEqual(result.novos, ["perto", "disponivel-fora"]);
  assert.equal(result.faltam, 0);
  assert.equal(vs.find(v => v.id === "outra-cidade").ativo, false);
});

test("duas ocorrências concorrentes não reservam a mesma pessoa e repetir acionamento não duplica", () => {
  const a = ocorrencia("a"), b = ocorrencia("b");
  const vs = [voluntario("v1"), voluntario("v2"), voluntario("v3")];
  const opts = { agora, limite: 2 };
  assert.deepEqual(fluxo.ativar(a, vs, [a, b], opts).novos, ["v1", "v2"]);
  assert.deepEqual(fluxo.ativar(a, vs, [a, b], opts).novos, []);
  assert.deepEqual(fluxo.ativar(b, vs, [a, b], opts).novos, ["v3"]);
  assert.equal(b.ajudantesNecessarios, 2);
  assert.equal(a.participacoes.length, 2);
  assert.equal(b.participacoes.length, 1);
  assert.equal(vs.every(v => v.ativo), true);
});

test("chegada e término são individuais e repetíveis sem mudar horários nem encerrar outra participação", () => {
  const o = ocorrencia("a");
  const vs = [voluntario("v1"), voluntario("v2")];
  fluxo.ativar(o, vs, [o], { agora });
  assert.equal(fluxo.terminar(o, "v1", agora).motivo, "chegada_nao_registrada");
  fluxo.chegar(o, "v1", agora + 60000);
  fluxo.chegar(o, "v2", agora + 90000);
  assert.equal(fluxo.chegar(o, "v1", agora + 120000).repetida, true);
  assert.equal(o.confirmadoEm, agora + 60000);
  assert.equal(o.participacoes[0].chegouEm, agora + 60000);
  assert.equal(fluxo.terminar(o, "v1", agora + 300000).resolvida, false);
  fluxo.sincronizarDisponibilidade(vs, [o]);
  assert.equal(vs[0].ativo, false);
  assert.equal(vs[1].ativo, true);
  assert.equal(o.status, "em_atendimento");
  assert.equal(fluxo.terminar(o, "v2", agora + 600000).resolvida, true);
  const estado = JSON.stringify(o);
  assert.equal(fluxo.terminar(o, "v2", agora + 660000).repetida, true);
  assert.equal(fluxo.chegar(o, "v2", agora + 720000).repetida, true);
  assert.equal(JSON.stringify(o), estado);
  fluxo.sincronizarDisponibilidade(vs, [o]);
  assert.equal(vs.every(v => !v.ativo), true);
  assert.equal(o.tempoChegada, 6);
  assert.equal(o.tempoAtendimento, 9);
  assert.equal(o.tempoReal, 15);
});

test("uma pessoa pode receber novo convite após terminar, mesmo com a ocorrência anterior aberta", () => {
  const a = ocorrencia("a"), b = ocorrencia("b");
  const vs = [voluntario("v1"), voluntario("v2")];
  fluxo.ativar(a, vs, [a, b], { agora });
  fluxo.chegar(a, "v1", agora + 1000);
  fluxo.terminar(a, "v1", agora + 2000);
  assert.notEqual(a.status, "resolvida");
  assert.deepEqual(fluxo.ativar(b, vs, [a, b], { agora: agora + 3000, limite: 1 }).novos, ["v1"]);
  fluxo.chegar(a, "v2", agora + 4000);
  fluxo.terminar(a, "v2", agora + 5000);
  fluxo.sincronizarDisponibilidade(vs, [a, b]);
  assert.equal(a.status, "resolvida");
  assert.equal(vs[0].ativo, true);
  assert.equal(vs[1].ativo, false);
});

test("falta de recurso e recusa não são confundidas com necessidade atendida", () => {
  const o = ocorrencia("a");
  const vs = [voluntario("v1")];
  assert.equal(fluxo.ativar(o, vs, [o], { agora }).faltam, 1);
  fluxo.chegar(o, "v1", agora + 1000);
  assert.equal(fluxo.terminar(o, "v1", agora + 2000).resolvida, false);
  vs.push(voluntario("v2"), voluntario("v3"));
  assert.deepEqual(fluxo.ativar(o, vs, [o], { agora }).novos, ["v2"]);
  assert.equal(fluxo.recusar(o, "v2", agora + 3000).ok, true);
  assert.equal(fluxo.recusar(o, "v2", agora + 4000).repetida, true);
  assert.deepEqual(fluxo.ativar(o, vs, [o], { agora }).novos, ["v3"]);
  fluxo.chegar(o, "v3", agora + 5000);
  assert.equal(fluxo.terminar(o, "v3", agora + 6000).resolvida, true);
  assert.equal(o.participacoes.filter(p => p.status === "concluida").length, 2);
});

test("pendência técnica mantém a ocorrência aberta e libera a pessoa que terminou", () => {
  const o = ocorrencia("a", { pendenciaTecnica: true });
  const vs = [voluntario("v1")];
  fluxo.ativar(o, vs, [o], { agora, limite: 1 });
  fluxo.chegar(o, "v1", agora + 1000);
  assert.equal(fluxo.terminar(o, "v1", agora + 2000).resolvida, false);
  fluxo.sincronizarDisponibilidade(vs, [o]);
  assert.equal(vs[0].ativo, false);
  assert.notEqual(o.status, "resolvida");
  o.pendenciaTecnica = false;
  assert.equal(fluxo.ativar(o, vs, [o], { agora: agora + 3000 }).resolvida, true);
});

test("equipe conclui a ajuda restante primeiro e a última confirmação do voluntário encerra a ocorrência", () => {
  const o = ocorrencia("a");
  const vs = [voluntario("v1")];
  assert.equal(fluxo.ativar(o, vs, [o], { agora, limite: 2 }).faltam, 1);
  o.atendimentoEquipe = { status: "concluida" };
  o.pendenciaTecnica = false;
  // Convite pendente continua ativo, mesmo depois de a equipe terminar.
  assert.equal(fluxo.ativar(o, vs, [o], { agora: agora + 1000 }).resolvida, false);
  assert.notEqual(o.status, "resolvida");
  assert.equal(fluxo.chegar(o, "v1", agora + 2000).ok, true);
  assert.equal(fluxo.terminar(o, "v1", agora + 3000).resolvida, true);
  assert.equal(o.participacoes.filter(p => p.status === "concluida").length, 1);
  assert.equal(o.ajudantesNecessarios, 2);
  fluxo.sincronizarDisponibilidade(vs, [o]);
  assert.equal(vs[0].ativo, false);
  const resolvidoEm = o.resolvidoEm;
  assert.equal(fluxo.terminar(o, "v1", agora + 4000).repetida, true);
  assert.equal(o.resolvidoEm, resolvidoEm);
});

test("voluntários terminam primeiro e ficam livres enquanto a equipe ainda atende", () => {
  for (const quantidadeDisponivel of [1, 2]) {
    const o = ocorrencia("a");
    const vs = Array.from({ length: quantidadeDisponivel }, (_, i) => voluntario("v" + i));
    fluxo.ativar(o, vs, [o], { agora, limite: 2 });
    o.atendimentoEquipe = { status: "no_local" };
    // O estado da equipe também bloqueia conclusão se a flag técnica estiver ausente.
    o.pendenciaTecnica = false;
    for (const v of vs) {
      fluxo.chegar(o, v.id, agora + 1000);
      assert.equal(fluxo.terminar(o, v.id, agora + 2000).resolvida, false);
    }
    fluxo.sincronizarDisponibilidade(vs, [o]);
    assert.equal(vs.every(v => !v.ativo), true);
    assert.notEqual(o.status, "resolvida");
    o.atendimentoEquipe.status = "concluida";
    assert.equal(fluxo.ativar(o, vs, [o], { agora: agora + 3000 }).resolvida, true);
  }
});

test("conclusão da equipe não encerra outro participante convidado ou já no local", () => {
  for (const outroJaChegou of [false, true]) {
    const o = ocorrencia("a");
    const vs = [voluntario("v1"), voluntario("v2")];
    fluxo.ativar(o, vs, [o], { agora, limite: 3 });
    o.atendimentoEquipe = { status: "concluida" };
    o.pendenciaTecnica = false;
    fluxo.chegar(o, "v1", agora + 1000);
    if (outroJaChegou) fluxo.chegar(o, "v2", agora + 1000);
    assert.equal(fluxo.terminar(o, "v1", agora + 2000).resolvida, false);
    fluxo.sincronizarDisponibilidade(vs, [o]);
    assert.equal(vs[0].ativo, false);
    assert.equal(vs[1].ativo, true);
    if (!outroJaChegou) fluxo.chegar(o, "v2", agora + 3000);
    assert.equal(fluxo.terminar(o, "v2", agora + 4000).resolvida, true);
  }
});

test("equipe concluída não ignora pendência técnica ou encaminhamento especializado pendente", () => {
  for (const bloqueio of ["tecnica", "especializado"]) {
    const o = ocorrencia("a");
    const vs = [voluntario("v1")];
    fluxo.ativar(o, vs, [o], { agora, limite: 2 });
    o.atendimentoEquipe = { status: "concluida" };
    if (bloqueio === "tecnica") o.pendenciaTecnica = true;
    else o.encaminhamentoEspecializado = { status: "pendente" };
    fluxo.chegar(o, "v1", agora + 1000);
    assert.equal(fluxo.terminar(o, "v1", agora + 2000).resolvida, false);
    fluxo.sincronizarDisponibilidade(vs, [o]);
    assert.equal(vs[0].ativo, false);
    assert.notEqual(o.status, "resolvida");
    if (bloqueio === "tecnica") o.pendenciaTecnica = false;
    else o.encaminhamentoEspecializado.status = "concluido";
    assert.equal(fluxo.ativar(o, vs, [o], { agora: agora + 3000 }).resolvida, true);
  }
});

test("rede elétrica, área inundada e deslizamento recebem encaminhamento especializado sem mobilização comum", () => {
  for (const tipo of ["Rede elétrica exposta", "Poste de energia caído", "Família ilhada", "Alagamento residencial", "Deslizamento de barranco"]) {
    const o = ocorrencia(tipo, { tipo, ajudasCompativeis: ["Comida"] });
    const vs = [voluntario("v1")];
    const r = fluxo.ativar(o, vs, [o], { agora });
    assert.equal(r.ok, true);
    assert.deepEqual(r.novos, []);
    assert.equal(o.encaminhamentoEspecializado.status, "pendente");
    assert.equal(o.encaminhamentoEspecializado.registradoEm, agora);
    assert.equal(vs[0].ativo, false);
    assert.equal(o.status, "ativa");
    fluxo.ativar(o, vs, [o], { agora: agora + 1000 });
    assert.equal(o.encaminhamentoEspecializado.registradoEm, agora);
  }
});

test("IDs iguais de cidades distintas não compartilham reservas nem disponibilidade", () => {
  const a = ocorrencia("a"), b = ocorrencia("b", { tenantId: "exemplo" });
  const vs = [voluntario("v1"), voluntario("v1", { tenantId: "exemplo" })];
  assert.deepEqual(fluxo.ativar(a, vs, [a, b], { agora, limite: 1 }).novos, ["v1"]);
  assert.equal(vs[0].ativo, true);
  assert.equal(vs[1].ativo, false);
  assert.deepEqual(fluxo.ativar(b, vs, [a, b], { agora, limite: 1 }).novos, ["v1"]);
  fluxo.chegar(a, "v1", agora + 1000);
  fluxo.terminar(a, "v1", agora + 2000);
  fluxo.sincronizarDisponibilidade(vs, [a, b]);
  assert.equal(vs[0].ativo, false);
  assert.equal(vs[1].ativo, true);
});

test("classe de risco domina a espera e não depende de propriedade ou presença", () => {
  const mediaAntiga = ocorrencia("m", { gravidade: 2, reportadoEm: 0, responsabilidade: "publica" });
  const altaNova = ocorrencia("a", { gravidade: 3, reportadoEm: agora, responsabilidade: "privada" });
  assert.ok(fluxo.prioridade(altaNova, agora) > fluxo.prioridade(mediaAntiga, agora));
  assert.equal(fluxo.prioridade(altaNova, agora), fluxo.prioridade({ ...altaNova, status: "em_atendimento", responsabilidade: "publica" }, agora));
  assert.equal(fluxo.prioridade({ ...altaNova, status: "resolvida" }, agora), 0);
});
