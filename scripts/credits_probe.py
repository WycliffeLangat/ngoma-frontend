import urllib.request, pathlib, re
u='https://www.shazam.com/song/1824501743/taya'
s=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read().decode()
pathlib.Path('output/credits/probe.html').write_text(s,encoding='utf-8')
for term in ['trackCredits','composerName','Julius','Producer','credits','Songwriter']:
    m=re.search(term,s)
    print(term, s[max(0,m.start()-100):m.start()+400] if m else 'absent')
