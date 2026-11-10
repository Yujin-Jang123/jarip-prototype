"""src/app.tpl.html 의 %ASSETS% 자리에 src/assets.json 을 넣어 index.html 을 만듭니다."""
from pathlib import Path
root = Path(__file__).resolve().parent.parent
tpl = (root / 'src' / 'app.tpl.html').read_text(encoding='utf-8')
assets = (root / 'src' / 'assets.json').read_text(encoding='utf-8')
(root / 'index.html').write_text(tpl.replace('%ASSETS%', assets, 1), encoding='utf-8')
print('index.html 생성 완료')
