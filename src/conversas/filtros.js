/* filtros: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({SEM_ZONA,esc,get,norm,selecionadas,zonaDaPessoa}){
function construirZonas(pessoas, bairros, zonas) {
      const nomes = new Set(zonas.map(z => String(z.nome || "").trim()).filter(Boolean));
      pessoas.forEach(p => nomes.add(zonaDaPessoa(p,bairros)));
      const lista = [...nomes].sort((a,b) => {
        if (a === SEM_ZONA) return 1;
        if (b === SEM_ZONA) return -1;
        return a.localeCompare(b,"pt-BR",{numeric:true});
      });
      const bairrosSemZona=[...new Set(pessoas.filter(p=>zonaDaPessoa(p,bairros)===SEM_ZONA&&p.bairro).map(p=>String(p.bairro).trim()))].sort((a,b)=>a.localeCompare(b,"pt-BR",{numeric:true}));
      const contagens = new Map(lista.map(z => [z,0]));
      pessoas.forEach(p => {
        const z = zonaDaPessoa(p,bairros);
        contagens.set(z,(contagens.get(z)||0)+1);
      });
      for (const valor of [...selecionadas]) {
        if (!contagens.has(valor) && !(valor.startsWith("bairro:") && pessoas.some(p=>zonaDaPessoa(p,bairros)===SEM_ZONA&&"bairro:"+norm(p.bairro)===valor))) selecionadas.delete(valor);
      }
      get("cv-zones").innerHTML = '<div class="cv-zone-all">' +
        (selecionadas.size ? esc(selecionadas.size + " zona(s) selecionada(s)") : "Todas as zonas") +
        ' · ' + pessoas.length + ' colaborador(es)</div>' +
        (lista.length ? lista.map(z => '<label class="cv-zone">' +
          '<input type="checkbox" data-cv-zone="' + esc(z) + '"' + (selecionadas.has(z)?" checked":"") + '>' +
          '<span class="cv-zone-name">' + esc(z) + '</span><span class="cv-zone-count">' + (contagens.get(z)||0) + '</span>' +
          '</label>').join("") : '<p class="cv-empty-small">Nenhuma zona cadastrada.</p>') +
        (bairrosSemZona.length?'<div class="cv-zone-all">Bairros ainda sem zona numerada</div>' + bairrosSemZona.map(b=>{
           const key="bairro:"+norm(b);
           const n=pessoas.filter(p=>zonaDaPessoa(p,bairros)===SEM_ZONA&&norm(p.bairro)===norm(b)).length;
           return '<label class="cv-zone"><input type="checkbox" data-cv-zone="' + esc(key) + '"' + (selecionadas.has(key)?" checked":"") + '><span class="cv-zone-name">' + esc(b) + '</span><span class="cv-zone-count">' + n + '</span></label>';
        }).join(""):"");
      get("cv-clear").disabled = selecionadas.size === 0;
    }
return {construirZonas};
}
root.AlertaConversasVistaFiltros={criar};
})(globalThis);
