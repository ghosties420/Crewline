"""Reproducible noncommercial camera subset. Input is a saved upstream cameras.json.
No inference that an ordinary CCTV camera is ANPR. Unknown road coverage is excluded.
"""
import json,sys,re,hashlib,pathlib,collections
raw=pathlib.Path(sys.argv[1]).read_bytes()
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()=='e9e503d07356c86b0d9cbfb33d46922a927bd47c', 'Unexpected snapshot: review the new source before changing the pinned hash'
rows=json.loads(raw)
source='https://github.com/nzjjay/nz-cctv'
road_units={'ROAD','TRANSPORT','Traffic Camera','NZTA','Traffic Flow','Traffic Monitoring','Traffic'}
# Explicit non-road facilities are excluded even if assigned to a road department.
nonroad=re.compile(r'\b(toilets?|playground|library|libraries|pool|indoor|inside|reception|lift|platform|foyer|stair|office|depot|recycling|skatepark)\b',re.I)
roadname=re.compile(r'\b(road|rd|street|st|highway|sh\s*\d+|intersection|roundabout|motorway|avenue|ave|drive|dr|traffic)\b',re.I)
out=[]
for r in rows:
 lat,lon=r.get('lat'),r.get('lng')
 if not isinstance(lat,(float,int)) or not isinstance(lon,(float,int)) or not(-48<=lat<=-33 and 165<=lon<=180):continue
 anpr=r.get('anpr')==1
 if nonroad.search(r.get('name','')):continue
 if not anpr and r.get('business_unit') not in road_units and not (roadname.search(r.get('name','')) and r.get('agency') not in {'NIWA','GNS','Metservice'}):continue
 if r.get('business_unit') in {'Spot Speed (SP)','Red Light (RL)','Point to Point (P2P)','TRAIN','BUS','FERRY','PARKING'} and not anpr:continue
 unit=r.get('business_unit') or 'Unspecified'
 out.append({'id':'nzcctv-'+str(r['id']),'type':'anpr' if anpr else 'cctv','name':r['name'],'lat':lat,'lon':lon,'agency':r.get('agency',''),'region':r.get('region',''),'category':unit,'sourceDate':'Not supplied per camera','basis':'Explicit ANPR flag' if anpr else ('Road/traffic category' if unit in road_units else 'Road address; field of view unverified')})
data={'source':source,'credit':'Jay J / NZ CCTV Camera Map (2026), from agency publications and OIA releases','license':'CC BY-NC 4.0','licenseUrl':'https://creativecommons.org/licenses/by-nc/4.0/','retrieved':'2026-11-03','inputSha256':hashlib.sha256(raw).hexdigest(),'upstreamBlob':'e9e503d07356c86b0d9cbfb33d46922a927bd47c','warning':'Incomplete, potentially outdated and approximate locations. Road classification is filtered from category or address, not verified field of view. No live footage.','cameras':out}
root=pathlib.Path(__file__).resolve().parent.parent
(root/'android/app/src/main/assets/surveillance.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
print(collections.Counter(r['type'] for r in out))
