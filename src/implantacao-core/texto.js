/* Normalização textual compartilhada pelos importadores. */
(function(root){
'use strict';
const norm=x=>String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const str=x=>String(x??"").trim();
const pick=(x,keys)=>{for(const k of keys){if(x?.[k]!==undefined&&x?.[k]!==null&&x?.[k]!=="")return x[k];}return "";};
const digits=x=>str(x).replace(/\D/g,"");

root.AlertaImplantacaoTexto={norm,str,pick,digits};
})(globalThis);
