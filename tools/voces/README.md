# Voz del copiloto (Born to Rally)

Clips grabados que el juego encadena con Web Audio en lugar de la voz del sistema.
Están metidos en `index.html` (bloque `<script id="vo-data">`). Si falta algún clip o el
jugador elige una voz del sistema en Opciones, el juego vuelve a `speechSynthesis`.

| Idioma | Voz | Motor | Licencia del modelo |
|---|---|---|---|
| Inglés | George (acento británico) | Kokoro‑82M, voz `bm_george` | Apache‑2.0 |
| Español | Copiloto "sereno" de España, diseñado con texto | Qwen3‑TTS‑12Hz‑1.7B‑VoiceDesign (diseño) + 1.7B‑Base (clonado de esa voz) | Apache‑2.0 |

La voz española es una voz **inventada** a partir de una descripción («madrileño de unos 40 años,
barítono algo ronco, sereno y seco, como por el intercom del casco»). No es una copia de ningún
actor ni de ningún juego. `referencia_es.wav` es la muestra diseñada; todos los clips en español
se generan clonando esa misma muestra, para que el copiloto suene igual en todo el juego.

Ambos motores vienen en el catálogo de VoiceStudio (debpalash/VoiceStudio), marcados ahí como
de uso comercial. **No** se usó OmniVoice, el motor por defecto de VoiceStudio, porque sus pesos son no comerciales.

## Archivos
- `spec.py`: lista de clips (clave → texto en español e inglés) y uniones en español ("y derecha 3").
- `gen_en.py`, `gen_es.py`, `gen_es_chain.py`: generan los WAV (inglés con Kokoro, español con Qwen3).
- `verify.py`: transcribe cada clip con Whisper para comprobar que se entiende.
- `pack.py`: recorta silencios, iguala volumen, comprime a mp3 mono de 48 kbps y lo mete en `index.html`.

## Notas de la generación
- La «y» suelta no se puede generar limpia, así que en español las uniones son clips completos
  (`yL1`…`yR6`, `yHL`, `yHR`, `yjump`, `ybigJump`, `ycrest`). La «y» suelta (`chain`) está
  recortada de la referencia y solo se usa como respaldo.
- Inglés: «Ice, ice!» y «Go, go!» en lugar de «Ice!» y «Go!», que salían poco claros.
- Se rehicieron «Noventa» (salió vacío) y «Con hielo» (se oía mal).

## Regenerar
Necesita Python 3.12, `kokoro>=0.9.4`, `qwen-tts`, `torch` 2.11 (CPU vale) y `ffmpeg`.
```
python gen_en.py && python gen_es.py && python gen_es_chain.py   # escriben clips/en_raw y clips/es_raw
python pack.py clips/es_raw clips/en_raw ../../index.html
```
