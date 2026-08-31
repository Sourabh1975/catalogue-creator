import re

with open('saba.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. uploadShapeImg (around 1050)
content = re.sub(
    r'const img = document\.getElementById\(imgId\);\s+const ph\s*=\s*container\.querySelector\(\'span\'\);\s+img\.src = URL\.createObjectURL\(f\);\s+img\.style\.display = \'block\';\s+if \(ph\) ph\.style\.display = \'none\';',
    '''const img = document.getElementById(imgId);
    const ph = container.querySelector('span');
    const reader = new FileReader();
    reader.onload = ev => {
      img.src = ev.target.result;
      img.style.display = 'block';
      if (ph) ph.style.display = 'none';
    };
    reader.readAsDataURL(f);''',
    content
)

# 2. pickHeroImg (around 1130)
content = re.sub(
    r'const wrap = document\.getElementById\(\'heroBgWrap\'\);\s+wrap\.style\.backgroundImage = `url\(\'\$\{URL\.createObjectURL\(f\)\}\'\)`;',
    '''const wrap = document.getElementById('heroBgWrap');
    const reader = new FileReader();
    reader.onload = ev => {
      wrap.style.backgroundImage = `url('${ev.target.result}')`;
    };
    reader.readAsDataURL(f);''',
    content
)

# 3. productImage upload (around 1172)
content = re.sub(
    r'const img = document\.getElementById\(`pimg\$\{i\}`\);\s+const ph\s*=\s*document\.getElementById\(`pph\$\{i\}`\);\s+img\.src = URL\.createObjectURL\(f\);\s+img\.style\.display = \'block\';\s+if \(ph\) ph\.style\.display = \'none\';',
    '''const img = document.getElementById(`pimg${i}`);
    const ph = document.getElementById(`pph${i}`);
    const reader = new FileReader();
    reader.onload = ev => {
      img.src = ev.target.result;
      img.style.display = 'block';
      if (ph) ph.style.display = 'none';
    };
    reader.readAsDataURL(f);''',
    content
)

# 4. brandLogo upload (around 2522)
content = re.sub(
    r'const url = URL\.createObjectURL\(f\);\s+const preview = document\.getElementById\(\'brand-logo-preview\'\);\s+if \(preview\) preview\.innerHTML = `<img src="\$\{url\}"\s+style="max-width:100%;max-height:70px;border-radius:6px;border:1px solid rgba\(255,255,255,\.1\);">`;\s+brandKit\.logoUrl = url;',
    '''const preview = document.getElementById('brand-logo-preview');
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target.result;
      if (preview) preview.innerHTML = `<img src="${url}" style="max-width:100%;max-height:70px;border-radius:6px;border:1px solid rgba(255,255,255,.1);">`;
      brandKit.logoUrl = url;
    };
    reader.readAsDataURL(f);''',
    content
)

with open('saba.js', 'w', encoding='utf-8') as f:
    f.write(content)
