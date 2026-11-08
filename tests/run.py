"""在 headless Chrome 里跑 tests/flows.js。用法：python tests/run.py
全部 PASS 才 push。"""
import pathlib, subprocess, sys, tempfile, re, html

root = pathlib.Path(__file__).resolve().parent.parent
page = (root / 'index.html').read_text(encoding='utf-8')
flows = (root / 'tests' / 'flows.js').read_text(encoding='utf-8')
page = page.replace('</body>', '<script>setTimeout(()=>{' + flows + '},300)</script></body>', 1)
tmp = pathlib.Path(tempfile.mkdtemp()) / 'test.html'
tmp.write_text(page, encoding='utf-8')
chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
dom = subprocess.run([chrome, '--headless=new', '--disable-gpu', '--virtual-time-budget=5000', '--dump-dom', tmp.as_uri()],
                     capture_output=True, text=True, encoding='utf-8').stdout
m = re.search(r'<pre id="test-result">(.*?)</pre>', dom, re.S)
res = html.unescape(m.group(1)) if m else 'FAIL 没跑出结果'
print(res)
sys.exit(1 if 'FAIL' in res else 0)
