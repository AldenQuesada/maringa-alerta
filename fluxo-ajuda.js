/* Regras da simulação. Em produção, reservas e guards pertencem ao backend. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AlertaFluxo = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ATIVAS = new Set(["convidado", "no_local"]);
  const FECHADAS = new Set(["resolvida", "cancelada"]);
  const normalizar = valor => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const instante = agora => Number.isFinite(agora) ? agora : Date.now();
  const lista = o => Array.isArray(o.participacoes) ? o.participacoes : [];
  const mesmoMunicipio = (a, b) => a.tenantId == null || b.tenantId == null || a.tenantId === b.tenantId;
  const confirmada = o => o.confirmado === true || o.confirmada === true;

  const regras = {
    "distribuicao de agua e alimentos": {
      ajudas: ["Comida", "Mão de obra"],
      orientacao: "Ajudar na distribuição de água e alimentos no ponto de apoio informado."
    },
    "arvore caida sobre via": {
      ajudas: ["Motosserra", "Caminhão", "Mão de obra"],
      orientacao: "Apoiar a equipe da região na remoção de resíduos, respeitando o isolamento do local."
    },
    "telhado destruido": {
      ajudas: ["Roupas/cobertores", "Abrigo temporário", "Comida"],
      orientacao: "Ajudar no acolhimento e na entrega de itens à família, sem subir em telhados."
    },
    "limpeza de via": {
      ajudas: ["Mão de obra", "Caminhão"],
      orientacao: "Apoiar a limpeza no ponto indicado pela equipe da região."
    },
    "transporte para abrigo": {
      ajudas: ["Transporte de pessoas"],
      orientacao: "Apoiar o transporte ao abrigo indicado, respeitando os bloqueios informados."
    },
    "resgate de animais": {
      ajudas: ["Resgate de animais"],
      orientacao: "Apoiar a equipe responsável pelos animais no ponto informado."
    }
  };

  function regraPara(o) {
    const tipo = normalizar(o.tipo);
    if (/eletric|energia|poste/.test(tipo)) {
      return { servico: "Concessionária de energia e Defesa Civil", motivo: "Intervenção em rede elétrica exige equipe especializada." };
    }
    if (/deslizamento|barranco|estrutura colapsada/.test(tipo)) {
      return { servico: "Defesa Civil e Bombeiros", motivo: "Área com risco de deslizamento ou colapso exige equipe especializada." };
    }
    if (/ilhada|aquatico|afogamento|alagamento/.test(tipo)) {
      return { servico: "Bombeiros e Defesa Civil", motivo: "Atendimento em área inundada exige equipe especializada." };
    }
    if (Array.isArray(o.ajudasCompativeis) && o.ajudasCompativeis.length) {
      return { ajudas: o.ajudasCompativeis, orientacao: o.orientacaoAjuda || "Ajudar no ponto indicado pela equipe da região." };
    }
    return regras[tipo] || { servico: "Equipe municipal responsável", motivo: "Atendimento encaminhado ao serviço cadastrado para esta ocorrência." };
  }

  function distanciaPadrao(v, o) {
    if (!Array.isArray(v.pos) || !Array.isArray(o.pos) || v.pos.length < 2 || o.pos.length < 2) return Infinity;
    const [lat1, lng1] = v.pos, [lat2, lng2] = o.pos;
    if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Infinity;
    const rad = graus => graus * Math.PI / 180;
    const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  }

  function temReserva(v, ocorrencias) {
    return ocorrencias.some(o => mesmoMunicipio(v, o) && lista(o).some(p => p.voluntarioId === v.id && ATIVAS.has(p.status)));
  }

  function sincronizarDisponibilidade(voluntarios, ocorrencias) {
    for (const v of voluntarios) v.ativo = temReserva(v, ocorrencias);
    return { ok: true };
  }

  function atualizarIds(o) {
    o.voluntariosProx = [...new Set(lista(o).map(p => p.voluntarioId))];
  }

  function quantidadeNecessaria(o) {
    if (Number.isInteger(o.ajudantesNecessarios) && o.ajudantesNecessarios >= 0) return o.ajudantesNecessarios;
    return lista(o).filter(p => p.status !== "recusada").length;
  }

  function podeConcluir(o) {
    const participacoes = lista(o);
    const necessarios = quantidadeNecessaria(o);
    const equipeConcluiu = o.atendimentoEquipe && o.atendimentoEquipe.status === "concluida";
    const tecnicaPendente = o.pendenciaTecnica === true ||
      (o.encaminhamentoEspecializado && o.encaminhamentoEspecializado.status !== "concluido") ||
      (o.atendimentoEquipe && !equipeConcluiu);
    // A equipe pode cobrir a ajuda que faltou, mas não encerra participações ainda ativas.
    const necessidadeAtendida = equipeConcluiu || (necessarios > 0 &&
      participacoes.filter(p => p.status === "concluida").length >= necessarios);
    return Boolean(necessidadeAtendida && !tecnicaPendente && !participacoes.some(p => ATIVAS.has(p.status)));
  }

  function concluirSeAtendida(o, agora) {
    if (o.status === "resolvida") return true;
    if (o.status === "cancelada" || !podeConcluir(o)) return false;
    o.status = "resolvida";
    o.resolvidoEm = agora;
    const chegada = Number.isFinite(o.confirmadoEm) ? o.confirmadoEm : agora;
    const relato = Number.isFinite(o.reportadoEm) ? o.reportadoEm : chegada;
    o.tempoChegada = Math.max(0, Math.round((chegada - relato) / 60000));
    o.tempoAtendimento = Math.max(0, Math.round((agora - chegada) / 60000));
    o.tempoReal = o.tempoChegada + o.tempoAtendimento;
    return true;
  }

  function ativar(o, voluntarios, ocorrencias, options) {
    options = options || {};
    if (!o || !confirmada(o)) return { ok: false, motivo: "ocorrencia_nao_confirmada", novos: [] };
    if (FECHADAS.has(o.status)) return { ok: false, motivo: "ocorrencia_encerrada", novos: [], resolvida: o.status === "resolvida" };
    const agora = instante(options.agora);
    const todas = ocorrencias.includes(o) ? ocorrencias : ocorrencias.concat(o);
    const regra = regraPara(o);
    if (!Array.isArray(o.participacoes)) o.participacoes = [];

    if (regra.servico) {
      if (!o.encaminhamentoEspecializado) {
        o.encaminhamentoEspecializado = { servico: regra.servico, motivo: regra.motivo, registradoEm: agora, status: "pendente" };
      }
      sincronizarDisponibilidade(voluntarios, todas);
      atualizarIds(o);
      return { ok: true, novos: [], encaminhamentoEspecializado: o.encaminhamentoEspecializado, resolvida: false };
    }

    o.orientacaoAjuda = regra.orientacao;
    if (!Number.isInteger(o.ajudantesNecessarios) || o.ajudantesNecessarios < 0) {
      o.ajudantesNecessarios = Number.isFinite(options.limite) ? Math.max(0, Math.floor(options.limite)) : 2;
    }
    if (concluirSeAtendida(o, agora)) {
      sincronizarDisponibilidade(voluntarios, todas);
      return { ok: true, novos: [], resolvida: true, faltam: 0 };
    }
    const cobertas = o.participacoes.filter(p => ATIVAS.has(p.status) || p.status === "concluida").length;
    const faltam = Math.max(0, o.ajudantesNecessarios - cobertas);
    const anteriores = new Set(o.participacoes.map(p => p.voluntarioId));
    const habilidades = new Set(regra.ajudas.map(normalizar));
    const medir = typeof options.distancia === "function" ? options.distancia : distanciaPadrao;
    const idsCandidatos = new Set();
    const candidatos = voluntarios.filter(v => {
      if (!v || !v.id || idsCandidatos.has(v.id) || anteriores.has(v.id) || !mesmoMunicipio(v, o)) return false;
      if (v.disponivel === false || temReserva(v, todas)) return false;
      if (!["todos", "durante"].includes(v.alertaPreferencia || "todos")) return false;
      if (v.bairro !== o.bairro && v.disponibilidadeZona !== "qualquer_zona") return false;
      const contribuicoes = Array.isArray(v.contribuicoes) && v.contribuicoes.length ? v.contribuicoes : [v.ajuda];
      if (!contribuicoes.some(tipo => habilidades.has(normalizar(tipo)))) return false;
      idsCandidatos.add(v.id);
      return true;
    }).map(v => {
      const distancia = medir(v, o);
      return { v, distancia: Number.isFinite(distancia) && distancia >= 0 ? distancia : Infinity };
    }).sort((a, b) => (a.distancia - b.distancia) || String(a.v.id).localeCompare(String(b.v.id)));

    const novos = candidatos.slice(0, faltam).map(({ v }) => v.id);
    for (const voluntarioId of novos) {
      o.participacoes.push({ voluntarioId, status: "convidado", convidadoEm: agora, chegouEm: null, terminouEm: null });
    }
    atualizarIds(o);
    sincronizarDisponibilidade(voluntarios, todas);
    const restantes = Math.max(0, faltam - novos.length);
    return { ok: true, novos, faltam: restantes, resolvida: false, ...(restantes ? { motivo: "aguardando_recurso_compativel" } : {}) };
  }

  function chegar(o, voluntarioId, agora) {
    const p = o && lista(o).find(item => item.voluntarioId === voluntarioId);
    if (!p) return { ok: false, motivo: "participacao_nao_encontrada" };
    if (p.status === "no_local" || p.status === "concluida") {
      return { ok: true, repetida: true, participacao: p, resolvida: o.status === "resolvida" };
    }
    if (FECHADAS.has(o.status)) return { ok: false, motivo: "ocorrencia_encerrada" };
    if (p.status !== "convidado") return { ok: false, motivo: "convite_nao_ativo" };
    p.status = "no_local";
    p.chegouEm = instante(agora);
    if (!Number.isFinite(o.confirmadoEm)) o.confirmadoEm = p.chegouEm;
    o.status = "em_atendimento";
    return { ok: true, participacao: p, resolvida: false };
  }

  function terminar(o, voluntarioId, agora) {
    const p = o && lista(o).find(item => item.voluntarioId === voluntarioId);
    if (!p) return { ok: false, motivo: "participacao_nao_encontrada" };
    if (p.status === "concluida") return { ok: true, repetida: true, participacao: p, resolvida: o.status === "resolvida" };
    if (FECHADAS.has(o.status)) return { ok: false, motivo: "ocorrencia_encerrada" };
    if (p.status !== "no_local") return { ok: false, motivo: "chegada_nao_registrada" };
    p.status = "concluida";
    p.terminouEm = instante(agora);
    return { ok: true, participacao: p, resolvida: concluirSeAtendida(o, p.terminouEm) };
  }

  function recusar(o, voluntarioId, agora) {
    const p = o && lista(o).find(item => item.voluntarioId === voluntarioId);
    if (!p) return { ok: false, motivo: "participacao_nao_encontrada" };
    if (p.status === "recusada") return { ok: true, repetida: true, participacao: p };
    if (FECHADAS.has(o.status)) return { ok: false, motivo: "ocorrencia_encerrada" };
    if (p.status !== "convidado") return { ok: false, motivo: "participacao_ja_iniciada" };
    p.status = "recusada";
    p.recusadoEm = instante(agora);
    return { ok: true, participacao: p, resolvida: false };
  }

  function prioridade(o, agora) {
    if (!o || FECHADAS.has(o.status)) return 0;
    const gravidade = Math.max(1, Math.min(3, Math.round(Number(o.gravidade) || 1)));
    const espera = Number.isFinite(o.reportadoEm) ? Math.max(0, Math.floor((instante(agora) - o.reportadoEm) / 60000)) : 0;
    // A espera desempata dentro da classe; nunca ultrapassa uma classe superior.
    return gravidade * 10000 + Math.min(9999, espera);
  }

  return { ativar, chegar, terminar, recusar, sincronizarDisponibilidade, prioridade };
});
