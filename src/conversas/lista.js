/* lista: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({arr,esc,get,nomePessoa,pessoaTipo,view,zonaDaPessoa}){
function renderLista(pessoas,bairros) {
      get("cv-visible-count").textContent = pessoas.length + (pessoas.length===1?" colaborador":" colaboradores");
      get("cv-conversation-list").innerHTML = pessoas.length ? pessoas.map(p => {
        const z = zonaDaPessoa(p,bairros);
        const iniciais = nomePessoa(p).split(/\s+/).slice(0,2).map(v=>v[0]||"").join("").toLocaleUpperCase("pt-BR");
        const ofertas = ["ajudas","maquinas","empreendedores","materiais"].flatMap(k=>arr(p[k]));
        const subtitulo = ofertas.length ? ofertas.slice(0,2).join(" · ") : "Oferta não detalhada";
        const simulado=p.status_simulacao==="simulado";
        return '<button type="button" class="cv-person' + (view.ativa===p.id?" is-active":"") +
          '" data-cv-open="' + esc(p.id) + '" aria-pressed="' + (view.ativa===p.id?"true":"false") + '">' +
          '<span class="cv-avatar" aria-hidden="true">' + esc(iniciais) + '</span><span class="cv-person-main">' +
          '<strong>' + esc(nomePessoa(p)) + '</strong><small>' + esc(z) + " · " + esc(pessoaTipo(p.tipo_pessoa)||"Colaborador") +
          '</small><span>' + esc(simulado?'DEMONSTRAÇÃO · '+subtitulo:subtitulo) + '</span></span></button>';
      }).join("") : '<div class="cv-list-empty"><strong>Nenhum colaborador encontrado.</strong>' +
        '<p>Cadastre pessoas no módulo Colaboradores ou ajuste os filtros.</p></div>';
    }
return {renderLista};
}
root.AlertaConversasVistaLista={criar};
})(globalThis);
