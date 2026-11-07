/* Domínio de utilidades: dependências explícitas, sem estado compartilhado entre arquivos. */
(function(root){
'use strict';
const LIMITE_MENSAGEM=2500;
const norm=x=>String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const telefone=x=>String(x??"").replace(/\D/g,"");
const mesmoTelefone=(a,b)=>{const x=telefone(a),y=telefone(b);return x&&y&&(x===y||x.length>=10&&y.length>=10&&x.slice(-11)===y.slice(-11));};
function waLink(numero,mensagem) {
 const n=telefone(numero);
 if(n.length<10||n.length>13)return null;
 const full=n.startsWith("55")?n:"55"+n;
 return "https://wa.me/"+full+"?text="+encodeURIComponent(String(mensagem||"").slice(0,LIMITE_MENSAGEM));
}
const array=x=>Array.isArray(x)?x.filter(Boolean):typeof x==="string"?x.split(/[;,]/).map(y=>y.trim()).filter(Boolean):[];
function validarBase({nome,telefone:tel,endereco,tipo_pessoa},{exigirTipoPessoa=true}={}) {
  if(!String(nome||"").trim())throw Error("Informe o nome ou a razão social.");
  if((exigirTipoPessoa||tipo_pessoa)&&!["FÍSICA","JURÍDICA"].includes(tipo_pessoa))
   throw Error("Escolha pessoa física ou jurídica.");
  if(!String(endereco||"").trim())throw Error("Informe o endereço.");
  if(telefone(tel).length<10||telefone(tel).length>13)throw Error("Informe um telefone/WhatsApp válido.");
 }
root.AlertaCriseUtilidades={LIMITE_MENSAGEM,norm,telefone,mesmoTelefone,waLink,array,validarBase};
})(globalThis);
