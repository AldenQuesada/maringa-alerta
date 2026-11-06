/* ---------- zonas de demonstração sobre o mapa de Maringá ---------- */
const equipePool = exibirEquipesLegadas ? [
  {nome:"Marcos Teixeira", cargo:"Vereador"},
  {nome:"Fernanda Lopes", cargo:"Secretária de Assistência Social"},
  {nome:"Ricardo Bittencourt", cargo:"Chefe de Defesa Civil"},
  {nome:"Juliana Prado", cargo:"Subsecretária de Obras"},
  {nome:"Eduardo Namiki", cargo:"Vereador"},
  {nome:"Carla Mendonça", cargo:"Coordenadora Regional"},
  {nome:"Paulo Henrique Camargo", cargo:"Chefe de Departamento"},
  {nome:"Renata Sakamoto", cargo:"Subsecretária de Assistência Social"},
  {nome:"Vitor Almeida Rocha", cargo:"Coordenador de Campo"},
  {nome:"Simone Aparecida Dias", cargo:"Vereadora"},
  {nome:"André Luiz Ferraz", cargo:"Chefe de Defesa Civil"},
  {nome:"Patrícia Gonçalves", cargo:"Subsecretária de Obras"},
  {nome:"Thiago Moraes Vilela", cargo:"Coordenador Regional"},
  {nome:"Luciana Barreto", cargo:"Secretária de Infraestrutura"},
  {nome:"Fábio Cardoso Neto", cargo:"Chefe de Departamento"},
  {nome:"Mariana Esteves", cargo:"Subsecretária de Saúde"},
  {nome:"Rogério Villela", cargo:"Coordenador de Campo"},
  {nome:"Daniela Freitas", cargo:"Vereadora"},
]:[];
let equipeCursor = 0;
function nextEquipe(){ return equipePool[(equipeCursor++) % equipePool.length]; }

const equipamentosPool = exibirEquipesLegadas ? ["2 motosserras","1 caminhão basculante","1 retroescavadeira","Kit de resgate","Gerador móvel","1 caminhão-pipa","Equipe de eletricistas","Ambulância de apoio"]:[];

const bairros = exibirEquipesLegadas ? [
  { nome:"Zona 7", center:[-23.3995,-51.9395],
    poly:[[-23.392,-51.950],[-23.392,-51.930],[-23.408,-51.930],[-23.408,-51.950]] },
  { nome:"Jardim Alvorada", center:[-23.3870,-51.9120],
    poly:[[-23.380,-51.922],[-23.380,-51.902],[-23.396,-51.902],[-23.396,-51.922]] },
  { nome:"Conjunto Requião", center:[-23.4360,-51.9560],
    poly:[[-23.428,-51.966],[-23.428,-51.946],[-23.446,-51.946],[-23.446,-51.966]] },
  { nome:"Jardim Universo", center:[-23.4430,-51.9230],
    poly:[[-23.435,-51.933],[-23.435,-51.913],[-23.452,-51.913],[-23.452,-51.933]] },
  { nome:"Vila Esperança", center:[-23.3820,-51.9510],
    poly:[[-23.374,-51.962],[-23.374,-51.941],[-23.392,-51.941],[-23.392,-51.962]] },
  { nome:"Centro Cívico", center:[-23.4225,-51.9365],
    poly:[[-23.415,-51.946],[-23.415,-51.927],[-23.430,-51.927],[-23.430,-51.946]] },
]:[];
let funcIdCursor = 1;
const PAPEL_LABEL = { responsavel:"Responsável", substituto:"Substituto", coordenador:"Coordenador" };
bairros.forEach(b=>{
  b.equipamentos = [equipamentosPool[Math.floor(Math.random()*equipamentosPool.length)], equipamentosPool[Math.floor(Math.random()*equipamentosPool.length)]];
  b.equipe = { responsavel: nextEquipe(), substituto: nextEquipe(), coordenador: nextEquipe() };
  // Pontos fixos de demonstração, sem compartilhamento ao vivo.
  Object.entries(b.equipe).forEach(([papel,p])=>{
    p.id = "f"+(funcIdCursor++);
    p.papel = papel;
    p.zona = b.nome;
    p.pos = randPointInBox(b.poly);
    p.tel = "(44) 9" + Math.floor(1000+Math.random()*8999) + "-" + Math.floor(1000+Math.random()*8999);
  });
});
const MARINGA_CENTER = [-23.4205, -51.9333];

// roster plano de todos os funcionarios internos (mesmos objetos referenciados em bairros[].equipe)
function todosFuncionarios(){
  return bairros.flatMap(b=> Object.values(b.equipe));
}

