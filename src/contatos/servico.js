/* Fronteira remota: nenhuma identidade, resposta ou transição é inventada no navegador. */
(function(root){'use strict';
function criar(client,municipio){
 async function rpc(name,args){const {data,error}=await client.rpc(name,{municipio,...args});if(error)throw error;return data;}
 return {
  listar:f=>rpc('ma_contatos_listar',{busca:f.busca,categoria:f.categoria,etapa:f.etapa,pagina:f.pagina}),
  detalhe:(chave,antes=null)=>rpc('ma_contato_detalhe',{chave,antes}),
  excluir:(chave,revisao)=>rpc('ma_contato_excluir',{chave,revisao}),
  async imagem(media){if(media?.bucket!=='ma-whatsapp'||!media.path)throw Error('media');const {data,error}=await client.storage.from(media.bucket).createSignedUrl(media.path,120);if(error)throw error;return data.signedUrl;}
 };
}
root.AlertaContatosServico={criar};
})(globalThis);
