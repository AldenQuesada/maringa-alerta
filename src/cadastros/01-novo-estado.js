function novoEstado(){const v={version:1,municipioAtivo:"maringa"};for(const k of COLLECTIONS)v[k]=[];
v.prefeituras.push({id:"maringa",nome:"Maringá",uf:"PR",codigo_ibge:"4115200",pais:"Brasil",paisId:"BR",estado:"Paraná",codigo_uf:"41",status:"ativa",origem_provisionamento:"bootstrap",lat:-23.4205,lng:-51.9333,zoom:12});
return v;}
function criar(armazenamento=global.localStorage,options={}){
 const scopedId=options&&typeof options.municipioId==="string"?options.municipioId:null;
 const accessMode=scopedId?"municipal":"plataforma";
 function carregar(){let bruto=null;try{bruto=JSON.parse(armazenamento.getItem(CHAVE)||"null")}catch(_){}const base=novoEstado();if(options.semBootstrap)base.prefeituras=[];if(bruto&&bruto.version===1){for(const k of COLLECTIONS)base[k]=Array.isArray(bruto[k])?bruto[k]:base[k];base.municipioAtivo=bruto.municipioAtivo||"maringa";}/* Migração idempotente: Maringá é município fundador e não pode desaparecer em estados locais antigos. */if(!options.semBootstrap&&!base.prefeituras.some(x=>x.id==="maringa"||x.codigo_ibge==="4115200"))base.prefeituras.unshift(novoEstado().prefeituras[0]);if(!base.prefeituras.some(x=>x.id===base.municipioAtivo))base.municipioAtivo=base.prefeituras[0]?.id||"";for(const p of base.prefeituras){if(!p.status)p.status=p.id==="maringa"?"ativa":"implantacao";if(!p.paisId)p.paisId="BR";if(!p.pais)p.pais="Brasil";}return base;}
 let estado=carregar();
 function refresh(){estado=carregar();}
 function salvar(){try{armazenamento.setItem(CHAVE,JSON.stringify(estado))}catch(e){throw new Error("Não foi possível salvar os dados neste navegador.")}}
 function municipioCorrente(){return scopedId||estado.municipioAtivo;}
 function municipios(){refresh();return estado.prefeituras.filter(x=>!scopedId||x.id===scopedId).slice().sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"))}
 function municipioAtivo(){refresh();return estado.prefeituras.find(x=>x.id===municipioCorrente())||null}
 function selecionarMunicipio(id){
  refresh();
  if(scopedId&&id!==scopedId)throw new Error("Município fora do escopo municipal.");
  if(!estado.prefeituras.some(x=>x.id===id))throw new Error("Município não encontrado.");
  if(!scopedId){estado.municipioAtivo=id;salvar();}
  return municipioAtivo();
 }
 function lista(modulo,id=municipioCorrente()){
  refresh();
  const m=ESQUEMAS[modulo];if(!m)throw new Error("Cadastro desconhecido.");
  return estado[m.collection].filter(x=>m.collection==="prefeituras"?(!scopedId||x.id===scopedId):x.municipioId===(scopedId||id))
   .filter(x=>!m.role||x.funcao===m.role||(Array.isArray(x.papeis)&&x.papeis.includes(m.role))).filter(x=>!m.category||x.categoria===m.category)
   .sort((a,b)=>String(a.nome||a.identificacao||"").localeCompare(String(b.nome||b.identificacao||""),"pt-BR"));
 }
 function registro(modulo,id){return lista(modulo).find(x=>x.id===id)||null}
 function gravar(modulo,form,id){
  refresh();
  const m=ESQUEMAS[modulo];if(!m)throw new Error("Cadastro desconhecido.");
  if(scopedId&&m.collection==="prefeituras")throw new Error("Somente o Admin Geral pode criar ou alterar Prefeituras.");
  const atual=id?registro(modulo,id):null;if(id&&!atual)throw new Error("Registro não encontrado neste município.");
  const campos={};for(const f of m.fields){let val=form[f.key];if(typeof val==="string")val=val.trim();if(val===undefined||val===null)val="";if(f.required&&!String(val).trim())throw new Error("Preencha: "+f.label+".");campos[f.key]=val;}
  if(modulo==="eventos"&&campos.mapa_evento_id){
   const listaEventos=estado.eventos.filter(e=>e.municipioId===municipioCorrente());
   const visitados=new Set(id?[String(id)]:[]);let ref=String(campos.mapa_evento_id);
   while(ref){if(visitados.has(ref))throw new Error("O evento não pode formar um vínculo circular de mapas.");visitados.add(ref);const alvo=listaEventos.find(e=>e.id===ref);if(!alvo)throw new Error("Evento de referência não encontrado neste município.");ref=String(alvo.mapa_evento_id||"");}
  }
  if(m.collection==="prefeituras"){
   if(!/^\d{7}$/.test(String(campos.codigo_ibge)))throw new Error("Informe um código IBGE válido.");
   if(estado.prefeituras.some(x=>x.id!==id&&x.codigo_ibge===campos.codigo_ibge))throw new Error("Esta prefeitura já está cadastrada.");
  } else if(!municipioCorrente())throw new Error("Cadastre primeiro uma prefeitura.");
  const generated=(global.crypto&&typeof global.crypto.randomUUID==="function")?global.crypto.randomUUID():"cad-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
  const item={...(atual||{}),...campos,id:id||generated,municipioId:m.collection==="prefeituras"?undefined:municipioCorrente()};
  if(m.role)item.funcao=m.role;if(m.category)item.categoria=m.category;
  if(!atual){estado[m.collection].push(item)}else{const idx=estado[m.collection].findIndex(x=>x.id===id);estado[m.collection][idx]=item}
  salvar();return item;
 }
 function atualizarGeo(id,geo){refresh();if(scopedId)throw new Error("Georreferenciamento inicial pertence ao Admin Geral.");const p=estado.prefeituras.find(x=>x.id===id);if(!p)return null;for(const k of ["lat","lng","zoom","bbox","limite_geojson","fonte_geo","geo_atualizado","pais","paisId","estado","codigo_uf"]){if(geo[k]!==undefined)p[k]=geo[k]}salvar();return p;}

 function importarLote(modulo,rows,{modo="revisado"}={}){
  refresh();
  const permitido=new Set(["bairros","zonas","bases","riscos","abrigos","pontos","saude","emergencias","parceiros"]);
  if(!permitido.has(modulo))throw new Error("Coleção não permitida para importação.");
  if(!Array.isArray(rows)||rows.length>5000)throw new Error("Lote inválido ou maior que 5.000 registros.");
  const m=ESQUEMAS[modulo],municipioId=municipioCorrente();
  if(!municipioId)throw new Error("Selecione o município.");
  const anterior=estado;
  const clone=JSON.parse(JSON.stringify(estado));
  const all=clone[m.collection],filtered=all.filter(x=>x.municipioId===municipioId);
  const byKey=new Map(filtered.filter(x=>x.externalId||x.codigo_cnes).map(x=>[String(x.externalId||"cnes:"+x.codigo_cnes),x]));
  const byName=new Map(filtered.filter(x=>x.nome).map(x=>[(String(x.nome).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()+"|"+String(x.tipo||"").toLowerCase()),x]));
  const idGen=()=>global.crypto&&typeof global.crypto.randomUUID==="function"?global.crypto.randomUUID():"cad-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);
  const stats={novos:0,atualizados:0,preservados:0,duplicados:0};
  const batchSeen=new Set();
  for(const src of rows){
   if(!src||typeof src!=="object"||!String(src.nome||"").trim())throw new Error("Lote contém registro sem nome.");
   if(src.municipioId&&src.municipioId!==municipioId)throw new Error("Município divergente no lote.");
   if(m.category&&src.categoria&&src.categoria!==m.category)throw new Error("Categoria divergente no lote.");
   const exid=String(src.externalId||src.codigo_cnes&&"cnes:"+src.codigo_cnes||"");
   const fallback=String(src.nome).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()+"|"+String(src.tipo||"").toLowerCase();
   const unique=exid||fallback;
   if(batchSeen.has(unique)){stats.duplicados++;continue;}
   batchSeen.add(unique);
   const old=exid?byKey.get(exid)||byName.get(fallback):byName.get(fallback);
   if(old?.verificacao==="Validado"||old?.verificacao==="Manual confirmado"){
    stats.preservados++;continue;
   }
   const allowedFields=new Set([...m.fields.map(f=>f.key),"externalId","codigo_cnes","lat","lng","geojson","fonte","url_fonte","verificacao","atualizado_em","bairro","cep","observacoes","categoria"]);
   const cleaned=Object.fromEntries(Object.entries(src).filter(([k,v])=>allowedFields.has(k)&&v!==undefined&&v!==null));
   if(old){
    const idx=all.findIndex(x=>x.id===old.id);
    all[idx]={...old,...Object.fromEntries(Object.entries(cleaned).filter(([k,v])=>v!=="")),id:old.id,municipioId,categoria:m.category||old.categoria};
    stats.atualizados++;
   }else{
    const item={...cleaned,id:idGen(),municipioId,categoria:m.category||cleaned.categoria};
    all.push(item);byName.set(fallback,item);if(exid)byKey.set(exid,item);
    stats.novos++;
   }
  }
  estado=clone;
  try{salvar();return stats}catch(e){estado=anterior;throw e}
 }
