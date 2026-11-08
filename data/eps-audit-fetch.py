import urllib.request, urllib.error, concurrent.futures, json, pathlib, hashlib
urls = [
'https://www.pedagogie.ac-aix-marseille.fr/jcms/c_78026/accueil',
'https://ent2d.ac-bordeaux.fr/disciplines/eps/',
'https://ent2d.ac-bordeaux.fr/disciplines/eps/feed/',
'https://eps.wp.ac-dijon.fr/',
'https://eps.wp.ac-dijon.fr/feed/',
'https://sites.ac-nancy-metz.fr/eps/portail/index.php',
'https://sites.ac-nancy-metz.fr/eps/wp/',
'https://pedagogie.ac-nantes.fr/les-disciplines-du-second-degre/education-physique-et-sportive',
'https://www.pedagogie.ac-nice.fr/eps/',
'https://pedagogie.ac-orleans-tours.fr/spip.php?rubrique2375',
'https://pedagogie.ac-reims.fr/',
'https://site.ac-martinique.fr/eps/',
'https://site.ac-martinique.fr/eps/feed/',
'https://eps.ac-mayotte.fr/',
'https://www.ac-reunion.fr/education-physique-et-sportive-2nd-degre-126428',
'https://www.ac-polynesie.pf/education-physique-et-sportive-121528',
'https://eps.education.pf/',
'https://eduscol.education.gouv.fr/4434/education-physique-et-sportive',
'https://edubase.eduscol.education.fr/'
]
root=pathlib.Path('C:/Users/Clement/Documents/Cursor/VeilleEPS/data/eps-audit'); root.mkdir(exist_ok=True)
def fetch(url):
 d={'url':url}
 try:
  with urllib.request.urlopen(url, timeout=25) as r:
   b=r.read(); d.update(status=r.status,final=r.url,type=r.headers.get('Content-Type'),bytes=len(b)); p=root/(hashlib.sha256(url.encode()).hexdigest()[:12]+'.html'); p.write_bytes(b); d['file']=str(p)
 except urllib.error.HTTPError as e: d.update(status=e.code,error=str(e))
 except Exception as e: d.update(status=None,error=str(e))
 return d
if __name__=='__main__':
 import sys
 targets=sys.argv[1:] or urls
 with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
  for d in ex.map(fetch,targets): print(json.dumps(d,ensure_ascii=False),flush=True)
