async function importOfficial(){
 if(busy||!ready())return;busy=true;renderTerritory();
 const errors=[];
 try{
  try{
   const data=await request(C.FONTES.ibge,18000);
   const p=C.validarMunicipioIBGE(data);stage.ibge=p;
   log("IBGE","Maringá / PR (4115200) identificada por código oficial.","ok");
  }catch(e){errors.push("IBGE Localidades: "+e.message);log("IBGE",e.message,"error");}
  try{
   const geo=await request(C.FONTES.malha,22000);
   stage.geo=JSON.stringify(C.normalizaMalha(geo));
   log("IBGE Malhas","Limite municipal GeoJSON carregado para revisão.","ok");
  }catch(e){errors.push("IBGE Malhas: "+e.message);log("Malha municipal",e.message,"error");}
  try{
   const all=[],known=new Set();let pages=0,stop=false,repeat=0,last="";
   while(pages<150&&!stop){
    const url=new URL(C.FONTES.cnes);url.searchParams.set("codigo_municipio",C.MUNICIPIO.slice(0,6));
    url.searchParams.set("status","1");url.searchParams.set("limit","20");url.searchParams.set("offset",String(pages));
    const data=await request(url.toString(),18000),parsed=C.unwrapCNES(data);
    const fingerprint=JSON.stringify(parsed.rows.slice(0,4).map(x=>C.pick(x,["codigo_cnes","CNES","nome_fantasia"])));
    if(fingerprint===last&&pages>0){repeat++;if(repeat>=1){errors.push("CNES repetiu a página: importação pode estar incompleta.");break;}}
    last=fingerprint;
    for(const raw of parsed.rows){
     const row=C.cnesItem(raw);if(row&&!known.has(row.codigo_cnes)){all.push(row);known.add(row.codigo_cnes);}
    }
    pages++;
    if(!parsed.rows.length||parsed.rows.length<20||parsed.total&&pages*20>=parsed.total)stop=true;
    if(pages%5===0){const info=$("mi-progress");if(info)info.textContent="CNES: "+pages+" páginas consultadas, "+all.length+" registros de Maringá identificados...";}
   }
   if(pages>=150)errors.push("Limite preventivo de 150 páginas CNES atingido. Complete pelo CSV oficial.");
   if(!all.length)throw Error("CNES não retornou estabelecimentos aproveitáveis de Maringá.");
   addStage("saude",all);log("CNES",all.length+" estabelecimentos recebidos em "+pages+" página(s), sujeitos a conferência.","ok");
  }catch(e){errors.push("CNES: "+e.message);log("CNES",e.message+" · alternativa: baixar CSV oficial e importar por arquivo.","error");}
 }finally{
  busy=false;stage.updated=new Date().toISOString();renderTerritory();
  if(errors.length)notify("Importação parcial: "+errors.length+" fonte(s) indisponível(is). Consulte o registro e use CSV/GeoJSON.");
  else notify("Dados recebidos. Confira e escolha Salvar implantação.");
 }
}
async function loadFile(file){
 if(!file||busy)return;
 if(file.size>14e6){notify("Arquivo acima do limite de 14 MB.");return;}
 try{
  const contents=await file.text(),kind=$("mi-kind")?.value||"bairros";
  const isCSV=file.name.toLowerCase().endsWith(".csv")||kind==="cnes-csv";
  let rows=[];
  if(isCSV){
   rows=C.parseCSV(contents).map(x=>C.linhaCSVParaCNES(x)).filter(Boolean);
   if(!rows.length)throw Error("Nenhum estabelecimento de Maringá encontrado no CSV CNES.");
   addStage("saude",rows);
  }else{
   const data=JSON.parse(contents);
   if(Array.isArray(data)||data?.estabelecimentos||data?.data){
    rows=C.unwrapCNES(data).rows.map(x=>C.cnesItem(x)).filter(Boolean);
    if(!rows.length)throw Error("Nenhum estabelecimento CNES reconhecido no JSON.");
    addStage("saude",rows);
   }else{
    const type=["saude","emergencias","parceiros"].includes(kind)?"instituicoes":kind;
    rows=C.geoItems(data,type);
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
 if(busy||!ready())return;
 const packageData={grupos:stage.grupos,fonte:"IBGE / CNES / GeoMaringá / fonte municipal"};
 if(stage.geo||stage.ibge){
  const geo=stage.geo?{limite_geojson:stage.geo,fonte_geo:C.FONTES.malha,geo_atualizado:new Date().toISOString()}:{}; 
  if(stage.ibge)Object.assign(geo,{pais:"Brasil",paisId:"BR",estado:"Paraná",codigo_uf:"41"});
  packageData.municipioGeo=geo;
 }
 if(!Object.values(stage.grupos).some(v=>v.length)&&!packageData.municipioGeo){notify("Não há dados novos para salvar.");return;}
 if(!confirm("Salvar a implantação no armazenamento deste navegador? Registros já validados não serão sobrescritos. Nenhuma prefeitura externa será notificada."))return;
 try{
  const result=ctx.db.implantarPacote(packageData);
  stage.grupos={};stage.geo=null;stage.ibge=null;
  const total=Object.values(result.totais).reduce((n,x)=>n+x.novos+x.atualizados,0);
  log("Salvamento",total+" registros gravados ou atualizados. Faça a validação operacional antes de usar.","ok");
  renderTerritory();notify("Implantação salva: "+total+" registro(s).");
 }catch(e){log("Salvamento",e.message,"error");renderTerritory();notify("Falha: "+e.message);}
}
const ROLE_OPTIONS=[["admin","Administrador municipal"],["responsavel","Responsável regional"],["substituto","Substituto"],["coordenador","Coordenador"],["operador","Operador"]];
