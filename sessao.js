/* Núcleo independente da UI. Adaptador local do protótipo; substituir por auth oficial no backend. */
(function (global) {
  "use strict";
  const CONTA_KEY = "alerta_contas_locais_v1";
  const TIPOS = new Set(["admin", "responsavel", "visualizacao"]);
  function lerJson(store, chave, padrao) {
    try { const dado = JSON.parse(store.getItem(chave)); return dado == null ? padrao : dado; }
    catch (_) { return padrao; }
  }
  function criar({ municipioId, contasStorage = global.localStorage, sessaoStorage = global.sessionStorage }) {
    if (!municipioId || typeof municipioId !== "string") throw new Error("Município obrigatório.");
    const chaveSessao = "alerta_sessao_local_v1_" + municipioId;
    function listarContas() {
      const todos = lerJson(contasStorage, CONTA_KEY, []);
      return (Array.isArray(todos) ? todos : []).filter(a => a && a.municipioId === municipioId
        && typeof a.id === "string" && typeof a.nome === "string" && typeof a.email === "string"
        && a.perfil && TIPOS.has(a.perfil.tipo));
    }
    function obterSessao() {
      const registro = lerJson(sessaoStorage, chaveSessao, null);
      if (!registro || typeof registro.contaId !== "string") return null;
      const conta = listarContas().find(a => a.id === registro.contaId);
      return conta ? { conta, iniciadaEm: registro.iniciadaEm } : null;
    }
    function salvarSessao(contaId) {
      sessaoStorage.setItem(chaveSessao, JSON.stringify({ contaId, iniciadaEm: new Date().toISOString() }));
      return obterSessao();
    }
    function cadastrar({ nome, email, perfil }) {
      nome = String(nome || "").trim().replace(/\s+/g, " ");
      email = String(email || "").trim().toLowerCase();
      if (nome.length < 2 || nome.length > 100) throw new Error("Informe um nome válido.");
      if (email.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
      if (!perfil || !TIPOS.has(perfil.tipo)) throw new Error("Selecione um perfil.");
      if (perfil.tipo === "responsavel" && (!perfil.zona || typeof perfil.zona !== "string")) throw new Error("Selecione uma região.");
      if (listarContas().some(a => a.email === email)) throw new Error("Esta conta já existe neste município. Use Mudar de conta.");
      const todas = lerJson(contasStorage, CONTA_KEY, []);
      const id = (global.crypto && typeof global.crypto.randomUUID === "function")
        ? global.crypto.randomUUID() : "conta-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
      const conta = { id, municipioId, nome, email, perfil: perfil.tipo === "responsavel"
        ? { tipo: "responsavel", zona: perfil.zona } : { tipo: perfil.tipo },
        criadaEm: new Date().toISOString() };
      contasStorage.setItem(CONTA_KEY, JSON.stringify([...(Array.isArray(todas) ? todas : []), conta]));
      return salvarSessao(id);
    }
    function trocar(contaId) {
      if (!listarContas().some(a => a.id === contaId)) throw new Error("Conta não encontrada neste município.");
      return salvarSessao(contaId);
    }
    function sair() { sessaoStorage.removeItem(chaveSessao); return null; }
    return { listarContas, obterSessao, cadastrar, trocar, sair, tipo: "local" };
  }
  global.AlertaSessao = { criar };
  if (typeof module === "object" && module.exports) module.exports = global.AlertaSessao;
})(typeof globalThis !== "undefined" ? globalThis : window);
