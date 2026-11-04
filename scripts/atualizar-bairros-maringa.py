#!/usr/bin/env python3
"""Obtém bairros de Maringá do serviço público Paraná Interativo (FeatureServer 9).

Não inventa polígonos nem usa as seis zonas demonstrativas como bairros.
Falha de maneira explícita quando a fonte não corresponde a Maringá ou retorna
menos do que uma cobertura minimamente plausível.
"""
import datetime as dt
import json
import math
import os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

SERVICE="https://paranainterativo.pr.gov.br/interativo2/rest/services/BaseDadosParanaInterativo/FeatureServer/9/query"
IBGE="4115200"
OUTPUT=Path("dados-territoriais/maringa-bairros.geojson")
META=Path("dados-territoriais/maringa-bairros-fonte.json")
FIELDS="OBJECTID,CdBairro_A,NmBairro,CdMunicipioIBGE,NmMunicipio,Lei"

def request(params):
    url=SERVICE+"?"+urlencode(params)
    req=Request(url,headers={"User-Agent":"MaringaAlerta/1.0 contato administrativo; importacao cartografica", "Accept":"application/json"})
    with urlopen(req,timeout=70) as resp:
        data=resp.read(18000000)
        if len(data)>=18000000:
            raise ValueError("Resposta maior que 18 MB")
        d=json.loads(data)
        if "error" in d:
            raise RuntimeError("Erro ArcGIS: "+str(d["error"]))
        return d

def geojson(bairro_query):
    items=[]
    count_json=request({"where":bairro_query,"returnCountOnly":"true","f":"json"})
    expected=int(count_json.get("count",0))
    print(f"Consulta {bairro_query}: {expected} feicoes identificadas",flush=True)
    if expected<30:
        return [],expected
    step=300
    for offset in range(0,expected,step):
        payload=request({
            "where":bairro_query,"outFields":FIELDS,"returnGeometry":"true",
            "outSR":"4326","f":"geojson","orderByFields":"OBJECTID",
            "resultOffset":str(offset),"resultRecordCount":str(step),
            "geometryPrecision":"6","maxAllowableOffset":"0.000012",
        })
        batch=payload.get("features",[])
        if not batch:
            raise ValueError(f"Consulta interrompida no offset {offset}; esperado {expected}")
        items.extend(batch)
        print(f"Buscadas {len(items)}/{expected}",flush=True)
    if len(items)!=expected:
        raise ValueError(f"Total incompleto: esperado {expected}, recebido {len(items)}")
    return items,expected

def inside_ring(obj):
    typ=obj.get("type")
    if typ=="Polygon":
        coords=obj.get("coordinates",[])
        for ring in coords:
            for c in ring:
                yield c
    elif typ=="MultiPolygon":
        coords=obj.get("coordinates",[])
        for polygon in coords:
            for ring in polygon:
                for c in ring:
                    yield c

def process():
    where=f"CdMunicipioIBGE='{IBGE}'"
    try:
        items,count=geojson(where)
    except Exception as e:
        print("Falha filtro municipal exato:",repr(e),flush=True)
        raise
    if count<30:
        raise ValueError(f"A fonte retornou apenas {count} feicoes para {IBGE}, insuficiente para publicar automaticamente.")
    out=[]
    names=set()
    for f in items:
        p=f.get("properties") or {}
        if str(p.get("CdMunicipioIBGE","")).strip()!=IBGE:
            raise ValueError("A fonte incluiu município diferente de Maringá")
        name=str(p.get("NmBairro") or "").strip()
        if not name:
            raise ValueError("Feição sem nome de bairro")
        g=f.get("geometry") or {}
        if g.get("type") not in ("Polygon","MultiPolygon"):
            raise ValueError("Geometria de bairro não poligonal")
        points=list(inside_ring(g))
        if len(points)<4:
            raise ValueError("Geometria vazia")
        for point in points:
            if not (isinstance(point,(list,tuple)) and len(point)>=2 and math.isfinite(float(point[0])) and math.isfinite(float(point[1]))):
                raise ValueError("Coordenadas malformadas")
            lon,lat=float(point[0]),float(point[1])
            if not (-52.4<lon<-51.5 and -23.9<lat<-23.0):
                raise ValueError(f"Geometria fora da região de Maringá ({lat},{lon})")
        raw_id=str(p.get("CdBairro_A") or p.get("OBJECTID") or "").strip()
        if not raw_id: raise ValueError("Bairro sem identificador")
        names.add(name)
        out.append({"type":"Feature","id":raw_id,"properties":{
            "id":raw_id,"nome":name,"codigo_bairro":str(p.get("CdBairro_A") or ""),
            "codigo_municipio":IBGE,"municipio":"Maringá",
            "lei":str(p.get("Lei") or ""),"fonte":"Paraná Interativo / Paranacidade"
        },"geometry":g})
    if len(names)<30:
        raise ValueError(f"Nomes distintos insuficientes: {len(names)}")
    out.sort(key=lambda f:(f["properties"]["nome"].casefold(),f["id"]))
    doc={"type":"FeatureCollection","name":"Bairros de Maringá (PR)",
      "features":out}
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps(doc,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    META.write_text(json.dumps({
        "municipio":"Maringá","codigo_ibge":IBGE,"camada":"Bairro (ID 9)",
        "servico":SERVICE,"filtro":where,"consulta_em_utc":dt.datetime.now(dt.timezone.utc).isoformat(),
        "feicoes":len(out),"nomes_distintos":len(names),
        "observacao":"Bairros administrativos, não zonas operacionais da Defesa Civil. Verificar atualidade com IPPLAM.",
        "status":"Dados publicados pela fonte estadual, sujeitos à revisão da Prefeitura"
     },ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"SUCESSO: {len(out)} feicoes, {len(names)} nomes distintos; {OUTPUT.stat().st_size} bytes",flush=True)

if __name__=="__main__":
    process()
