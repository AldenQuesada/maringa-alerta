/* Adaptador explícito de demonstração; nenhum privilégio real é simulado como concedido. */
(function(root){
'use strict';
function criar(){
  const central=root.AlertaAdminPlataforma.criar();
  let reference;
  async function catalog(){
    if(!reference){
      const response=await fetch('../dados-territoriais/catalogo-ibge.json');
      if(!response.ok)throw Error('Catálogo IBGE indisponível.');
      reference=await response.json();
    }
    return reference;
  }
  return {
    remoto:false,
    async catalogo(uf){const data=await catalog();return uf?data.municipios.filter(x=>x.uf===uf):data.ufs;},
    async listar({busca='',uf='',pagina=0}={}){
      const items=central.municipios().filter(x=>(!uf||x.uf===uf)&&(!busca||(x.nome+' '+x.codigo_ibge).toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR'))));
      return {items:items.slice(pagina*25,(pagina+1)*25),total:items.length,pagina,tamanho:25};
    },
    async estatisticas(){const items=central.municipios();return [items.length,...['implantacao','ativa','suspensa'].map(s=>items.filter(x=>x.status===s).length)];},
    async detalhe(id){const p=central.municipios().find(x=>x.id===id);if(!p)throw Error('Prefeitura não encontrada.');return p;},
    async salvar(dados,anterior){
      const saved=central.gravarPrefeitura({uf:dados.uf,estado:dados.estado,cidade:{id:dados.codigo_ibge,nome:dados.nome,uf:{sigla:dados.uf}},telefone:dados.telefone,email:dados.email,adminMunicipal:dados.responsavel,status:dados.status},anterior?.id);
      if(dados.limite_geojson)central.registrarGeo(saved.id,dados);
      return saved;
    },
    async acessos(){throw Error('A gestão de acessos exige conexão autenticada ao banco.');},
    async auditoria(){throw Error('O histórico de alterações exige conexão autenticada ao banco.');}
  };
}
root.AlertaPlataformaUI.criarDemo=criar;
})(globalThis);
