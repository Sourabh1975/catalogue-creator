import re

with open('saba.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. uploadShapeImg (around 1050)
content = re.sub(
    r'const img = document\.getElementById\(imgId\);\s+const ph = container\.querySelector\(\'span\'\);\s+const reader = new FileReader\(\);\s+reader\.onload = ev => \{\s+img\.src = ev\.target\.result;\s+img\.style\.display = \'block\';\s+if \(ph\) ph\.style\.display = \'none\';\s+\};\s+reader\.readAsDataURL\(f\);',
    '''const img = document.getElementById(imgId);
    const ph = container.querySelector('span');
    const blobUrl = URL.createObjectURL(f);
    imgToB64(blobUrl, 600, 0.75).then(b64 => {
      img.src = b64;
      img.style.display = 'block';
      if (ph) ph.style.display = 'none';
      URL.revokeObjectURL(blobUrl);
    });''',
    content
)

# 2. pickHeroImg (around 1130)
content = re.sub(
    r'const wrap = document\.getElementById\(\'heroBgWrap\'\);\s+const reader = new FileReader\(\);\s+reader\.onload = ev => \{\s+wrap\.style\.backgroundImage = `url\(\'\$\{ev\.target\.result\}\'\)`;\s+\};\s+reader\.readAsDataURL\(f\);',
    '''const wrap = document.getElementById('heroBgWrap');
    const blobUrl = URL.createObjectURL(f);
    imgToB64(blobUrl, 1200, 0.75).then(b64 => {
      wrap.style.backgroundImage = `url('${b64}')`;
      URL.revokeObjectURL(blobUrl);
    });''',
    content
)

# 3. productImage upload (around 1172)
content = re.sub(
    r'const img = document\.getElementById\(`pimg\$\{i\}`\);\s+const ph = document\.getElementById\(`pph\$\{i\}`\);\s+const reader = new FileReader\(\);\s+reader\.onload = ev => \{\s+img\.src = ev\.target\.result;\s+img\.style\.display = \'block\';\s+if \(ph\) ph\.style\.display = \'none\';\s+\};\s+reader\.readAsDataURL\(f\);',
    '''const img = document.getElementById(`pimg${i}`);
    const ph = document.getElementById(`pph${i}`);
    const blobUrl = URL.createObjectURL(f);
    imgToB64(blobUrl, 400, 0.75).then(b64 => {
      img.src = b64;
      img.style.display = 'block';
      if (ph) ph.style.display = 'none';
      URL.revokeObjectURL(blobUrl);
    });''',
    content
)

# 4. brandLogo upload (around 2522)
content = re.sub(
    r'const preview = document\.getElementById\(\'brand-logo-preview\'\);\s+const reader = new FileReader\(\);\s+reader\.onload = ev => \{\s+const url = ev\.target\.result;\s+if \(preview\) preview\.innerHTML = `<img src="\$\{url\}" style="max-width:100%;max-height:70px;border-radius:6px;border:1px solid rgba\(255,255,255,\.1\);">`;\s+brandKit\.logoUrl = url;\s+\};\s+reader\.readAsDataURL\(f\);',
    '''const preview = document.getElementById('brand-logo-preview');
    const blobUrl = URL.createObjectURL(f);
    imgToB64(blobUrl, 300, 0.8).then(b64 => {
      if (preview) preview.innerHTML = `<img src="${b64}" style="max-width:100%;max-height:70px;border-radius:6px;border:1px solid rgba(255,255,255,.1);">`;
      brandKit.logoUrl = b64;
      URL.revokeObjectURL(blobUrl);
    });''',
    content
)

with open('saba.js', 'w', encoding='utf-8') as f:
    f.write(content)
