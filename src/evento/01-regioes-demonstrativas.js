/* Composição das regiões demonstrativas do município selecionado. */
const bairros = AlertaEventoRegioesDemonstrativas.criar({referencia:referenciaDemonstracao,habilitado:exibirEquipesLegadas,ponto:randPointInBox});
const PAPEL_LABEL = {responsavel:'Responsável',substituto:'Substituto',coordenador:'Coordenador'};
const MUNICIPIO_CENTER = AlertaGestaoDados.config.centro(prefeituraContexto);
function todosFuncionarios(){return bairros.flatMap(b=>Object.values(b.equipe));}
