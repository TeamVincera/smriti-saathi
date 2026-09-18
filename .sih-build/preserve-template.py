import zipfile,json,copy,posixpath
from lxml import etree as E
N={'a':'http://schemas.openxmlformats.org/drawingml/2006/main','p':'http://schemas.openxmlformats.org/presentationml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
R='http://schemas.openxmlformats.org/package/2006/relationships'
src='/Users/naitik/Downloads/SIH2026-IDEA-Presentation-Format (1).pptx'
z=zipfile.ZipFile(src); au=zipfile.ZipFile('.sih-build/authored.pptx'); data={x:z.read(x) for x in z.namelist()}
def parse(b):return E.fromstring(b)
def xml(e):return E.tostring(e,xml_declaration=True,encoding='UTF-8',standalone=True)
def findshape(e,name):return next(s for s in e.findall('.//p:sp',N) if s.find('p:nvSpPr/p:cNvPr',N).get('name')==name)
for i in range(1,7):
 f=f'ppt/slides/slide{i}.xml'; orig=parse(data[f]); authored=parse(au.read(f))
 for ed in json.load(open('.sih-build/edits.json')):
  if ed['slide']!=i:continue
  s=findshape(orig,ed['name']); a=findshape(authored,ed['name'])
  old=s.find('p:txBody',N); idx=list(s).index(old); s.remove(old); s.insert(idx,copy.deepcopy(a.find('p:txBody',N)))
  if ed.get('geometry'):
   sp=s.find('p:spPr',N); x=sp.find('a:xfrm',N)
   if x is not None:sp.remove(x)
   sp.insert(0,copy.deepcopy(a.find('p:spPr/a:xfrm',N)))
 data[f]=xml(orig)
 relfile=f'ppt/slides/_rels/slide{i}.xml.rels'; rel=parse(data[relfile]); arel=parse(au.read(relfile))
 for r in arel:
  if r.get('Type').endswith('/hyperlink'):rel.append(copy.deepcopy(r))
 note=next((r for r in rel if r.get('Type').endswith('/notesSlide')),None)
 if note is not None:rel.remove(note)
 nf=f'ppt/notesSlides/notesSIH{i}.xml'
 E.SubElement(rel,'{'+R+'}Relationship',Id=f'SIHNotes{i}',Type=N['r']+'/notesSlide',Target='../notesSlides/notesSIH'+str(i)+'.xml')
 an=parse(au.read(f'ppt/notesSlides/notesSlide{i}.xml'))
 for t in an.findall('.//a:t',N):
  if t.text:t.text=t.text.replace(' No new live app verification was performed to prepare this deck.','')
 data[nf]=xml(an)
 nr=E.Element('{'+R+'}Relationships',nsmap={None:R})
 E.SubElement(nr,'{'+R+'}Relationship',Id='rId1',Type=N['r']+'/notesMaster',Target='../notesMasters/notesMaster1.xml')
 E.SubElement(nr,'{'+R+'}Relationship',Id='rId2',Type=N['r']+'/slide',Target=f'../slides/slide{i}.xml')
 data[f'ppt/notesSlides/_rels/notesSIH{i}.xml.rels']=xml(nr)
 ct=parse(data['[Content_Types].xml'])
 E.SubElement(ct,'{http://schemas.openxmlformats.org/package/2006/content-types}Override',PartName='/'+nf,ContentType='application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml')
 data['[Content_Types].xml']=xml(ct)
 data[relfile]=xml(rel)
# Preserve original instruction page in a private full-template copy.
with zipfile.ZipFile('.sih-build/filled-template.pptx','w',zipfile.ZIP_DEFLATED) as out:
 for k,v in data.items():out.writestr(k,v)
# Six-slide presentation. The supplied instruction page is not presentation content.
p=parse(data['ppt/presentation.xml']); ids=p.find('p:sldIdLst',N); last=ids[-1]; rid=last.get('{'+N['r']+'}id'); ids.remove(last); data['ppt/presentation.xml']=xml(p)
rels=parse(data['ppt/_rels/presentation.xml.rels'])
for r in list(rels):
 if r.get('Id')==rid:rels.remove(r)
data['ppt/_rels/presentation.xml.rels']=xml(rels)
with zipfile.ZipFile('.sih-build/candidate.pptx','w',zipfile.ZIP_DEFLATED) as out:
 for k,v in data.items():out.writestr(k,v)
# Source masters, layouts, themes and artwork must remain byte-for-byte unchanged.
protected=[k for k in data if k.startswith(('ppt/slideMasters/','ppt/slideLayouts/','ppt/theme/','ppt/media/'))]
assert all(data[k]==z.read(k) for k in protected)
print('Preserved',len(protected),'template assets and parts unchanged')
