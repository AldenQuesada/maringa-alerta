/* Limites operacionais padrão. Unidade e finalidade explícitas; sem credenciais. */
(function(root){'use strict';
root.AlertaParametros=Object.freeze({
 gps:Object.freeze({validadeMs:90000,raioCheckinMetros:150,precisaoMaximaMetros:100,timeoutMs:20000}),
 implantacao:Object.freeze({timeoutMs:20000,timeoutCadastroMs:18000,timeoutMalhaMs:22000,paginasCnesMaximas:150,tamanhoPaginaCnes:20,arquivoBytesMaximos:14000000,linhasVisiveis:650,marcadoresVisiveis:600}),
 ocorrencias:Object.freeze({raioDuplicidadeMetros:150,janelaDuplicidadeHoras:24,fotosMaximas:4,fotoBytesMaximos:750000}),
 atendimento:Object.freeze({fotoBytesMaximos:8*1024*1024,fotoDimensaoMaxima:920,fotoQualidade:0.67,fotoTextoMaximo:900000})
});
})(globalThis);
