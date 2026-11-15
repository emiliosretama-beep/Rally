import soundfile as sf, numpy as np, warnings; warnings.filterwarnings('ignore')
from kokoro import KPipeline
from spec import CLIPS
import torch; torch.set_num_threads(1)
p=KPipeline(lang_code='b')
for k,(es,en) in CLIPS.items():
  a=np.concatenate([x for _,_,x in p(en,voice='bm_george',speed=1.12)]); sf.write(f'clips/en_raw/{k}.wav',a,24000)
print('ok')
