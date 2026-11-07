/* importacao: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,addStage,log,notify,ready,renderTerritory,request,stage,state}){
const limites=globalThis.AlertaGestaoDados.parametros.implantacao;
async function importOfficial(){
 if(state.busy||!ready())return;state.busy=true;renderTerritory();
 const errors=[];
 try{
  try{
   const data=await request(state.C.FONTES.ibge,limites.timeoutCadastroMs);
   const p=state.C.validarMunicipioIBGE(data);stage.ibge=p;
   log("IBGE",p.nome+" / "+p.uf+" ("+p.codigo_ibge+") identificado por código oficial.","ok");
  }catch(e){errors.push("IBGE Localidades: "+e.message);log("IBGE",e.message,"error");}
  try{
   const geo=await request(state.C.FONTES.malha,limites.timeoutMalhaMs);
   stage.geo=JSON.stringify(state.C.normalizaMalha(geo));
   log("IBGE Malhas","Limite municipal GeoJSON carregado para revisão.","ok");
  }catch(e){errors.push("IBGE Malhas: "+e.message);log("Malha municipal",e.message,"error");}
  try{
   const all=[],known=new Set();let pages=0,stop=false,repeat=0,last="";
   while(pages<limites.paginasCnesMaximas&&!stop){
    const url=new URL(state.C.FONTES.cnes);url.searchParams.set("codigo_municipio",state.C.MUNICIPIO.slice(0,6));
    url.searchParams.set("status","1");url.searchParams.set("limit",String(limites.tamanhoPaginaCnes));url.searchParams.set("offset",String(pages));
    const data=await request(url.toString(),limites.timeoutCadastroMs),parsed=state.C.unwrapCNES(data);
    const fingerprint=JSON.stringify(parsed.rows.slice(0,4).map(x=>state.C.pick(x,["codigo_cnes","CNES","nome_fantasia"])));
    if(fingerprint===last&&pages>0){repeat++;if(repeat>=1){errors.push("CNES repetiu a página: importação pode estar incompleta.");break;}}
    last=fingerprint;
    for(const raw of parsed.rows){
     const row=state.C.cnesItem(raw);if(row&&!known.has(row.codigo_cnes)){all.push(row);known.add(row.codigo_cnes);}
    }
    pages++;
    if(!parsed.rows.length||parsed.rows.length<limites.tamanhoPaginaCnes||parsed.total&&pages*limites.tamanhoPaginaCnes>=parsed.total)stop=true;
    if(pages%5===0){const info=$("mi-progress");if(info)info.textContent="CNES: "+pages+" páginas consultadas, "+all.length+" registros municipais identificados...";}
   }
   if(pages>=limites.paginasCnesMaximas)errors.push("Limite preventivo de "+limites.paginasCnesMaximas+" páginas CNES atingido. Complete pelo CSV oficial.");
   if(!all.length)throw Error("CNES não retornou estabelecimentos aproveitáveis do município.");
   addStage("saude",all);log("CNES",all.length+" estabelecimentos recebidos em "+pages+" página(s), sujeitos a conferência.","ok");
  }catch(e){errors.push("CNES: "+e.message);log("CNES",e.message+" · alternativa: baixar CSV oficial e importar por arquivo.","error");}
 }finally{
  state.busy=false;stage.updated=new Date().toISOString();renderTerritory();
  if(errors.length)notify("Importação parcial: "+errors.length+" fonte(s) indisponível(is). Consulte o registro e use CSV/GeoJSON.");
  else notify("Dados recebidos. Confira e escolha Salvar implantação.");
 }
}
async function loadFile(file){
 if(!file||state.busy)return;
 if(file.size>limites.arquivoBytesMaximos){notify("Arquivo acima do limite de "+(limites.arquivoBytesMaximos/1e6)+" MB.");return;}
 try{
  const contents=await file.text(),kind=$("mi-kind")?.value||"bairros";
  const isCSV=file.name.toLowerCase().endsWith(".csv")||kind==="cnes-csv";
  let rows=[];
  if(isCSV){
   rows=state.C.parseCSV(contents).map(x=>state.C.linhaCSVParaCNES(x)).filter(Boolean);
   if(!rows.length)throw Error("Nenhum estabelecimento do município encontrado no CSV CNES.");
   addStage("saude",rows);
  }else{
   const data=JSON.parse(contents);
   if(Array.isArray(data)||data?.estabelecimentos||data?.data){
    rows=state.C.unwrapCNES(data).rows.map(x=>state.C.cnesItem(x)).filter(Boolean);
    if(!rows.length)throw Error("Nenhum estabelecimento CNES reconhecido no JSON.");
    addStage("saude",rows);
   }else{
    const type=["saude","emergencias","parceiros"].includes(kind)?"instituicoes":kind;
    rows=state.C.geoItems(data,type);
    if(["saude","emergencias","parceiros"].includes(kind)){
     const cat={saude:"Saúde",emergencias:"Emergência",parceiros:"Parceiros"}[kind];
     rows=rows.map(x=>({...x,categoria:cat}));
    }
    addStage(kind,rows);
   }
  }
  log("Arquivo "+file.name,rows.length+" feições identificadas; alterações aguardam conferência.","ok");
  renderTerritory();notify(rows.length+" registros importados para prévia.");
 }catch(e){log("Arquivo",e.message,"error");renderTerritory();notify("Arquivo não importado: "+e.message);}
}
async function saveAll(){
 if(state.busy||!ready())return;
 const packageData={codigo_ibge:state.C.MUNICIPIO,grupos:stage.grupos,fonte:"IBGE / CNES / fonte municipal"};
 if(stage.geo||stage.ibge){
  const geo=stage.geo?{limite_geojson:stage.geo,fonte_geo:state.C.FONTES.malha,geo_atualizado:new Date().toISOString()}:{};
  if(stage.ibge)Object.assign(geo,{pais:state.C.PAIS.nome,paisId:state.C.PAIS.id,estado:state.C.ESTADO.nome,codigo_uf:state.C.ESTADO.codigo_ibge});
  packageData.municipioGeo=geo;
 }
 if(!Object.values(stage.grupos).some(v=>v.length)&&!packageData.municipioGeo){notify("Não há dados novos para salvar.");return;}
 if(!confirm("Salvar a implantação no cadastro municipal? Registros já validados não serão sobrescritos. Nenhuma prefeitura externa será notificada."))return;
 try{
  state.busy=true;
  renderTerritory();
  const result=await state.ctx.db.implantarPacote(packageData);
  stage.grupos={};stage.geo=null;stage.ibge=null;
  const total=Object.values(result.totais).reduce((n,x)=>n+x.novos+x.atualizados,0);
  log("Salvamento",total+" registros gravados ou atualizados. Faça a validação operacional antes de usar.","ok");
  notify("Implantação salva: "+total+" registro(s).");
 }catch(e){log("Salvamento",e.message,"error");notify("Falha: "+e.message);}finally{state.busy=false;renderTerritory();}
}
return {importOfficial,loadFile,saveAll};
}
root.AlertaImplantacaoImportacao={criar};
})(globalThis);
