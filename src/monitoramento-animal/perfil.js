/* perfil: título, camadas, filtros e legenda do mapa vêm de ma_configuracao 'mapas'. Nada é inventado aqui. */
(function(root){'use strict';
const ID="monitoramento-animal";
function validar(perfil,regras){
 if(!perfil||typeof perfil!=="object")throw Error("Perfil do mapa Monitoramento animal não está configurado no banco.");
 for(const campo of ["titulo","camera","camadas","filtros","situacao","estadosEncerrados","textos","cores"])
  if(perfil[campo]==null)throw Error("Perfil do mapa incompleto: falta "+campo+".");
 if(!Array.isArray(perfil.camadas)||!perfil.camadas.length)throw Error("Perfil do mapa sem camadas.");
 for(const cor of ["contornoZona","destaqueRestrito"])if(!/^#[0-9a-f]{3,8}$/i.test(perfil.cores[cor]||""))throw Error("Perfil do mapa incompleto: cor "+cor+" ausente ou inválida.");
 // Enquadramento opcional: [[sul,oeste],[norte,leste]] da área que precisa caber inteira na abertura.
 const q=perfil.enquadramento;
 if(q!=null&&!(Array.isArray(q)&&q.length===2&&q.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))&&q[0][0]<q[1][0]&&q[0][1]<q[1][1]))
  throw Error("Perfil do mapa incompleto: enquadramento inválido.");
 if(!regras||!regras.categoriaTipos)throw Error("Regras da proteção animal ausentes em operacao.protecaoAnimal.");
 return {perfil,regras};
}
async function carregar({client=root.AlertaSupabaseClient,regrasOperacionais=root.AlertaRegrasOperacionais}={}){
 if(!client)throw Error("Mapa disponível somente com acesso à gestão municipal.");
 const {data,error}=await client.from("ma_configuracao").select("documento").eq("id","mapas").single();
 if(error||!data)throw Error("Perfil do mapa indisponível para este acesso.");
 return validar(data.documento?.[ID],regrasOperacionais?.protecaoAnimal);
}
root.AlertaAnimalPerfil={ID,carregar,validar};
})(globalThis);
