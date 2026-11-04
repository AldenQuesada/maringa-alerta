#!/usr/bin/env python3
"""Recorta bairros do Censo 2022/IBGE para Maringá a partir da malha do Paraná.

Fonte pública IBGE, distinta das zonas operacionais da Defesa Civil.
Gera GeoJSON já carregável pelo navegador (não precisa instalação do usuário).
"""
from pathlib import Path
from urllib.request import Request,urlopen
import io,zipfile,datetime,json,os
import shapefile
ZIP="https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/bairros/shp/UF/PR_bairros_CD2022.zip"
OUT=Path("dados-territoriais/maringa-bairros-ibge2022.geojson")
MAN=Path("dados-territoriais/maringa-ibge2022-fonte.json")
def fetch():
    req=Request(ZIP,headers={"User-Agent":"MaringaAlerta/1.0 (dados abertos IBGE)","Accept":"application/zip"})
    with urlopen(req,timeout=70) as r:
        raw=r.read(9000000)
    if len(raw)>8500000: raise ValueError("ZIP maior que o limite")
    return raw
def main():
    archive=zipfile.ZipFile(io.BytesIO(fetch()))
    files=archive.namelist()
    print("IBGE zip:",files,flush=True)
    shp=next(x for x in files if x.lower().endswith(".shp"))
    stem=shp[:-4]
    dbf=next(x for x in files if x.lower()==stem.lower()+".dbf")
    shx=next((x for x in files if x.lower()==stem.lower()+".shx"),None)
    reader=shapefile.Reader(shp=io.BytesIO(archive.read(shp)),
        dbf=io.BytesIO(archive.read(dbf)),shx=io.BytesIO(archive.read(shx)) if shx else None,encoding="latin1")
    print("Campos:",[f[0] for f in reader.fields[1:]],flush=True)
    out=[]
    for rec in reader.iterShapeRecords():
        p=rec.record.as_dict()
        rawmun=str(p.get("CD_MUN",p.get("CD_MUNICIPIO",p.get("CD_MUN_7",""))))
        # Código município ou prefixo do identificador bairro, conforme dicionário IBGE
        bairroId=str(p.get("CD_BAIRRO",p.get("CD_BAI",p.get("CD_BAIR",""))))
        if rawmun!="4115200" and not bairroId.startswith("4115200"):
            continue
        name=str(p.get("NM_BAIRRO",p.get("NM_BAI",p.get("NOME","")))).strip()
        if not name:continue
        geo=rec.shape.__geo_interface__
        if geo.get("type") not in ("Polygon","MultiPolygon"):continue
        id=bairroId or name
        out.append({"type":"Feature","id":"ibge2022-"+id,"properties":{
          "nome":name,"id":"ibge2022-"+id,"codigo_bairro":bairroId,"municipio":"Maringá",
          "codigo_municipio":"4115200","fonte":"IBGE Censo 2022 · Divisões intramunicipais"
        },"geometry":geo})
    if not out: raise ValueError("Nenhum bairro com código de Maringá encontrado")
    OUT.parent.mkdir(exist_ok=True)
    doc={"type":"FeatureCollection","name":"Bairros de Maringá / IBGE 2022","features":out}
    OUT.write_text(json.dumps(doc,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    MAN.write_text(json.dumps({"fonte":ZIP,"consulta_em_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "feicoes":len(out),"nomes_distintos":len(set(f["properties"]["nome"] for f in out)),
        "nota":"Malha IBGE Censo 2022. Não equivale à cartografia municipal 2026 nem às zonas operacionais."},
        ensure_ascii=False,indent=2),encoding="utf-8")
    print("SUCESSO IBGE bairros:",len(out),"nomes distintos:",len(set(f["properties"]["nome"] for f in out)),"bytes",OUT.stat().st_size,flush=True)
if __name__=="__main__":
    main()
