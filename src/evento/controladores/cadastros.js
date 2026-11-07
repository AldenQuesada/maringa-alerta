/* Controlador cadastros: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('cadastros',{
 dependencias:{
  "conectado": "contexto",
  "prefeituraContexto": "contexto",
  "storageKey": "contexto",
  "todosFuncionarios": "regioes",
  "equipesPrefeitura": "equipes"
},
 criar(dependencias){
 let administracaoLocal,adminSaved;
 function saveAdminState(){return administracaoLocal.salvar({funcionarios:dependencias.todosFuncionarios(),equipes:dependencias.equipesPrefeitura});}
 async function iniciar(){
 (administracaoLocal=AlertaEventoAdministracaoLocal.criar({armazenamento:localStorage,chave:dependencias.storageKey('admin'),chaveLegada:AlertaGestaoDados.config.referencias(dependencias.prefeituraContexto).legadoAdmin,habilitado:!dependencias.conectado}));
(adminSaved=administracaoLocal.carregar());
if(adminSaved && adminSaved.funcionarios){
  adminSaved.funcionarios.forEach(saved=>{
    const p = dependencias.todosFuncionarios().find(x=>x.id===saved.id);
    if(p){ p.nome=saved.nome; p.cargo=saved.cargo; p.tel=saved.tel; }
  });
}
 return true;
 }
 return {iniciar,get administracaoLocal(){return administracaoLocal;},saveAdminState,get adminSaved(){return adminSaved;}};
 }
});
})(globalThis);
