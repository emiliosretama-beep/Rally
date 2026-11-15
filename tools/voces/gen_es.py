import torch, soundfile as sf, time, warnings, sys; warnings.filterwarnings('ignore')
from qwen_tts import Qwen3TTSModel
from spec import CLIPS
torch.set_num_threads(3)
m=Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-Base",dtype=torch.float32,device_map="cpu")
REF="Tres, dos, uno, vamos. Derecha cuatro larga, cincuenta. Izquierda dos y horquilla derecha. Ojo, rasante, salto. Izquierda cinco con hielo. Meta. Buen tramo, muy bien."
prompt=m.create_voice_clone_prompt(ref_audio="referencia_es.wav",ref_text=REF)
torch.manual_seed(7)
only=sys.argv[1:] 
for k,(es,en) in CLIPS.items():
  if only and k not in only: continue
  t=time.time(); w,sr=m.generate_voice_clone(text=es,language="Spanish",voice_clone_prompt=prompt)
  sf.write(f"clips/es_raw/{k}.wav",w[0],sr); print(k,round(len(w[0])/sr,2),'s',round(time.time()-t),'s',flush=True)
print("DONE",flush=True)
