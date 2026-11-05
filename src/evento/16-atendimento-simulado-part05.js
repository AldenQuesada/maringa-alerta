void Promise.allSettled(["dados-territoriais/maringa-bases-riscos-publicos.json","dados-territoriais/maringa-abrigos-publicos.json"].map(url=>AlertaImportacaoPublica.carregar(gestao,{url}))).then(()=>{
 montarMarcadoresPublicos();
 if(buscaMapa.value.trim())buscarNoMapa();
 atualizarFiltroCadastros();
}).catch(error=>console.warn("Referências municipais de abrigo e apoio indisponíveis",error));
montarMarcadoresPublicos();
function atualizarFiltroCadastros(){
 if(!INVENTARIO)return;
 const el=document.getElementById("mun-rows"),status=document.getElementById("mun-status"),count=document.getElementById("mun-count");
 if(!el||!status||!count)return;
 const xs=linhasInventario()||[];
 count.textContent="("+xs.length+")";
 status.textContent=xs.length+" registros; "+xs.filter(x=>x.georreferenciado).length+" com ponto geográfico.";
 el.innerHTML=xs.map(x=>{
  const route=x.endereco?'<a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&amp;query='+encodeURIComponent(x.endereco+", Maringá, PR")+'">Ver endereço</a>':"";
  return '<div class="mun-row"><div><strong>'+escHtml(x.nome)+'</strong><small>'+escHtml(x.moduloNome)+' · '+escHtml(x.zona||x.bairro||"Zona não informada")+' · '+escHtml(x.classe)+'</small>'+
   (x.precisao?'<small>'+escHtml(x.precisao)+'</small>':'')+'</div><div class="mun-row-actions">'+
   (x.georreferenciado?'<button type="button" data-mun-loc="'+escHtml(x.chave)+'">Localizar</button>':'<small>Sem coordenadas</small>')+
   route+'<a target="_blank" rel="noopener" href="gestao/#'+encodeURIComponent(x.modulo)+'">Cadastro</a></div></div>';
 }).join("")||'<p class="mun-empty">Nenhum registro corresponde aos filtros.</p>';
 el.querySelectorAll("[data-mun-loc]").forEach(btn=>btn.onclick=()=>{
  const x=xs.find(item=>item.chave===btn.dataset.munLoc);
  if(x?.georreferenciado)map.flyTo([x.lat,x.lng],Math.max(map.getZoom(),15));
 });
}
function atualizarClassesCadastros(){
 if(!INVENTARIO)return;
 const el=document.getElementById("mun-classe");
 if(!el)return;
 const subset=INVENTARIO.filtrar(INVENTARIO.registros(gestao),{modulo:filtrosMunicipais.modulo});
 el.innerHTML='<option value="">Todos os tipos e situações</option>'+
  INVENTARIO.classes(subset).map(x=>'<option value="'+escHtml(x)+'">'+escHtml(x)+'</option>').join("");
 el.value=filtrosMunicipais.classe;
}
function iniciarFiltrosCadastros(){
 if(!INVENTARIO||filtrosMunicipaisProntos)return;
 const campo=document.getElementById("mun-camada"),bt=document.getElementById("mun-toggle"),body=document.getElementById("mun-body"),search=document.getElementById("mun-busca");
 const toggle=document.getElementById("mun-mostrar");
 if(!campo||!bt||!body||!search)return;
 filtrosMunicipaisProntos=true;
 if(toggle)toggle.onchange=e=>{mostrarUnidadesEvento=e.target.checked;montarMarcadoresPublicos();};
 const groups=new Map();
 for(const x of INVENTARIO.resumo(gestao)){
  if(!groups.has(x.grupo))groups.set(x.grupo,[]);
  groups.get(x.grupo).push(x);
 }
 campo.innerHTML='<option value="todos">Todos os cadastros</option>'+
  [...groups].map(([group,itens])=>'<optgroup label="'+escHtml(group)+'">'+itens.map(x=>'<option value="'+escHtml(x.id)+'">'+escHtml(x.nome)+' ('+x.total+')</option>').join("")+'</optgroup>').join("");
 bt.onclick=()=>{body.hidden=!body.hidden;bt.setAttribute("aria-expanded",String(!body.hidden));if(!body.hidden)atualizarFiltroCadastros();};
 campo.onchange=()=>{filtrosMunicipais.modulo=campo.value;filtrosMunicipais.classe="";atualizarClassesCadastros();atualizarFiltroCadastros();montarMarcadoresPublicos();};
 document.getElementById("mun-classe").onchange=e=>{filtrosMunicipais.classe=e.target.value;atualizarFiltroCadastros();montarMarcadoresPublicos();};
 search.oninput=()=>{filtrosMunicipais.busca=search.value;atualizarFiltroCadastros();montarMarcadoresPublicos();};
 atualizarClassesCadastros();
 atualizarFiltroCadastros();
}
iniciarFiltrosCadastros();
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
    ['Cadastros da Prefeitura',listarRecursosPublicos().map(r=>({nome:r.nome,meta:[r.moduloNome,r.categoria,r.classe,r.endereco].filter(Boolean).join(' · '),
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
