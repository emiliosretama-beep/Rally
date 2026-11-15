# Empaqueta los clips del copiloto en index.html (bloque <script id="vo-data">).
# Uso: python pack.py <carpeta_es_raw> <carpeta_en_raw> [ruta index.html]
# Cada clip: recorte de silencio, volumen igualado (RMS), mp3 mono 24 kHz 48 kbps, base64.
import sys, os, io, json, base64, subprocess, tempfile
import numpy as np, soundfile as sf
from spec import CLIPS
TEMPO={'es':1.0,'en':1.0}
def proc(path,lang):
  a,sr=sf.read(path,dtype='float32')
  if a.ndim>1:a=a.mean(1)
  env=np.convolve(np.abs(a),np.ones(240)/240,'same');thr=max(env.max()*0.04,1e-4);idx=np.where(env>thr)[0]
  a=a[max(0,idx[0]-int(0.015*sr)):idx[-1]+int(0.04*sr)]
  act=a[np.abs(a)>np.abs(a).max()*0.05];rms=np.sqrt(np.mean(act**2)) if len(act) else 1
  a=a*(10**(-17/20)/max(rms,1e-6));pk=np.abs(a).max();a=a*min(1,10**(-1/20)/pk)
  with tempfile.TemporaryDirectory() as d:
    w=os.path.join(d,'a.wav');m=os.path.join(d,'a.mp3');sf.write(w,a,sr)
    af=f'atempo={TEMPO[lang]}' if TEMPO[lang]!=1 else 'anull'
    subprocess.run(['ffmpeg','-loglevel','error','-y','-i',w,'-af',af,'-ar','24000','-ac','1','-b:a','48k',m],check=True)
    return base64.b64encode(open(m,'rb').read()).decode(), len(a)/sr/TEMPO[lang]
def main():
  es,en=sys.argv[1],sys.argv[2];html=sys.argv[3] if len(sys.argv)>3 else os.path.join(os.path.dirname(__file__),'..','..','index.html')
  data={};tot=0
  for lang,dirp in (('es',es),('en',en)):
    data[lang]={}
    for k in CLIPS:
      b,dur=proc(os.path.join(dirp,k+'.wav'),lang);data[lang][k]=b;tot+=len(b)
  js='const VO_DATA='+json.dumps(data,separators=(',',':'))+';'
  block='<script id="vo-data">/* voz del copiloto: generado por tools/voces/pack.py, no editar a mano */'+js+'</script>\n'
  s=open(html,encoding='utf-8').read();a=s.find('<script id="vo-data">')
  if a>=0:b=s.index('</script>\n',a)+len('</script>\n');s=s[:a]+block+s[b:]
  else:
    i=s.rfind('<script>');s=s[:i]+block+s[i:] # justo antes del script principal
  open(html,'w',encoding='utf-8').write(s);print('clips:',sum(len(v) for v in data.values()),'· base64:',round(tot/1024),'KB')
main()
