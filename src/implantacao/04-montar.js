function montar({page,db,mode,toast}){
 if(ctx?.db?.municipioAtivo()?.id!==db.municipioAtivo()?.id){stage.grupos={};stage.geo=null;stage.ibge=null;stage.logs=[];}
 C=global.AlertaImplantacaoCore.criar(db.municipioAtivo());
 ctx={page,db,toast};if(mode==="pessoas"){if(map){map.remove();map=null;}renderRH();}
 else if(mode==="implantacao")renderTerritory();
}
global.AlertaImplantacaoUI={montar,renderTerritory,renderRH,preview:()=>JSON.parse(JSON.stringify(stage))};
})(typeof globalThis!=="undefined"?globalThis:window);
