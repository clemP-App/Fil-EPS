from html.parser import HTMLParser
import pathlib,sys,json,xml.etree.ElementTree as ET
class P(HTMLParser):
 def __init__(self): super().__init__(); self.links=[]; self.a=None; self.text=[]
 def handle_starttag(self,t,a):
  d=dict(a)
  if t=='a': self.a=[d.get('href',''),'']
  if t=='link' and ('rss' in d.get('type','') or 'atom' in d.get('type','')): self.links.append(d)
 def handle_data(self,s):
  if self.a is not None:self.a[1]+=s
  if s.strip():self.text.append(s.strip())
 def handle_endtag(self,t):
  if t=='a' and self.a is not None:self.links.append(self.a);self.a=None
for f in sys.argv[1:]:
 p=pathlib.Path('data/eps-audit')/f;s=p.read_text(encoding='utf-8',errors='replace');print('\nFILE',f)
 if '<rss' in s:
  r=ET.fromstring(s)
  for i in r.findall('./channel/item')[:5]: print(json.dumps({k:i.findtext(k) for k in ['title','link','pubDate','description']},ensure_ascii=False))
 else:
  a=P();a.feed(s)
  for l in a.links:
   if isinstance(l,dict) or any(x in str(l).lower() for x in ['rss','actual','2026','2025','article','nov','information','feed']):print(json.dumps(l,ensure_ascii=False))
