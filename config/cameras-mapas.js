/* Câmeras canônicas de Ajuda, Colaboradores e Evento aprovadas pelo usuário em 07/11/2026.
 * Única fonte para abertura, zoom mínimo e botão de retorno.
 * NÃO recalcular nem substituir sem nova solicitação explícita do usuário.
 * Valores protegidos pelos testes de contrato em tests/cameras-mapas-canonicas.test.cjs.
 */
(function(root){
'use strict';
// O carregamento repetido do bundle preserva a mesma referência imutável.
if(Object.prototype.hasOwnProperty.call(root,'AlertaCamerasMapas'))return;
const cameras=Object.freeze({
 '4115200':Object.freeze({
  ajuda:Object.freeze({lat:-23.4196153,lng:-51.9357534,zoom:13.5732}),
  colaboradores:Object.freeze({lat:-23.4201743,lng:-51.9334015,zoom:12}),
  evento:Object.freeze({lat:-23.4130978,lng:-51.9164556,zoom:13.8408})
 })
});
Object.defineProperty(root,'AlertaCamerasMapas',{
 value:cameras,enumerable:true,writable:false,configurable:false
});
})(globalThis);
