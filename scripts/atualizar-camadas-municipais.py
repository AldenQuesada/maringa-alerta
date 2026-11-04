#!/usr/bin/env python3
"""Consulta camadas municipais publicadas no catálogo GeoMaringá.
Bairro: SIGMARINGA/MAPA_BASE/MapServer/7
Zonas:  SIGMARINGA/MAPA_BASE/MapServer/10
Saída pode ficar ausente se portal estiver indisponível; NÃO fabrica geometria.
"""
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request,urlopen
import json, datetime, math, re

BASE="https://geoproc.maringa.pr.gov.br/arcgis/rest/services/SIGMARINGA/MAPA_BASE/MapServer"
DATA=Path("dados-territoriais")
LAYERS={"bairros-municipais":7,"zonas-cartograficas":10}

def get(url,params):
    req=Request(url+"?"+urlencode(params),headers={"User-Agent":"MaringaAlerta/1.0","Accept":"application/json"})
    with urlopen(req,timeout=40) as r:
        raw=r.read(19000000)
    obj=json.loads(raw)
    if "error" in obj: raise RuntimeError(str(obj["error"]))
    return obj

def pointinside(p,ring):
    x,y=p;hit=False
    for i in range(len(ring)):
        a,b=ring[i],ring[(i+1)%len(ring)]
        if ((a[1]>y)!=(b[1]>y)):
            cut=(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]
            if x<cut:hit=not hit
    return hit

def area(ring):
    return sum((ring[i][0]*ring[i+1][1]-ring[i+1][0]*ring[i][1]) for i in range(len(ring)-1))/2

def rings2geo(rings):
    rings=[r for r in rings if len(r)>=4]
    if not rings: return None
    # ArcGIS outer rings are clockwise; holes are counterclockwise.
    outer=[r for r in rings if area(r)<0]
    holes=[r for r in rings if area(r)>=0]
    if not outer:outer=[max(rings,key=lambda r:abs(area(r)))];holes=[r for r in rings if r is not outer[0]]
    polygons=[[r] for r in outer]
    for hole in holes:
        idx=next((i for i,p in enumerate(polygons) if pointinside(hole[0],p[0])),None)
        if idx is not None:polygons[idx].append(hole)
        else:polygons.append([hole])
    return {"type":"Polygon","coordinates":polygons[0]} if len(polygons)==1 else {"type":"MultiPolygon","coordinates":polygons}

def name_field(fields):
    names=[f["name"] for f in fields]
    for regex in [r"^nome$",r"^nm_?bairro$",r"^nome_?bairro$",r"^bairro$",r"^nome_?zona$",r"^zona$",r"^nm_",r"nome",r"bairro",r"zona",r"descricao"]:
        for n in names:
            if re.search(regex,n,re.I):return n
    return None

def main():
    results={}
    DATA.mkdir(exist_ok=True)
    for key,index in LAYERS.items():
        url=f"{BASE}/{index}"
        try:
            meta=get(url,{"f":"json"})
            fields=meta.get("fields",[])
            print(f"{key}: {meta.get('name')} · tipo {meta.get('geometryType')} · campos {[x['name'] for x in fields][:35]}",flush=True)
            if meta.get("geometryType")!="esriGeometryPolygon":
                raise ValueError("A camada não contém polígonos")
            label=name_field(fields)
            if not label:raise ValueError("Sem campo reconhecível de nome")
            where="1=1"
            data=get(url+"/query",{"where":where,"returnIdsOnly":"true","f":"json"})
            ids=data.get("objectIds") or []
            print(f"{key}: {len(ids)} identificadores, campo {label}",flush=True)
            if not ids or len(ids)>20000:raise ValueError("Sem feições ou camada excessivamente grande")
            objectfield=data.get("objectIdFieldName") or meta.get("objectIdField") or "OBJECTID"
            feats=[]
            for start in range(0,len(ids),80):
                batch=get(url+"/query",{"objectIds":",".join(map(str,ids[start:start+80])),"outFields":"*","returnGeometry":"true","outSR":"4326","geometryPrecision":"6","maxAllowableOffset":"0.000012","f":"json"})
                for item in batch.get("features",[]):
                    p=item.get("attributes") or {};labelval=str(p.get(label) or "").strip()
                    if not labelval:continue
                    g=item.get("geometry") or {}
                    geom=rings2geo(g.get("rings") or [])
                    if not geom:continue
                    # Verify coordinates are in Maringá; reject a foreign municipality layer.
                    coords=geom["coordinates"]
                    first=coords[0][0] if geom["type"]=="Polygon" else coords[0][0][0]
                    if not (-52.4<float(first[0])<-51.5 and -23.9<float(first[1])<-23.0):
                        raise ValueError(f"Fora da região de Maringá: {first}")
                    oid=str(p.get(objectfield) or p.get("OBJECTID") or len(feats))
                    feats.append({"type":"Feature","id":key+"-"+oid,"properties":{
                        "id":key+"-"+oid,"nome":labelval,"municipio":"Maringá","codigo_municipio":"4115200",
                        "fonte":"GeoMaringá / Prefeitura de Maringá", "camada":str(meta.get("name") or key),
                        "codigo":oid
                    },"geometry":geom})
            if len(feats)<5:raise ValueError("Menos de cinco polígonos retornados")
            doc={"type":"FeatureCollection","name":key,"features":feats}
            dest=DATA/(f"maringa-{key}.geojson")
            dest.write_text(json.dumps(doc,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
            results[key]={"status":"sucesso","count":len(feats),"nomes_distintos":len(set(f["properties"]["nome"] for f in feats)),"source":url}
            print(f"{key}: SUCESSO {len(feats)} polígonos, {dest.stat().st_size} bytes",flush=True)
        except Exception as e:
            results[key]={"status":"indisponivel","erro":str(e),"source":url}
            print(f"{key}: INDISPONÍVEL {e!r}",flush=True)
    manifest={"consulta_em_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"camadas":results,
              "nota":"Zonas de uso/censo/cartografia não são zonas operacionais homologadas pela Defesa Civil."}
    (DATA/"maringa-municipal-fonte.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
    # No silent success: print as explicit status for audit.
    print(json.dumps(manifest,ensure_ascii=False),flush=True)
if __name__=="__main__":
    main()
