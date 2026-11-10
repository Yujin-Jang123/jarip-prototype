"""src/app.tpl.html(화면 원본)에 index.html 안의 이미지 묶음(const A = {...})을 넣어 index.html을 다시 만듭니다.
이미지를 바꾸려면 index.html의 const A 값을 고치거나, 원하는 JSON 파일 경로를 인자로 넘기세요.
    python3 src/build.py              # 기존 index.html의 이미지 그대로 사용
    python3 src/build.py assets.json  # 다른 이미지 묶음 사용
"""
import sys
from pathlib import Path
root = Path(__file__).resolve().parent.parent
tpl = (root / 'src' / 'app.tpl.html').read_text(encoding='utf-8')
if len(sys.argv) > 1:
    assets = Path(sys.argv[1]).read_text(encoding='utf-8')
else:
    html = (root / 'index.html').read_text(encoding='utf-8')
    start = html.index('const A = ') + len('const A = ')
    end = html.index(';\nconst $ = ', start)
    assets = html[start:end]
HEAD = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#3766FA">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="이은">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="icon" type="image/svg+xml" href="icons/app-logo.svg">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="manifest" href="manifest.webmanifest">
</head>
<body>
"""
body = tpl.replace('%ASSETS%', assets, 1)
t0, t1 = body.find('<title>'), body.find('</title>') + len('</title>')
title, body = (body[t0:t1], body[:t0] + body[t1:]) if t0 >= 0 else ('<title>이은</title>', body)
(root / 'index.html').write_text(HEAD.replace('</head>', title + '\n</head>') + body + '\n</body>\n</html>\n', encoding='utf-8')
print('index.html 생성 완료')
