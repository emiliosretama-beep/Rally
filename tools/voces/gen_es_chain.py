import torch, soundfile as sf, warnings, numpy as np; warnings.filterwarnings('ignore')
from qwen_tts import Qwen3TTSModel
from faster_whisper import WhisperModel
from spec import CHAIN_ES
torch.set_num_threads(3)
m=Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-Base",dtype=torch.float32,device_map="cpu")
REF="Tres, dos, uno, vamos. Derecha cuatro larga, cincuenta. Izquierda dos y horquilla derecha. Ojo, rasante, salto. Izquierda cinco con hielo. Meta. Buen tramo, muy bien."
pr=m.create_voice_clone_prompt(ref_audio="referencia_es.wav",ref_text=REF)
W=WhisperModel("small",device="cpu",compute_type="int8")
def hear(a,sr):
  t=np.arange(0,len(a),sr/16000);b=np.interp(t,np.arange(len(a)),a).astype(np.float32);b=np.concatenate([np.zeros(4000,np.float32),b,np.zeros(4000,np.float32)])
  return ' '.join(s.text.strip() for s in W.transcribe(b,language='es',beam_size=5)[0])
import sys
ONLY=sys.argv[1:]
for k,txt in CHAIN_ES.items():
  if ONLY and k not in ONLY: continue
  txt=txt.replace('Y izquierda','Y, izquierda')
  for seed in (1,2,3,4,5):
    torch.manual_seed(seed);w,sr=m.generate_voice_clone(text=txt,language="Spanish",voice_clone_prompt=pr)
    got=hear(w[0],sr);print(k,seed,round(len(w[0])/sr,2),'s →',got,flush=True)
    if got.lower().lstrip('¡').startswith('y') and len(w[0])/sr>0.5: sf.write(f'clips/es_raw/{k}.wav',w[0],sr);break
  else: sf.write(f'clips/es_raw/{k}.wav',w[0],sr);print('  ⚠ revisar',k)
print('DONE')
