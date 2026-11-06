function renderPrefTabs(){
 const html='<nav class="pref-tabs" aria-label="Cadastro da Prefeitura">'+PREF_TABS.map(([id,label])=>'<a class="pref-tab'+(id===atual?' active':'')+'" href="#'+id+'"'+(id===atual?' aria-current="page"':'')+'>'+esc(label)+'</a>').join("")+'</nav>';
 const heading=PAGE.querySelector(".heading-row");if(heading)heading.insertAdjacentHTML("afterend",html);else PAGE.insertAdjacentHTML("afterbegin",html);
 const nav=PAGE.querySelector(".pref-tabs"),body=document.createElement("div");body.className="pref-tab-body";
 while(nav.nextSibling)body.appendChild(nav.nextSibling);PAGE.appendChild(body);
 PAGE.closest(".content")?.scrollTo(0,0);
}
function structures(){return STRUCT_MODULES.flatMap(([m])=>db.lista(m));}
function responsible(x,people){return people.find(p=>p.id===x.responsavel_id)||people.find(p=>p.estrutura_id===x.id)||null;}
function gabinete(){const orgs=structures();return db.lista("pessoas").filter(p=>p.estrutura_id||orgs.some(x=>x.responsavel_id===p.id)||["admin","responsavel","substituto","coordenador"].includes(p.funcao));}
function renderTerritorioMunicipal(){
 const p=db.municipioAtivo();
 if(!p){PAGE.innerHTML=topo("Prefeitura indisponível","Município ainda não provisionado.");return;}
 const people=gabinete(),orgs=structures();
 PAGE.innerHTML=topo("Gerais","Dados institucionais e representantes do Gabinete de Crise.","pessoas")+
 '<section class="table-shell pref-general"><div class="table-toolbar"><strong>Dados da Prefeitura</strong></div><div class="table-scroll"><table><thead><tr><th>Prefeitura</th><th>UF</th><th>Código IBGE</th><th>Telefone</th><th>E-mail</th><th>Situação</th><th>Ações</th></tr></thead><tbody>'+
 '<tr><td><strong>'+esc(p.nome)+'</strong></td><td>'+esc(p.uf||"—")+'</td><td>'+esc(p.codigo_ibge||"—")+'</td><td>'+esc(p.telefone||"—")+'</td><td>'+esc(p.email||p.admin_municipal_email||"—")+'</td><td>'+esc(p.status||"—")+'</td>'+
 '<td><a class="row-action" href="../plataforma/#municipios" title="O cadastro da Prefeitura pertence ao Admin Geral">Editar</a></td></tr></tbody></table></div></section>'+
 '<section class="table-shell pref-cabinet"><div class="table-toolbar"><strong>Gabinete de Crise</strong><span class="table-count">'+people.length+' membro(s)</span></div>'+
 '<div class="table-scroll"><table><thead><tr><th>Nome</th><th>Cargo</th><th>Função</th><th>Estrutura representada</th><th>Telefone</th><th>E-mail</th><th>Ações</th></tr></thead><tbody>'+
 (people.length?people.map(x=>{const org=orgs.find(o=>o.id===x.estrutura_id||o.responsavel_id===x.id);return '<tr><td><strong>'+esc(x.nome)+'</strong></td><td>'+esc(x.cargo||"Não informado")+'</td><td>'+esc(x.funcao||"—")+'</td><td>'+esc(org?.nome||x.orgao||"Não vinculada")+'</td><td>'+esc(x.telefone||"—")+'</td><td>'+esc(x.email||"—")+'</td><td><button type="button" class="row-action" data-canon-edit="pessoas" data-id="'+esc(x.id)+'">Editar</button></td></tr>';}).join(""):'<tr><td colspan="7">Nenhum membro cadastrado. Use Novo cadastro acima.</td></tr>')+
 '</tbody></table></div></section>';
}
async function importarBasesERiscosPublicos(){
 if(db.tipo==="supabase")return;
 const municipio=db.municipioAtivo();
 if(referenciasPublicasConsultadas||municipio?.codigo_ibge!=="4115200")return;
 referenciasPublicasConsultadas=true;
 const docs=["../dados-territoriais/maringa-bases-riscos-publicos.json","../dados-territoriais/maringa-abrigos-publicos.json","../dados-territoriais/maringa-apoio-imagens-2026.json"];
 const results=await Promise.allSettled(docs.map(url=>globalThis.AlertaImportacaoPublica.carregar(db,{url})));
 const alterados=results.some(r=>r.status==="fulfilled"&&(r.value.novos||r.value.atualizados));
 if(results.some(r=>r.status==="rejected"))console.warn("Algumas referências públicas ainda não estão disponíveis.");
 if(alterados&&["bases","riscos","abrigos","inicio"].includes(atual))render();
}
async function importarUnidadesCNES(){
 if(db.tipo==="supabase")return;
 if(cnesConsultado||db.municipioAtivo()?.codigo_ibge!=="4115200")return;
 cnesConsultado=true;
 const codigosExistentes=new Set(["saude","emergencias"].flatMap(modulo=>db.lista(modulo)).map(x=>String(x.codigo_cnes||"")).filter(Boolean));
 if(codigosExistentes.size>=69)return;
 try{
  const r=await fetch("../dados-territoriais/maringa-unidades-cnes.json",{cache:"no-cache"});
  if(!r.ok)throw Error("Arquivo de referência CNES indisponível");
  const doc=await r.json();
  if(doc.municipio_ibge!=="4115200"||!Array.isArray(doc.unidades)||doc.unidades.length!==69)throw Error("Base CNES inválida");
  for(const [grupo] of [["saude"],["emergencias"]]){
   const linhas=doc.unidades.filter(x=>x.grupo===grupo&&!codigosExistentes.has(String(x.codigo_cnes))).map(x=>({nome:x.nome,tipo:x.tipo,codigo_cnes:x.codigo_cnes,externalId:"cnes:"+x.codigo_cnes,fonte:"CNES · Ministério da Saúde",url_fonte:doc.url_fonte,verificacao:"Em conferência"}));
   if(linhas.length)await db.importarLote(grupo,linhas);
  }
  if(atual==="estruturas"||atual==="inicio")render();
 }catch(err){toast("Não foi possível importar unidades do CNES: "+err.message);}
}
