#!/bin/bash
# Todas las pruebas de lógica (sin navegador). Uso: bash tests/todo.sh
cd "$(dirname "$0")"
node bot.js volcano > out-bot-v.txt 2>&1 &
node bot.js k2 > out-bot-k.txt 2>&1 &
node cuerdas.js > out-cuerdas.txt 2>&1 &
node atajos.js volcano > out-atajos-v.txt 2>&1 &
node atajos.js k2 > out-atajos-k.txt 2>&1 &
node viento.js > out-viento.txt 2>&1 &
wait
echo "Volcán: $(grep -c ' OK ' out-bot-v.txt)/$(grep -cE ' (OK|FAIL) ' out-bot-v.txt) desafíos"
echo "Gigante Blanco: $(grep -c ' OK ' out-bot-k.txt)/$(grep -cE ' (OK|FAIL) ' out-bot-k.txt) desafíos"
echo "Cuerdas fijas: $(grep -c TOP out-cuerdas.txt)/15 subidas"
grep -h FAIL out-bot-v.txt out-bot-k.txt
echo "Atajos (lo que sube por fuera desde cada fogata / si llega a la siguiente):"
cat out-atajos-v.txt out-atajos-k.txt
echo "Viento (llegan sin caer de 6 arranques; con AGARRAR deben llegar todos):"
cat out-viento.txt
rm -f out-*.txt
