/* Leitura segura do estado operacional local. Nunca altera o armazenamento. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OperacaoRestauracao=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const posicaoValida=p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&Math.abs(p[0])<=90&&Math.abs(p[1])<=180;
function ler(storage,chave,municipioId){
 let original;try{original=storage.getItem(chave);}catch(_){return {estado:'bloqueado',motivo:'Não foi possível acessar os dados deste navegador.',original:null};}
 if(original===null)return {estado:'vazio'};
 let dados;try{dados=JSON.parse(original);}catch(_){return {estado:'bloqueado',motivo:'Os dados salvos não puderam ser lidos.',original};}
 const bloqueado=motivo=>({estado:'bloqueado',motivo,original});
 if(!dados||typeof dados!=='object'||Array.isArray(dados)||dados.versao!==1)return bloqueado('A versão dos dados salvos precisa de recuperação.');
 if(dados.tenantId!==municipioId)return bloqueado('Os dados salvos pertencem a outro município.');
 if(!Array.isArray(dados.ocorrencias)||!Array.isArray(dados.voluntarios))return bloqueado('O arquivo salvo está incompleto.');
 if(dados.voluntarios.some(v=>!v||typeof v!=='object'||!posicaoValida(v.pos)))return bloqueado('Há colaboradores com posição inválida nos dados salvos.');
 if(dados.ocorrencias.some(o=>!o||typeof o!=='object'||(o.status!=='resolvida'&&!posicaoValida(o.pos))))return bloqueado('Há ocorrências com posição inválida nos dados salvos.');
 if(dados.alertasClimaticos!=null&&!Array.isArray(dados.alertasClimaticos))return bloqueado('Os alertas salvos precisam de recuperação.');
 if(dados.chatHistorico!=null&&(typeof dados.chatHistorico!=='object'||Array.isArray(dados.chatHistorico)))return bloqueado('As conversas salvas precisam de recuperação.');
 if(dados.prontidao!=null&&(typeof dados.prontidao!=='object'||Array.isArray(dados.prontidao)))return bloqueado('Os dados de prontidão precisam de recuperação.');
 return {estado:'restauravel',dados,original};
}
return {ler};
});
