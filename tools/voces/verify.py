import sys, re, numpy as np, soundfile as sf, warnings; warnings.filterwarnings('ignore')
from faster_whisper import WhisperModel
from spec import CLIPS
lang,d=sys.argv[1],sys.argv[2]
m=WhisperModel("small",device="cpu",compute_type="int8",cpu_threads=1)
norm=lambda s:re.sub(r'[^a-záéíóúñü0-9 ]','',s.lower().replace('-',' ')).split()
W2N={'one':'1','two':'2','three':'3','four':'4','five':'5','six':'6','uno':'1','dos':'2','tres':'3','cuatro':'4','cinco':'5','seis':'6','forty':'40','fifty':'50','sixty':'60','seventy':'70','eighty':'80','ninety':'90','cien':'100','cuarenta':'40','cincuenta':'50','sesenta':'60','setenta':'70','ochenta':'80','noventa':'90','hairpin':'hair pin','for':'4','hundred':'100'}
bad=[]
for k,(es,en) in CLIPS.items():
  a,sr=sf.read(f'{d}/{k}.wav',dtype='float32')
  if a.ndim>1:a=a.mean(1)
  t=np.arange(0,len(a),sr/16000);a=np.interp(t,np.arange(len(a)),a).astype(np.float32)
  a=np.concatenate([np.zeros(4000,np.float32),a,np.zeros(4000,np.float32)])
  got=' '.join(s.text.strip() for s in m.transcribe(a,language=lang,beam_size=5,initial_prompt='Rally pace notes.')[0])
  print(f'{k:9s} {len(a)/16000-0.5:4.2f}s  "{es if lang=="es" else en}" → "{got}"',flush=True)
