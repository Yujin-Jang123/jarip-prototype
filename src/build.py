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
(root / 'index.html').write_text(tpl.replace('%ASSETS%', assets, 1), encoding='utf-8')
print('index.html 생성 완료')
