# Servidor del chat de Business AI

Este servidor deja que la app de Emilio (https://emiliosretama-beep.github.io/Rally/) hable con Claude
sin que la clave secreta quede expuesta en la página. Corre gratis en Cloudflare Workers.

**Lo tiene que configurar un adulto**: la cuenta de Claude (Anthropic) pide ser mayor de 18 y lleva tarjeta.

## 1. Cuenta de Claude y clave (10 min)
1. Entra a https://platform.claude.com y crea una cuenta.
2. En **Billing** compra crédito prepagado (por ejemplo 5 USD). Al ser prepago, nunca se gasta más de lo que cargues.
3. En **Limits**, pon un límite de gasto mensual (por ejemplo 5 USD) como segunda protección.
4. En **API Keys** crea una clave nueva y cópiala. Empieza con `sk-ant-`. No la compartas ni la pegues en ningún chat.

## 2. Servidor en Cloudflare (10 min)
1. Crea una cuenta gratis en https://dash.cloudflare.com
2. Ve a **Workers & Pages → Create → Create Worker**. Ponle de nombre `business-ai` y toca **Deploy**.
3. Toca **Edit code**. Borra todo lo que hay y pega el contenido completo de `worker/dist/worker.js`
   (https://raw.githubusercontent.com/emiliosretama-beep/Rally/main/worker/worker.js). Toca **Deploy**.
4. Ve a **Settings → Variables and Secrets** y agrega dos, ambas de tipo **Secret**:
   - `ANTHROPIC_API_KEY` = la clave del paso 1
   - `ACCESS_CODE` = un código que inventes (por ejemplo una frase de 4 palabras). Este se lo das a Emilio.
5. Copia la dirección del Worker (algo como `https://business-ai.TU-CUENTA.workers.dev`).

## 3. En el celular de Emilio
Abre la app → pestaña **Hablar** → pega la dirección y el código → **Conectar**.

## Seguridad
- La clave de Claude solo vive en Cloudflare. La página nunca la ve.
- El servidor solo acepta peticiones que vengan de la página de Emilio y que traigan el código correcto.
- Si el código se filtra, cámbialo en Cloudflare (paso 2.4) y escribe el nuevo en la app.

## Costo estimado
Modelo: Claude Opus 5.5 ($4 por millón de tokens de entrada, $20 por millón de salida).
Estimación (no medida): unos 2–3 centavos de dólar por mensaje, así que 5 USD alcanzan para unos 150–250 mensajes.
Para que dure mucho más, se puede cambiar `MODEL` en `worker/src/index.js` a `claude-haiku-5-5` (unas 40 veces más barato, menos listo).

## Para desarrolladores
`worker/src/index.js` es el código fuente. `worker/dist/worker.js` es el mismo código empaquetado con el SDK de Anthropic:

    npm i @anthropic-ai/sdk esbuild
    npx esbuild worker/src/index.js --bundle --format=esm --platform=browser --conditions=worker,browser --minify --outfile=worker/dist/worker.js
