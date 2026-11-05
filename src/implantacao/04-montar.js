function montar({page,db,mode,toast}){
 ctx={page,db,toast};if(mode==="pessoas"){if(map){map.remove();map=null;}renderRH();}
 else if(mode==="implantacao")renderTerritory();
}
global.AlertaImplantacaoUI={montar,renderTerritory,renderRH,preview:()=>JSON.parse(JSON.stringify(stage))};
})(typeof globalThis!=="undefined"?globalThis:window);
