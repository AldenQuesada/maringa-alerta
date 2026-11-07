/* consultas: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({SEM_ZONA,arr,norm}){
function zonaDaPessoa(p, bairros) {
    if (String(p.zona || "").trim()) return String(p.zona).trim();
    const b = norm(p.bairro);
    if (!b) return SEM_ZONA;
    const correspondencias = (bairros || []).filter(x => norm(x.nome) === b && String(x.zona || "").trim());
    const zonas = [...new Set(correspondencias.map(x => x.zona))];
    return zonas.length === 1 ? zonas[0] : SEM_ZONA;
  }
function filtrarPessoas(pessoas, bairros, selecionadas, busca) {
    const escolhidas = selecionadas instanceof Set ? selecionadas : new Set(selecionadas || []);
    const q = norm(busca);
    return pessoas.filter(p => {
      const z = zonaDaPessoa(p, bairros);
      if (escolhidas.size && !escolhidas.has(z) && !escolhidas.has("bairro:"+norm(p.bairro))) return false;
      if (!q) return true;
      return norm([p.nome,p.telefone,p.endereco,p.bairro,z,p.tipo_pessoa,p.contribuicao,
        ...arr(p.ajudas),...arr(p.maquinas),...arr(p.empreendedores),...arr(p.materiais)]
        .filter(Boolean).join(" ")).includes(q);
    });
  }
function manterSelecao(id, pessoas) {
    return id != null && pessoas.some(p => p.id === id) ? id : null;
  }
return {zonaDaPessoa,filtrarPessoas,manterSelecao};
}
root.AlertaConversasConsultas={criar};
})(globalThis);
