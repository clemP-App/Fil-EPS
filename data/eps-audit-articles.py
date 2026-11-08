import xml.etree.ElementTree as E, concurrent.futures,sys,json
from importlib.machinery import SourceFileLoader
sys.argv=['x'];m=SourceFileLoader('fetch','data/eps-audit-fetch.py').load_module()
urls=[]
for f in ['c73038ca28ed','5cb107278daf','934eaf807755','c76be6fad4c6','a792b49a013c']:
 r=E.parse('data/eps-audit/'+f+'.html')
 for i in r.findall('./channel/item')[:3]:urls.append(i.findtext('link'))
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
 for d in ex.map(m.fetch,urls):print(json.dumps(d,ensure_ascii=False))
