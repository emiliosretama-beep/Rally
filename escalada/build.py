#!/usr/bin/env python3
"""Junta index.src.html y los módulos de src/ en un solo index.html (para itch.io).

Se edita en src/ y se vuelve a correr: python3 build.py
Nunca se edita index.html a mano.
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    with open(os.path.join(HERE, 'index.src.html'), encoding='utf-8') as f:
        html = f.read()

    def inline(m):
        path = os.path.join(HERE, m.group(1))
        with open(path, encoding='utf-8') as f:
            code = f.read()
        # evita cerrar la etiqueta script por accidente
        code = code.replace('</script', '<\\/script')
        return '<script>/* ' + m.group(1) + ' */\n' + code + '\n</script>'

    out, n = re.subn(r'<script src="([^"]+)"></script>', inline, html)
    dst = os.path.join(HERE, 'index.html')
    with open(dst, 'w', encoding='utf-8') as f:
        f.write(out)
    print('index.html listo: %d scripts, %.0f KB' % (n, os.path.getsize(dst) / 1024))


if __name__ == '__main__':
    main()
