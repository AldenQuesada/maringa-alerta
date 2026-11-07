/* Adaptador de persistência dos cadastros demonstrativos existentes. */
const administracaoLocal=AlertaEventoAdministracaoLocal.criar({armazenamento:localStorage,chave:storageKey('admin'),chaveLegada:AlertaGestaoDados.config.referencias(prefeituraContexto).legadoAdmin,habilitado:!conectado});
function saveAdminState(){return administracaoLocal.salvar({funcionarios:todosFuncionarios(),equipes:equipesPrefeitura});}
const adminSaved = administracaoLocal.carregar();
if(adminSaved && adminSaved.funcionarios){
  adminSaved.funcionarios.forEach(saved=>{
    const p = todosFuncionarios().find(x=>x.id===saved.id);
    if(p){ p.nome=saved.nome; p.cargo=saved.cargo; p.tel=saved.tel; }
  });
}

