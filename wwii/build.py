#!/usr/bin/env python3
"""FRENTE 44: une src/*.js (por orden de nombre) dentro de src/shell.html -> index.html.

  python3 wwii/build.py                     escribe wwii/index.html
  python3 wwii/build.py --out RUTA          escribe en RUTA
  python3 wwii/build.py --zip RUTA.zip      además, un zip con index.html en la raíz (para itch.io)
  python3 wwii/build.py --only 00,01,02     sólo los archivos cuyo nombre empieza así (pruebas)
  python3 wwii/build.py --append demo.js    añade un script al final (pruebas)
"""
import argparse, os, shutil, subprocess, sys, tempfile, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
MARK = '/*__JS__*/'


def die(msg):
    sys.stderr.write('build.py: ERROR: ' + msg + '\n')
    sys.exit(1)


def read(path):
    try:
        with open(path, encoding='utf-8') as f:
            return f.read()
    except OSError as e:
        die('no se puede leer %s (%s)' % (path, e.strerror))


def main():
    ap = argparse.ArgumentParser(description='Construye FRENTE 44 en un solo HTML.')
    ap.add_argument('--out', default=os.path.join(HERE, 'index.html'), help='archivo de salida')
    ap.add_argument('--zip', help='escribe también un zip con index.html en la raíz')
    ap.add_argument('--only', help='prefijos separados por comas (p. ej. 00,01,02)')
    ap.add_argument('--append', action='append', default=[], help='script extra al final (pruebas)')
    ap.add_argument('--no-check', action='store_true', help='no comprobar la sintaxis con node')
    a = ap.parse_args()

    shell_path = os.path.join(SRC, 'shell.html')
    if not os.path.isfile(shell_path):
        die('falta %s' % shell_path)
    shell = read(shell_path)
    n = shell.count(MARK)
    if n != 1:
        die('shell.html debe contener la marca %s exactamente una vez (hay %d)' % (MARK, n))

    names = sorted(f for f in os.listdir(SRC) if f.endswith('.js'))
    if a.only:
        pre = [p.strip() for p in a.only.split(',') if p.strip()]
        names = [f for f in names if any(f.startswith(p) for p in pre)]
        missing = [p for p in pre if not any(f.startswith(p) for f in names)]
        if missing:
            die('no hay archivos en src/ que empiecen por: ' + ', '.join(missing))
    if not names:
        die('no hay archivos .js en %s' % SRC)

    parts = []
    for f in names:
        parts.append('// ===== %s =====\n%s' % (f, read(os.path.join(SRC, f)).rstrip() + '\n'))
    for p in a.append:
        if not os.path.isfile(p):
            die('falta el script extra %s' % p)
        parts.append('// ===== %s =====\n%s' % (os.path.basename(p), read(p).rstrip() + '\n'))
    js = '\n'.join(parts)

    low = js.lower()
    if '</script' in low or '<!--' in low:
        die('el JS contiene "</script" o "<!--": rompería el HTML (escríbelo como "<\\/script")')

    if not a.no_check:
        node = shutil.which('node')
        if node:
            fd, tmp = tempfile.mkstemp(suffix='.js', prefix='frente44_')
            try:
                with os.fdopen(fd, 'w', encoding='utf-8') as f:
                    f.write(js)
                r = subprocess.run([node, '--check', tmp], capture_output=True, text=True)
                if r.returncode != 0:
                    sys.stderr.write(r.stderr or r.stdout)
                    die('error de sintaxis en el JS unido (las líneas son del archivo temporal; busca la cabecera "// ===== archivo =====" anterior)')
            finally:
                os.unlink(tmp)
        else:
            sys.stderr.write('build.py: aviso: no hay node, no se comprueba la sintaxis\n')

    i = shell.index(MARK)
    html = shell[:i] + js + shell[i + len(MARK):]
    out = os.path.abspath(a.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)
    print('build.py: %s (%d archivos, %.1f KB)' % (out, len(names) + len(a.append), len(html.encode('utf-8')) / 1024))

    if a.zip:
        zp = os.path.abspath(a.zip)
        os.makedirs(os.path.dirname(zp), exist_ok=True)
        with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr('index.html', html)
        print('build.py: %s' % zp)


if __name__ == '__main__':
    main()
