void AlertaImportacaoPublica.carregar(gestao).then(()=>{
 montarMarcadoresPublicos();
 if(buscaMapa.value.trim())buscarNoMapa();
}).catch(error=>console.warn("Centros de doações: referências indisponíveis",error));
montarMarcadoresPublicos();
function incluirTerritorio(territorio){
  if(noRecorte(territorio)) return;
  const area=areas.find(a=>a.tipoArea==='Bairro'&&pertence(a,territorio))||areas.find(a=>pertence(a,territorio));
  if(area) selectZone(area.chave);
}
function abrirRecurso(recurso){
  incluirTerritorio(recurso.bairro||recurso.zona);
  marcadorBusca?.remove();
  const pos=[Number(recurso.lat),Number(recurso.lng)];
  const localizado=recurso.lat && recurso.lng && pos.every(Number.isFinite);
  const conteudo=`<strong>${escHtml(recurso.nome)}</strong><br>${escHtml(recurso.endereco||recurso.localizacao||'')}`;
  if(localizado){
    marcadorBusca=L.marker(pos).addTo(map).bindPopup(conteudo);
    map.setView(pos,Math.max(map.getZoom(),15));
    marcadorBusca.openPopup();
  }else{
    L.popup().setLatLng(map.getCenter()).setContent(conteudo+'<br>Sem coordenadas cadastradas.').openOn(map);
  }
}
function buscarNoMapa(){
  const termos=normalizarTerritorio(buscaMapa.value).split(/\s+/).filter(Boolean);
  resultadosMapa.replaceChildren();
  resultadosMapa.hidden=!termos.length;
  buscaMapa.setAttribute('aria-expanded',String(!!termos.length));
  if(!termos.length)return;
  const grupos=[
    ['Bairros e zonas',areas.map(a=>({nome:a.nome,meta:a.tipoArea,abrir:()=>{if(!selecao.has(a.chave))selectZone(a.chave);}}))],
    ['Ocorrências',ocorrencias.map(o=>({nome:o.tipo,meta:[o.protocolo,o.bairro,o.endereco].filter(Boolean).join(' · '),territorio:o.bairro,
      abrir:()=>{if(!noEvento(o)){eventoAtivo='';atualizarFiltroEventos();atualizarRecorte();}incluirTerritorio(o.bairro);if(o.pos)map.panTo(o.pos);openOcorrencia(o);}}))],
    ['Pessoas',pessoasMunicipio().map(p=>({nome:p.nome,meta:[p.sub,p.bairroOrigem].filter(Boolean).join(' · '),territorio:p.bairroOrigem,
      abrir:()=>{incluirTerritorio(p.bairroOrigem);mostrarFicha(p.id);}}))],
    ['Unidades e pontos cadastrados',listarRecursosPublicos().map(r=>({nome:r.nome,meta:[r.tipo,r.categoria,r.endereco,r.localizacao].filter(Boolean).join(' · '),
      territorio:r.bairro||r.zona,abrir:()=>abrirRecurso(r)}))]
  ];
  for(const [titulo,registros] of grupos){
    const encontrados=registros.filter(r=>termos.every(t=>normalizarTerritorio(r.nome+' '+r.meta).includes(t)));
    if(!encontrados.length)continue;
    const secao=document.createElement('section');
    const cabecalho=document.createElement('h3');
    cabecalho.textContent=titulo;
    secao.append(cabecalho);
    encontrados.forEach(r=>{
      const botao=document.createElement('button');
      botao.type='button';
      botao.textContent=[r.nome,r.meta,r.territorio&&!noRecorte(r.territorio)?'Fora do filtro':''].filter(Boolean).join(' · ');
      botao.onclick=()=>{buscaMapa.value='';buscarNoMapa();r.abrir();};
      secao.append(botao);
    });
    resultadosMapa.append(secao);
  }
  if(!resultadosMapa.childElementCount) resultadosMapa.textContent='Nenhum resultado em Maringá.';
}
buscaMapa.addEventListener('input',buscarNoMapa);
buscaMapa.addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();resultadosMapa.querySelector('button')?.click();}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!resultadosMapa.hidden){buscaMapa.value='';buscarNoMapa();buscaMapa.focus();}
});
document.addEventListener('click',e=>{
  if(!e.target.closest('.event-search')&&!resultadosMapa.hidden){buscaMapa.value='';buscarNoMapa();}
});

const bairroSolicitado=new URLSearchParams(location.search).get('bairro');
if(bairroSolicitado){
  const area=areasCadastradas.find(a=>normalizarTerritorio(a.nome)===normalizarTerritorio(bairroSolicitado));
  if(area) selectZone(area.chave);
}

})();
