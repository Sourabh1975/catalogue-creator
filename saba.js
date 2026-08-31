
/* ════════════════════════════════════════════════════
   STATE
════════════════════════════════════════════════════ */
let gRows=3, gCols=4, editMode=false, shapeN=0, currentLayoutType='grid';
let dragEl=null, dragOffX=0, dragOffY=0, dragPointerId=null;
let directEditMode='', directEditStart={};
const DEFAULT_PAGE_COLORS = { page:'#ffffff', hero:'', products:'#ffffff' };
let currentPageColors = { ...DEFAULT_PAGE_COLORS };
let autosaveTimer = null;
const pages = [];
let currentPageIndex = 0;

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('light-mode', isLight);
  document.body.classList.toggle('dark-mode', !isLight);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = isLight ? '🌙 Dark' : '☀️ Light';
}

function loadTheme() {
  applyTheme(localStorage.getItem('saba_theme') || 'dark');
}

function toggleTheme() {
  const next = document.body.classList.contains('light-mode') ? 'dark' : 'light';
  localStorage.setItem('saba_theme', next);
  applyTheme(next);
}

function layoutTokens(layout=currentLayoutType) {
  return String(layout || 'grid').split(/\s+/).filter(Boolean);
}

function layoutHas(name, layout=currentLayoutType) {
  return layoutTokens(layout).includes(name);
}

function layoutClass(prefix, layout=currentLayoutType) {
  return layoutTokens(layout).map(token => `${prefix}-${token}`).join(' ');
}

function applyPageColors(colors=currentPageColors) {
  currentPageColors = {
    page: colors?.page || DEFAULT_PAGE_COLORS.page,
    hero: colors?.hero || '',
    products: colors?.products || DEFAULT_PAGE_COLORS.products
  };
  const cat = document.getElementById('catalogue');
  const hero = document.getElementById('hero');
  const products = document.querySelector('.products-section');
  if (cat) cat.style.setProperty('background-color', currentPageColors.page, 'important');
  if (hero && currentPageColors.hero) {
    hero.style.setProperty('background-image', 'none', 'important');
    hero.style.setProperty('background-color', currentPageColors.hero, 'important');
  }
  if (hero && (!products || products.style.display === 'none') && !currentPageColors.hero) {
    hero.style.setProperty('background-image', 'none', 'important');
    hero.style.setProperty('background-color', currentPageColors.page, 'important');
  }
  if (products) products.style.setProperty('background-color', currentPageColors.products, 'important');
  const pageInput = document.getElementById('page-bg-color');
  const heroInput = document.getElementById('hero-bg-color');
  const productsInput = document.getElementById('products-bg-color');
  if (pageInput) pageInput.value = currentPageColors.page;
  if (heroInput && currentPageColors.hero) heroInput.value = currentPageColors.hero;
  if (productsInput) productsInput.value = currentPageColors.products;
}

function setPageColor(target, color) {
  if (!['page','hero','products'].includes(target) || !color) return;
  currentPageColors = { ...currentPageColors, [target]: color };
  if (target === 'page') {
    const products = document.querySelector('.products-section');
    if (!products || products.style.display === 'none') currentPageColors.hero = color;
  }
  applyPageColors(currentPageColors);
  localStorage.setItem('saba_page_colors', JSON.stringify(currentPageColors));
  captureHistory();
}

function loadPageColors() {
  const raw = localStorage.getItem('saba_page_colors');
  if (!raw) {
    applyPageColors(DEFAULT_PAGE_COLORS);
    return;
  }
  try {
    applyPageColors(JSON.parse(raw));
  } catch(e) {
    applyPageColors(DEFAULT_PAGE_COLORS);
  }
}

function getCurrentDesignData() {
  if (typeof capturePageState === 'function') {
    while (pages.length <= currentPageIndex) pages.push({});
    pages[currentPageIndex] = capturePageState();
  }
  return {
    v: 4,
    isMultiPage: true,
    pages: pages,
    currentPageIndex: currentPageIndex,
    brandKit: typeof brandKit !== 'undefined' ? brandKit : {},
    productDB: typeof productDB !== 'undefined' ? productDB : []
  };
}

function saveDraftNow() {
  try {
    localStorage.setItem('cc_save_v3', JSON.stringify(getCurrentDesignData()));
  } catch(e) {}
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveDraftNow, 250);
}

function restoredElementHTML(data) {
  const html = data?.innerHTML ?? data?.html ?? '';
  return html === 'undefined' || html === undefined || html === null ? '' : html;
}

const PRODS = [
  {name:"Short Body with Flange",       mrp:"MRP Rs. 223/-", packing:"Packing – 28 pcs"},
  {name:"Long Body with Flange",        mrp:"MRP Rs. 210/-", packing:"Packing – 18 pcs"},
  {name:"Machine Cock with Flange",     mrp:"MRP Rs. 315/-", packing:"Packing – 26 pcs"},
  {name:"Angle Cock with Flange",       mrp:"MRP Rs. 223/-", packing:"Packing – 40 pcs"},
  {name:"Garden Cock with Flange",      mrp:"MRP Rs. 291/-", packing:"Packing – 26 pcs"},
  {name:"Pillar Cock with Flange",      mrp:"MRP Rs. 451/-", packing:"Packing – 16 pcs"},
  {name:"2 Way Bib Cock With Flange",   mrp:"MRP Rs. 432/-", packing:"Packing – 36 pcs"},
  {name:"2 Way Angle Cock with Flange", mrp:"MRP Rs. 425/-", packing:"Packing – 17 pcs"},
  {name:"Pillar Sink Cock (Short)",     mrp:"MRP Rs. 590/-", packing:"Packing – 12 pcs"},
  {name:"Pillar Sink Cock (Long)",      mrp:"MRP Rs. 704/-", packing:"Packing –  9 pcs"},
  {name:"Wall Sink Cock (Short) Flange",mrp:"MRP Rs. 506/-", packing:"Packing – 12 pcs"},
  {name:"Wall Sink Cock (Long) Flange", mrp:"MRP Rs. 415/-", packing:"Packing –  9 pcs"},
];

/* ════════════════════════════════════════════════════
   BUILD GRID
════════════════════════════════════════════════════ */
function buildGrid(productsOverride) {
  const grid = document.getElementById('productsGrid');
  const cat = document.getElementById('catalogue');
  grid.className = `products-grid ${layoutClass('layout')}`;
  if (cat) cat.className = layoutClass('cat-layout');
  applyPageColors(currentPageColors);
  if (gRows <= 0 || gCols <= 0) {
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = '';
    grid.style.gridTemplateRows = '';
    const rVal = document.getElementById('rVal');
    const cVal = document.getElementById('cVal');
    if (rVal) rVal.textContent = gRows;
    if (cVal) cVal.textContent = gCols;
    updateBuilderControls();
    return;
  }
  const hasProductOverride = Array.isArray(productsOverride);
  const sourceProducts = hasProductOverride && productsOverride.length ? productsOverride : PRODS;
  const total = (layoutHas('pricelist') || layoutHas('comparison'))
    ? Math.max(sourceProducts.length, gRows * gCols)
    : gRows * gCols;
  grid.style.gridTemplateColumns = layoutHas('pricelist') || layoutHas('comparison') || layoutHas('masonry')
    ? ''
    : `repeat(${gCols},1fr)`;

  // Preserve existing data
  const saved = [];
  if (!hasProductOverride) {
    grid.querySelectorAll('.product-card').forEach((card, i) => {
      saved[i] = {
        name:    card.querySelector('.prod-name')?.textContent    || '',
        mrp:     card.querySelector('.prod-mrp')?.textContent     || '',
        packing: card.querySelector('.prod-packing')?.textContent || '',
        img:     card.querySelector('img')?.src || '',
      };
    });
  }

  grid.innerHTML = '';

  for (let i=0; i<total; i++) {
    const d = sourceProducts[i] || {name:`Product ${i+1}`, mrp:'MRP Rs. 000/-', packing:'Packing – 0 pcs'};
    const s = saved[i] || {};
    const name    = (!hasProductOverride && s.name)    || d.name;
    const mrp     = (!hasProductOverride && s.mrp)     || d.mrp;
    const packing = (!hasProductOverride && s.packing) || d.packing;
    const img     = (!hasProductOverride && s.img)     || d.img || '';

    const card = document.createElement('div');
    card.className = `product-card ${layoutClass('product-card')}`;
    card.innerHTML = productCardHTML(i, { name, mrp, packing, img }, currentLayoutType);
    grid.appendChild(card);
  }

  document.getElementById('rVal').textContent = gRows;
  document.getElementById('cVal').textContent = gCols;
  syncProductImagePlaceholders(grid);
  updateBuilderControls();
  requestAnimationFrame(fitGrid); // recalculate row heights
}

function productImageHTML(i, img, label='Image') {
  return `
    <div class="prod-img-box" onclick="pickProdImg(${i})">
      <img class="prod-img" id="pimg${i}" src="${img || ''}" alt="" style="display:${img?'block':'none'}">
      <div class="prod-img-ph" id="pph${i}" style="display:${img?'none':'flex'}">
        <span class="ps">+</span><span>${label}</span>
      </div>
    </div>
  `;
}

function syncProductImagePlaceholders(root=document) {
  root.querySelectorAll('.prod-img-box').forEach(box => {
    const img = box.querySelector('img');
    const ph = box.querySelector('.prod-img-ph');
    const hasImg = !!(img && img.getAttribute('src') && img.getAttribute('src') !== 'none');
    if (img) img.style.display = hasImg ? 'block' : 'none';
    if (ph) ph.style.display = hasImg ? 'none' : 'flex';
  });
}

function productCardHTML(i, p, layout='grid') {
  const editable = editMode ? 'true' : 'false';
  const name = p.name || `Product ${i + 1}`;
  const mrp = p.mrp || 'MRP Rs. 000/-';
  const packing = p.packing || '';
  const has = token => layoutHas(token, layout);

  if (has('pricelist')) {
    return `
      <div class="price-row-index">${String(i + 1).padStart(2, '0')}</div>
      <div class="prod-name" contenteditable="${editable}">${name}</div>
      <div class="prod-packing" contenteditable="${editable}">${packing}</div>
      <div class="prod-mrp" contenteditable="${editable}">${mrp}</div>
    `;
  }

  if (has('dealersheet')) {
    return `
      <div class="dealer-row-top">
        <div class="price-row-index">${i + 1}</div>
        <div class="prod-name" contenteditable="${editable}">${name}</div>
      </div>
      <div class="dealer-row-meta">
        <span class="prod-packing" contenteditable="${editable}">${packing}</span>
        <span class="prod-mrp" contenteditable="${editable}">${mrp}</span>
      </div>
    `;
  }

  if (has('lookbook') || has('showcase') || has('dark')) {
    return `
      ${productImageHTML(i, p.img, 'Large Image')}
      <div class="lookbook-copy">
        <div class="prod-name" contenteditable="${editable}">${name}</div>
        <div class="prod-packing" contenteditable="${editable}">${packing}</div>
        <div class="prod-mrp" contenteditable="${editable}">${mrp}</div>
      </div>
    `;
  }

  if (has('specsheet') || has('technical')) {
    return `
      ${productImageHTML(i, p.img)}
      <div class="prod-name" contenteditable="${editable}">${name}</div>
      <div class="spec-table-mini">
        <div><span>Model</span><b contenteditable="${editable}">SKU-${1000 + i}</b></div>
        <div><span>Pack</span><b class="prod-packing" contenteditable="${editable}">${packing}</b></div>
        <div><span>Price</span><b class="prod-mrp" contenteditable="${editable}">${mrp}</b></div>
      </div>
    `;
  }

  if (has('comparison')) {
    return `
      <div class="prod-name" contenteditable="${editable}">${name}</div>
      <div class="compare-columns">
        <span contenteditable="${editable}">Standard</span>
        <span contenteditable="${editable}">Premium</span>
        <span class="prod-mrp" contenteditable="${editable}">${mrp}</span>
      </div>
      <div class="prod-packing" contenteditable="${editable}">${packing}</div>
    `;
  }

  return `
    ${productImageHTML(i, p.img)}
    <div class="prod-name" contenteditable="${editable}">${name}</div>
    <div class="prod-mrp" contenteditable="${editable}">${mrp}</div>
    <div class="prod-packing" contenteditable="${editable}">${packing}</div>
  `;
}

/* ════════════════════════════════════════════════════
   GRID CONTROL
════════════════════════════════════════════════════ */
function updateBuilderControls() {
  const hero = document.getElementById('hero');
  const sec = document.querySelector('.products-section');
  const h = hero && hero.style.display !== 'none' ? Math.round(parseFloat(hero.style.height) || hero.offsetHeight || 0) : 0;
  const range = document.getElementById('heroHeightRange');
  const label = document.getElementById('heroHeightVal');
  if (range) range.value = Math.max(0, Math.min(1123, h));
  if (label) label.textContent = h + 'px';
  document.querySelectorAll('.builder-mode-btn').forEach(btn => btn.classList.remove('active'));
  const activeId = (!sec || sec.style.display === 'none') ? 'mode-full' : (h <= 0 ? 'mode-products' : 'mode-mixed');
  document.getElementById(activeId)?.classList.add('active');
  const rVal = document.getElementById('rVal');
  const cVal = document.getElementById('cVal');
  if (rVal) rVal.textContent = gRows;
  if (cVal) cVal.textContent = gCols;
}

function setHeroHeight(value) {
  const hero = document.getElementById('hero');
  const sec = document.querySelector('.products-section');
  if (!hero || !sec) return;
  const h = Math.max(0, Math.min(1123, parseInt(value, 10) || 0));
  if (h >= 1123) {
    currentLayoutType = 'cover';
    gRows = 0; gCols = 0;
    hero.style.display = '';
    hero.style.height = '1123px';
    sec.style.display = 'none';
  } else {
    currentLayoutType = 'grid';
    if (gRows <= 0) gRows = h <= 0 ? 4 : 3;
    if (gCols <= 0) gCols = h <= 0 ? 3 : 4;
    hero.style.display = h <= 0 ? 'none' : '';
    hero.style.height = h + 'px';
    sec.style.display = '';
    sec.style.height = (1123 - h) + 'px';
    buildGrid();
  }
  applyPageColors(currentPageColors);
  updateBuilderControls();
  requestAnimationFrame(fitGrid);
  captureHistory();
}

function setCatalogueSections(mode) {
  if (mode === 'full') {
    setHeroHeight(1123);
    return;
  }
  if (mode === 'products') {
    if (gRows <= 0) gRows = 4;
    if (gCols <= 0) gCols = 3;
    setHeroHeight(0);
    return;
  }
  if (gRows <= 0) gRows = 3;
  if (gCols <= 0) gCols = 4;
  setHeroHeight(430);
}

function addProductCardSlot() {
  const sec = document.querySelector('.products-section');
  if (gRows <= 0 || gCols <= 0 || !sec || sec.style.display === 'none') {
    gRows = 1;
    gCols = 1;
    setHeroHeight(430);
    return;
  }
  if (gRows < 10) gRows += 1;
  else if (gCols < 6) gCols += 1;
  buildGrid();
  updateBuilderControls();
  captureHistory();
}

function changeGrid(axis, delta) {
  if (gRows <= 0 && axis === 'c') gRows = 3;
  if (gCols <= 0 && axis === 'r') gCols = 4;
  if (currentLayoutType === 'cover') currentLayoutType = 'grid';
  const sec = document.querySelector('.products-section');
  if (sec && sec.style.display === 'none') setCatalogueSections('mixed');
  if (axis==='r') gRows = Math.max(1, Math.min(10, gRows+delta));
  else            gCols = Math.max(1, Math.min(6,  gCols+delta));
  buildGrid();
  updateBuilderControls();
  requestAnimationFrame(fitGrid);
  setTimeout(() => document.getElementById('zoom-level')?.dispatchEvent(new Event('change')), 50);
}

/* ════════════════════════════════════════════════════
   DRAG & DROP
════════════════════════════════════════════════════ */
function initDrag() {
  document.addEventListener('pointerdown', e => {
    if (!editMode) return;
    const el = e.target.closest('.hero-el');
    if (!el) return;
    if (e.target.closest('.el-del'))                  return;
    if (e.target.closest('[contenteditable="true"]')) return;

    e.preventDefault();
    ensureElementControls(el);
    activateEl(el.id);

    const directHandle = e.target.closest('.el-resize, .el-rotate');
    if (directHandle) {
      startDirectEdit(e, el, directHandle.classList.contains('el-resize') ? 'resize' : 'rotate');
      return;
    }

    dragEl = el;
    dragPointerId = e.pointerId;
    dragEl.setPointerCapture?.(e.pointerId);
    dragEl.classList.add('dragging');

    const hero     = document.getElementById('hero');
    const heroRect = hero.getBoundingClientRect();
    const elRect   = el.getBoundingClientRect();
    const scale    = getCatalogueScale();

    // Convert right/bottom to left/top
    el.style.right     = 'auto';
    el.style.bottom    = 'auto';
    el.style.left = ((elRect.left - heroRect.left) / scale) + 'px';
    el.style.top  = ((elRect.top  - heroRect.top) / scale)  + 'px';

    dragOffX = (e.clientX - elRect.left) / scale;
    dragOffY = (e.clientY - elRect.top) / scale;
  });

  document.addEventListener('pointermove', e => {
    if (directEditMode) {
      updateDirectEdit(e);
      return;
    }
    if (!dragEl) return;
    if (dragPointerId !== null && e.pointerId !== dragPointerId) return;
    const hero     = document.getElementById('hero');
    const heroRect = hero.getBoundingClientRect();
    const scale = getCatalogueScale();
    let nl = (e.clientX - heroRect.left) / scale - dragOffX;
    let nt = (e.clientY - heroRect.top) / scale - dragOffY;
    const maxH = hero.offsetHeight || 430;
    nl = Math.max(-15, Math.min(794 - 10, nl));
    nt = Math.max(-15, Math.min(maxH - 10, nt));
    dragEl.style.left = nl + 'px';
    dragEl.style.top  = nt + 'px';
  });

  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  function endDrag(e) {
    if (directEditMode) {
      endDirectEdit(e);
      return;
    }
    if (!dragEl) return;
    if (dragPointerId !== null && e.pointerId !== dragPointerId) return;
    dragEl.releasePointerCapture?.(dragPointerId);
    dragEl.classList.remove('dragging');
    captureHistory();
    dragEl=null;
    dragPointerId=null;
  }

  document.addEventListener('touchmove', e => {
    if (dragEl) e.preventDefault();
  }, { passive:false });

  // Click outside deselects
  document.addEventListener('click', e => {
    if (!editMode) return;
    if (!e.target.closest('.hero-el') && !e.target.closest('#editor-panel')) {
      document.querySelectorAll('.hero-el.active-el').forEach(el => el.classList.remove('active-el'));
      updateLayers();
    }
  });
}

function getCatalogueScale() {
  const scale = getAutoCanvasScale() * getSelectedZoomScale();
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function ensureElementControls(el) {
  if (!el) return;
  const oldTransform = el.style.transform;
  let content = el.querySelector(':scope > .el-content');
  if (!content) {
    content = document.createElement('div');
    content.className = 'el-content';
    const controls = new Set(['el-handle', 'el-del', 'el-rotate', 'el-resize']);
    [...el.childNodes].forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE && [...node.classList].some(cls => controls.has(cls))) return;
      content.appendChild(node);
    });
    el.appendChild(content);
  }
  if (!el.querySelector(':scope > .el-handle')) {
    const move = document.createElement('div');
    move.className = 'el-handle';
    move.textContent = 'move';
    el.prepend(move);
  }
  if (!el.querySelector(':scope > .el-rotate')) {
    const rotate = document.createElement('div');
    rotate.className = 'el-rotate';
    rotate.title = 'Rotate';
    rotate.textContent = '↻';
    el.appendChild(rotate);
  }
  if (!el.querySelector(':scope > .el-resize')) {
    const resize = document.createElement('div');
    resize.className = 'el-resize';
    resize.title = 'Resize';
    resize.textContent = '↘';
    el.appendChild(resize);
  }
  if (oldTransform) {
    const tf = getElementTransform(el);
    el.style.transform = '';
    setElementTransform(el, tf);
  }
}

function getElementTransform(el) {
  const content = el?.querySelector?.(':scope > .el-content');
  const raw = content?.style.transform || el?.style.transform || '';
  const rotMatch = raw.match(/rotate\(([-\d.]+)deg\)/);
  const scaleMatch = raw.match(/scale\(([-\d.]+)\)/);
  return {
    rotate: rotMatch ? parseFloat(rotMatch[1]) : 0,
    scale: scaleMatch ? parseFloat(scaleMatch[1]) : 1
  };
}

function setElementTransform(el, next) {
  if (!el) return;
  ensureElementControls(el);
  const content = el.querySelector(':scope > .el-content');
  const cur = getElementTransform(el);
  const rotate = Number.isFinite(Number(next.rotate)) ? Number(next.rotate) : cur.rotate;
  const scale = Number.isFinite(Number(next.scale)) ? Number(next.scale) : cur.scale;
  el.style.transform = '';
  if (content) content.style.transform = `rotate(${rotate}deg) scale(${scale})`;
  el.dataset.rotate = String(rotate);
  el.dataset.scale = String(scale);
  scheduleAutosave();
}

function getElementTransformCSS(el) {
  const tf = getElementTransform(el);
  return `rotate(${tf.rotate}deg) scale(${tf.scale})`;
}

function setElementRotation(id, degrees) {
  const el = document.getElementById(id);
  setElementTransform(el, { rotate: degrees });
}

function setElementScale(id, scale) {
  const el = document.getElementById(id);
  setElementTransform(el, { scale });
}

function getEventAngle(cx, cy, e) {
  return Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
}

function startDirectEdit(e, el, mode) {
  const rect = el.getBoundingClientRect();
  const tf = getElementTransform(el);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  directEditMode = mode;
  dragEl = el;
  dragPointerId = e.pointerId;
  directEditStart = {
    centerX,
    centerY,
    scale: tf.scale,
    rotate: tf.rotate,
    distance: Math.max(12, Math.hypot(e.clientX - centerX, e.clientY - centerY)),
    angle: getEventAngle(centerX, centerY, e)
  };
  el.setPointerCapture?.(e.pointerId);
  el.classList.add(mode === 'resize' ? 'resizing' : 'rotating');
}

function updateDirectEdit(e) {
  if (!dragEl) return;
  if (dragPointerId !== null && e.pointerId !== dragPointerId) return;
  if (directEditMode === 'resize') {
    const dist = Math.max(12, Math.hypot(e.clientX - directEditStart.centerX, e.clientY - directEditStart.centerY));
    const scale = Math.max(0.18, Math.min(5, directEditStart.scale * (dist / directEditStart.distance)));
    setElementTransform(dragEl, { scale: Number(scale.toFixed(3)) });
  } else if (directEditMode === 'rotate') {
    const angle = getEventAngle(directEditStart.centerX, directEditStart.centerY, e);
    const rotate = directEditStart.rotate + angle - directEditStart.angle;
    setElementTransform(dragEl, { rotate: Math.round(rotate) });
  }
}

function endDirectEdit(e) {
  if (!dragEl) return;
  if (dragPointerId !== null && e.pointerId !== dragPointerId) return;
  dragEl.releasePointerCapture?.(dragPointerId);
  dragEl.classList.remove('resizing', 'rotating');
  showProperties(dragEl.id);
  captureHistory();
  dragEl = null;
  dragPointerId = null;
  directEditMode = '';
  directEditStart = {};
}

/* ════════════════════════════════════════════════════
   SELECTION
════════════════════════════════════════════════════ */
function activateEl(id) {
  document.querySelectorAll('.hero-el.active-el').forEach(el => el.classList.remove('active-el'));
  const el = document.getElementById(id);
  if (el) {
    ensureElementControls(el);
    el.classList.add('active-el');
  }
  updateLayers();
  showProperties(id);
}

/* ════════════════════════════════════════════════════
   PROPERTY PANEL — helpers
════════════════════════════════════════════════════ */
function cssPropName(prop) {
  return String(prop).replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}

function setStyleValue(target, prop, val) {
  if (!target) return;
  const cssProp = cssPropName(prop);
  if (prop === 'backgroundColor') {
    target.style.setProperty('background', val, 'important');
    target.style.setProperty('background-color', val, 'important');
    return;
  }
  if (prop === 'borderColor' && !target.style.borderStyle) {
    target.style.borderStyle = 'solid';
  }
  target.style.setProperty(cssProp, val, 'important');
}

function toHexColor(value, fallback='#ffffff') {
  const v = String(value || '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) return '#' + [...v.slice(1)].map(ch => ch + ch).join('');
  const named = { white:'#ffffff', black:'#000000', red:'#ef4444', blue:'#3b82f6', green:'#22c55e', yellow:'#eab308', transparent:fallback };
  if (named[v]) return named[v];
  const rgb = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) {
    return '#' + rgb.slice(1, 4).map(n => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0')).join('');
  }
  return fallback;
}

function ppSS(id, prop, val) { // set style on wrapper
  const el = document.getElementById(id); if (el) { setStyleValue(el, prop, val); scheduleAutosave(); }
}
function ppIS(id, sel, prop, val) { // set style on inner element
  const el = document.getElementById(id); if (!el) return;
  const inn = el.querySelector(sel); if (inn) { setStyleValue(inn, prop, val); scheduleAutosave(); }
}
function ppAS(id, sel, prop, val) { // set style on all matching inner
  const el = document.getElementById(id); if (!el) return;
  el.querySelectorAll(sel).forEach(e => setStyleValue(e, prop, val));
  scheduleAutosave();
}
function ppIT(id, sel, val) { // set textContent on inner
  const el = document.getElementById(id); if (!el) return;
  const inn = el.querySelector(sel); if (inn) { inn.textContent = val; scheduleAutosave(); }
}
function ppRow(label, control) {
  return `<div class="pp-row"><span class="pp-label">${label}</span>${control}</div>`;
}
function ppInput(val, onchange, type='text') {
  return `<input class="pp-input" type="${type}" value="${val}" onchange="${onchange}">`;
}
function ppColor(val, onchange) {
  return `<input class="pp-color" type="color" value="${toHexColor(val)}" oninput="${onchange}">`;
}
function ppSelect(options, selected, onchange) {
  return `<select class="pp-select" onchange="${onchange}">${options.map(o=>`<option value="${o.v}" ${o.v==selected?'selected':''}>${o.l}</option>`).join('')}</select>`;
}
function commonProps(id, el) {
  const x = Math.round(parseFloat(el.style.left)||0);
  const y = Math.round(parseFloat(el.style.top)||0);
  const op = Math.round(parseFloat(el.style.opacity||1)*100);
  const tf = getElementTransform(el);
  const rot = Math.round(tf.rotate);
  return `<div class="pp-group">
    <div class="pp-group-title">📍 Position &amp; Visibility</div>
    ${ppRow('X (px)', ppInput(x,`ppSS('${id}','left',this.value+'px')`,'number'))}
    ${ppRow('Y (px)', ppInput(y,`ppSS('${id}','top',this.value+'px')`,'number'))}
    ${ppRow('Opacity %', ppInput(op,`ppSS('${id}','opacity',this.value/100)`,'number'))}
    ${ppRow('Rotate (°)', ppInput(rot,`setElementRotation('${id}',this.value)`,'number'))}
    ${ppRow('Scale', ppInput(tf.scale,`setElementScale('${id}',this.value)`,'number'))}
  </div>`;
}

/* ════════════════════════════════════════════════════
   PROPERTY PANEL — type builders
════════════════════════════════════════════════════ */
function ppBuildSeries(id, el) {
  const name = el.querySelector('.series-name');
  const sub  = el.querySelector('.series-sub');
  const fz   = parseFloat(name?.style.fontSize) || 46;
  const sfz  = parseFloat(sub?.style.fontSize)  || 13;
  const col  = name?.style.color || 'white';
  return `<div class="pp-group">
    <div class="pp-group-title">🔤 Series Name</div>
    ${ppRow('Font Size', ppInput(fz,`ppIS('${id}','.series-name','fontSize',this.value+'px')`,'number'))}
    ${ppRow('Color', ppColor(col,`ppIS('${id}','.series-name','color',this.value)`))}
  </div>
  <div class="pp-group">
    <div class="pp-group-title">🔤 Series Subtitle</div>
    ${ppRow('Font Size', ppInput(sfz,`ppIS('${id}','.series-sub','fontSize',this.value+'px')`,'number'))}
    ${ppRow('Color', ppColor(sub?.style.color||'rgba(255,255,255,0.65)',`ppIS('${id}','.series-sub','color',this.value)`))}
    ${ppRow('Letter Spacing', ppInput(parseFloat(sub?.style.letterSpacing)||7,`ppIS('${id}','.series-sub','letterSpacing',this.value+'px')`,'number'))}
  </div>`;
}

function ppBuildBrand(id, el) {
  const box  = el.querySelector('.brand-box');
  const bg   = box?.style.backgroundColor || '#ffffff';
  const brad = parseFloat(box?.style.borderRadius) || 10;
  const nfz  = parseFloat(el.querySelector('.bname')?.style.fontSize) || 17;
  const tfz  = parseFloat(el.querySelector('.btag')?.style.fontSize)  || 8;
  return `<div class="pp-group">
    <div class="pp-group-title">📦 Box Style</div>
    ${ppRow('Background', ppColor(bg,`ppIS('${id}','.brand-box','backgroundColor',this.value)`))}
    ${ppRow('Border Radius', ppInput(brad,`ppIS('${id}','.brand-box','borderRadius',this.value+'px')`,'number'))}
  </div>
  <div class="pp-group">
    <div class="pp-group-title">🔤 Brand Name</div>
    ${ppRow('Font Size', ppInput(nfz,`ppIS('${id}','.bname','fontSize',this.value+'px')`,'number'))}
    ${ppRow('Color', ppColor(el.querySelector('.bname')?.style.color||'#0055a0',`ppIS('${id}','.bname','color',this.value)`))}
  </div>
  <div class="pp-group">
    <div class="pp-group-title">🔤 Tagline</div>
    ${ppRow('Font Size', ppInput(tfz,`ppIS('${id}','.btag','fontSize',this.value+'px')`,'number'))}
    ${ppRow('Color', ppColor(el.querySelector('.btag')?.style.color||'#666666',`ppIS('${id}','.btag','color',this.value)`))}
  </div>`;
}

function ppBuildWarranty(id, el) {
  const badge = el.querySelector('.warranty-badge');
  const w = parseFloat(badge?.style.width)  || 82;
  const h = parseFloat(badge?.style.height) || 82;
  const nfz = parseFloat(el.querySelector('.w-num')?.style.fontSize)  || 24;
  const tfz = parseFloat(el.querySelector('.w-text')?.style.fontSize) || 7.5;
  return `<div class="pp-group">
    <div class="pp-group-title">🔴 Badge Appearance</div>
    ${ppRow('Width (px)', ppInput(w,`ppIS('${id}','.warranty-badge','width',this.value+'px');ppIS('${id}','.warranty-badge','height',this.value+'px')`,'number'))}
    ${ppRow('Background', ppColor(badge?.style.backgroundColor || '#ef4444',`ppIS('${id}','.warranty-badge','backgroundColor',this.value)`))}
    ${ppRow('Border Color', ppColor(badge?.style.borderColor || '#ffffff',`ppIS('${id}','.warranty-badge','borderColor',this.value)`))}
  </div>
  <div class="pp-group">
    <div class="pp-group-title">🔢 Number</div>
    ${ppRow('Font Size', ppInput(nfz,`ppIS('${id}','.w-num','fontSize',this.value+'px')`,'number'))}
    ${ppRow('Color', ppColor(el.querySelector('.w-num')?.style.color||'#ffffff',`ppIS('${id}','.w-num','color',this.value)`))}
  </div>
  <div class="pp-group">
    <div class="pp-group-title">🔤 Label Text</div>
    ${ppRow('Font Size', ppInput(tfz,`ppIS('${id}','.w-text','fontSize',this.value+'px')`,'number'))}
    ${ppRow('Color', ppColor(el.querySelector('.w-text')?.style.color||'#ffffff',`ppIS('${id}','.w-text','color',this.value)`))}
  </div>`;
}

function ppBuildFeatures(id, el) {
  const items = el.querySelectorAll('.feat-item');
  let rows = '';
  items.forEach((item, i) => {
    const txt = item.querySelector('.feat-text')?.textContent || '';
    rows += `<div class="pp-sub-item">
      <span class="pp-sub-lbl">#${i+1}</span>
      <input value="${txt.replace(/"/g,'&quot;')}" 
        onchange="ppFeatureText('${id}',${i},this.value)">
      <button class="pp-sub-del" onclick="ppDelFeature('${id}',${i})">×</button>
    </div>`;
  });
  const dotColor = el.querySelector('.feat-dot')?.style.color || '#7fde97';
  const textColor = el.querySelector('.feat-text')?.style.color || 'rgba(255,255,255,0.88)';
  const fz = parseFloat(el.querySelector('.feat-text')?.style.fontSize) || 9.5;
  return `<div class="pp-group">
    <div class="pp-group-title">✅ Feature Items</div>
    <div id="pp-feats-${id}">${rows}</div>
    <button class="pp-btn pp-btn-add" onclick="ppAddFeature('${id}')">＋ Add Feature</button>
  </div>
  <div class="pp-group">
    <div class="pp-group-title">🎨 Style</div>
    ${ppRow('Dot Color', ppColor(dotColor,`ppAS('${id}','.feat-dot','color',this.value)`))}
    ${ppRow('Text Color', ppColor(textColor,`ppAS('${id}','.feat-text','color',this.value)`))}
    ${ppRow('Font Size', ppInput(fz,`ppAS('${id}','.feat-text','fontSize',this.value+'px')`,'number'))}
  </div>`;
}

function ppBuildSpecs(id, el) {
  const rows = el.querySelectorAll('.spec-row');
  const card = el.querySelector('.specs-card');
  let html = '';
  rows.forEach((row, i) => {
    const lbl = row.querySelector('.spec-lbl')?.textContent || '';
    const val = row.querySelectorAll('span')[1]?.textContent || '';
    html += `<div class="pp-sub-item">
      <input style="width:42px;flex:none" value="${lbl.replace(/"/g,'&quot;')}" 
        onchange="ppSpecLabel('${id}',${i},this.value)" placeholder="Label">
      <input value="${val.replace(/"/g,'&quot;')}"
        onchange="ppSpecValue('${id}',${i},this.value)" placeholder="Value">
      <button class="pp-sub-del" onclick="ppDelSpec('${id}',${i})">×</button>
    </div>`;
  });
  const lblColor = el.querySelector('.spec-lbl')?.style.color || '#7fdecc';
  return `<div class="pp-group">
    <div class="pp-group-title">📋 Spec Rows</div>
    <div id="pp-specs-${id}">${html}</div>
    <button class="pp-btn pp-btn-add" onclick="ppAddSpec('${id}')">＋ Add Spec Row</button>
  </div>
  <div class="pp-group">
    <div class="pp-group-title">🎨 Style</div>
    ${ppRow('Background', ppColor(card?.style.backgroundColor || '#111827',`ppIS('${id}','.specs-card','backgroundColor',this.value)`))}
    ${ppRow('Border Color', ppColor(card?.style.borderColor || '#ffffff',`ppIS('${id}','.specs-card','borderColor',this.value)`))}
    ${ppRow('Label Color', ppColor(lblColor,`ppAS('${id}','.spec-lbl','color',this.value)`))}
    ${ppRow('Value Color', ppColor('#cccccc',`ppAS('${id}','.spec-row span:nth-child(2)','color',this.value)`))}
  </div>`;
}

function ppBuildBadge360(id, el) {
  const badge = el.querySelector('.badge-360');
  const w = parseFloat(badge?.style.width)  || 68;
  const nfz = parseFloat(el.querySelector('.b360-num')?.style.fontSize)  || 19;
  const tfz = parseFloat(el.querySelector('.b360-text')?.style.fontSize) || 7;
  return `<div class="pp-group">
    <div class="pp-group-title">⭕ Badge Appearance</div>
    ${ppRow('Size (px)', ppInput(w,`ppIS('${id}','.badge-360','width',this.value+'px');ppIS('${id}','.badge-360','height',this.value+'px')`,'number'))}
    ${ppRow('Background', ppColor(badge?.style.backgroundColor || '#111827',`ppIS('${id}','.badge-360','backgroundColor',this.value)`))}
    ${ppRow('Border Color', ppColor('#ffffff',`ppIS('${id}','.badge-360','borderColor',this.value)`))}
  </div>
  <div class="pp-group">
    <div class="pp-group-title">🔢 Number</div>
    ${ppRow('Font Size', ppInput(nfz,`ppIS('${id}','.b360-num','fontSize',this.value+'px')`,'number'))}
    ${ppRow('Color', ppColor(el.querySelector('.b360-num')?.style.color||'#ffd54f',`ppIS('${id}','.b360-num','color',this.value)`))}
  </div>
  <div class="pp-group">
    <div class="pp-group-title">🔤 Label</div>
    ${ppRow('Font Size', ppInput(tfz,`ppIS('${id}','.b360-text','fontSize',this.value+'px')`,'number'))}
    ${ppRow('Color', ppColor(el.querySelector('.b360-text')?.style.color||'rgba(255,255,255,0.75)',`ppIS('${id}','.b360-text','color',this.value)`))}
  </div>`;
}

function ppBuildBottomLbl(id, el) {
  const lbl = el.querySelector('.hero-btm-label');
  const fz = parseFloat(lbl?.style.fontSize) || 7.5;
  const ls = parseFloat(lbl?.style.letterSpacing) || 2.5;
  return `<div class="pp-group">
    <div class="pp-group-title">🔤 Label Style</div>
    ${ppRow('Font Size', ppInput(fz,`ppIS('${id}','.hero-btm-label','fontSize',this.value+'px')`,'number'))}
    ${ppRow('Color', ppColor(lbl?.style.color||'rgba(255,255,255,0.4)',`ppIS('${id}','.hero-btm-label','color',this.value)`))}
    ${ppRow('Letter Spacing', ppInput(ls,`ppIS('${id}','.hero-btm-label','letterSpacing',this.value+'px')`,'number'))}
  </div>`;
}

function ppBuildProdInfo(id, el) {
  const nfz  = parseFloat(el.querySelector('.hero-prod-name')?.style.fontSize)   || 24;
  const dfz  = parseFloat(el.querySelector('.hero-prod-detail')?.style.fontSize) || 11;
  const mfz  = parseFloat(el.querySelector('.hero-prod-mrp')?.style.fontSize)    || 17;
  return `<div class="pp-group">
    <div class="pp-group-title">📦 Product Name</div>
    ${ppRow('Font Size', ppInput(nfz,`ppIS('${id}','.hero-prod-name','fontSize',this.value+'px')`,'number'))}
    ${ppRow('Color', ppColor(el.querySelector('.hero-prod-name')?.style.color||'#ffffff',`ppIS('${id}','.hero-prod-name','color',this.value)`))}
  </div>
  <div class="pp-group">
    <div class="pp-group-title">📝 Detail Text</div>
    ${ppRow('Font Size', ppInput(dfz,`ppIS('${id}','.hero-prod-detail','fontSize',this.value+'px')`,'number'))}
    ${ppRow('Color', ppColor(el.querySelector('.hero-prod-detail')?.style.color||'rgba(255,255,255,0.75)',`ppIS('${id}','.hero-prod-detail','color',this.value)`))}
  </div>
  <div class="pp-group">
    <div class="pp-group-title">💰 MRP Text</div>
    ${ppRow('Font Size', ppInput(mfz,`ppIS('${id}','.hero-prod-mrp','fontSize',this.value+'px')`,'number'))}
    ${ppRow('Color', ppColor(el.querySelector('.hero-prod-mrp')?.style.color||'#ffd54f',`ppIS('${id}','.hero-prod-mrp','color',this.value)`))}
  </div>`;
}

function ppBuildShape(id, el) {
  const shape = el.querySelector('.cshape, [style*="border-left"]');
  const inner = el.querySelector('.shape-inner');
  const isTri = !!el.querySelector('[style*="border-left"]');
  const w   = parseFloat(shape?.style.width)        || 110;
  const h   = parseFloat(shape?.style.height)       || 65;
  const br  = parseFloat(shape?.style.borderRadius) || 0;
  const bw  = parseFloat(shape?.style.borderWidth)  || 0;
  const ifz = parseFloat(inner?.style.fontSize)     || 10;
  if (isTri) return `<div class="pp-group">
    <div class="pp-group-title">🔺 Triangle Color</div>
    ${ppRow('Color', ppColor('#eab308',`ppIS('${id}','[style*=border-left]','borderBottomColor',this.value)`))}
  </div>`;
  return `<div class="pp-group">
    <div class="pp-group-title">📐 Size</div>
    ${ppRow('Width (px)', ppInput(w,`ppIS('${id}','.cshape','width',this.value+'px')`,'number'))}
    ${ppRow('Height (px)', ppInput(h,`ppIS('${id}','.cshape','height',this.value+'px')`,'number'))}
  </div>
  <div class="pp-group">
    <div class="pp-group-title">🎨 Appearance</div>
    ${ppRow('Background', ppColor(shape?.style.backgroundColor || '#3b82f6',`ppIS('${id}','.cshape','backgroundColor',this.value)`))}
    ${ppRow('Border Radius', ppInput(br,`ppIS('${id}','.cshape','borderRadius',this.value+'px')`,'number'))}
    ${ppRow('Border Width', ppInput(bw,`ppIS('${id}','.cshape','borderWidth',this.value+'px')`,'number'))}
    ${ppRow('Border Color', ppColor('#ffffff',`ppIS('${id}','.cshape','borderColor',this.value)`))}
  </div>
  ${inner ? `<div class="pp-group">
    <div class="pp-group-title">🔤 Inner Text</div>
    ${ppRow('Font Size', ppInput(ifz,`ppIS('${id}','.shape-inner','fontSize',this.value+'px')`,'number'))}
    ${ppRow('Color', ppColor(inner.style.color||'#ffffff',`ppIS('${id}','.shape-inner','color',this.value)`))}
  </div>` : ''}`;
}

function ppBuildText(id, el) {
  const txt = el.querySelector('[style*="font-size"], div, span');
  const box = el.querySelector('.el-content > div');
  const fz  = parseFloat(txt?.style.fontSize)  || 18;
  const fw  = txt?.style.fontWeight || '700';
  const ls  = parseFloat(txt?.style.letterSpacing) || 0;
  return `<div class="pp-group">
    <div class="pp-group-title">🔤 Text Style</div>
    ${ppRow('Font Size', ppInput(fz,`ppIS('${id}','[contenteditable]','fontSize',this.value+'px')`,'number'))}
    ${ppRow('Color', ppColor(txt?.style.color||'#ffffff',`ppAS('${id}','.el-content [contenteditable], .el-content [style*=color]','color',this.value)`))}
    ${ppRow('Font Weight', ppSelect([{v:'400',l:'Regular'},{v:'600',l:'Semi-Bold'},{v:'700',l:'Bold'},{v:'800',l:'Extra Bold'},{v:'900',l:'Black'}],fw,`ppIS('${id}','[contenteditable]','fontWeight',this.value)`))}
    ${ppRow('Letter Spacing', ppInput(ls,`ppIS('${id}','[contenteditable]','letterSpacing',this.value+'px')`,'number'))}
  </div>
  <div class="pp-group">
    <div class="pp-group-title">🎨 Box / Line</div>
    ${ppRow('Background', ppColor(box?.style.backgroundColor || '#ffffff',`ppIS('${id}','.el-content > div','backgroundColor',this.value)`))}
    ${ppRow('Border Color', ppColor(box?.style.borderColor || '#ffffff',`ppIS('${id}','.el-content > div','borderColor',this.value)`))}
  </div>`;
}

function ppBuildImgBox(id, el) {
  const box = el.querySelector('.el-content > div, [style*="border-radius"]');
  const w   = parseFloat(box?.style.width)        || 130;
  const h   = parseFloat(box?.style.height)       || 110;
  const br  = parseFloat(box?.style.borderRadius) || 10;
  return `<div class="pp-group">
    <div class="pp-group-title">📐 Size</div>
    ${ppRow('Width (px)', ppInput(w,`ppIS('${id}','.el-content > div','width',this.value+'px')`,'number'))}
    ${ppRow('Height (px)', ppInput(h,`ppIS('${id}','.el-content > div','height',this.value+'px')`,'number'))}
    ${ppRow('Background', ppColor(box?.style.backgroundColor || '#111827',`ppIS('${id}','.el-content > div','backgroundColor',this.value)`))}
    ${ppRow('Border Radius', ppInput(br,`ppIS('${id}','.el-content > div','borderRadius',this.value+'px')`,'number'))}
    ${ppRow('Border Color', ppColor(box?.style.borderColor || '#ffffff',`ppIS('${id}','.el-content > div','borderColor',this.value)`))}
  </div>`;
}

/* ════════════════════════════════════════════════════
   PROPERTY PANEL — main dispatcher
════════════════════════════════════════════════════ */
const PP_BUILDERS = {
  series:   ppBuildSeries,
  brand:    ppBuildBrand,
  warranty: ppBuildWarranty,
  features: ppBuildFeatures,
  specs:    ppBuildSpecs,
  badge360: ppBuildBadge360,
  bottomlbl:ppBuildBottomLbl,
  prodinfo: ppBuildProdInfo,
  rect:     ppBuildShape,
  circle:   ppBuildShape,
  badge:    ppBuildShape,
  triangle: ppBuildShape,
  text:     ppBuildText,
  imgbox:   ppBuildImgBox,
};

function showProperties(id) {
  const el = document.getElementById(id);
  const panel = document.getElementById('prop-panel-body');
  const card  = document.getElementById('prop-card');
  if (!el || !panel || !card) return;

  card.style.display = '';
  const type = el.dataset.type || 'text';
  const builder = PP_BUILDERS[type] || (() => '');
  panel.innerHTML = commonProps(id, el) + builder(id, el);
}

/* ════════════════════════════════════════════════════
   PROPERTY PANEL — features list mutations
════════════════════════════════════════════════════ */
function ppFeatureText(id, idx, val) {
  const el = document.getElementById(id);
  if (!el) return;
  const items = el.querySelectorAll('.feat-text');
  if (items[idx]) items[idx].textContent = val;
}
function ppDelFeature(id, idx) {
  const el = document.getElementById(id);
  if (!el) return;
  const items = el.querySelectorAll('.feat-item');
  if (items[idx]) items[idx].remove();
  showProperties(id); // refresh panel
}
function ppAddFeature(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const list = el.querySelector('.features-list');
  if (!list) return;
  const item = document.createElement('div');
  item.className = 'feat-item';
  item.innerHTML = `<div class="feat-dot">✓</div><div class="feat-text" contenteditable="${editMode?'true':'false'}">New Feature</div>`;
  list.appendChild(item);
  showProperties(id);
}

/* ════════════════════════════════════════════════════
   PROPERTY PANEL — specs card mutations
════════════════════════════════════════════════════ */
function ppSpecLabel(id, idx, val) {
  const el = document.getElementById(id);
  if (!el) return;
  const lbls = el.querySelectorAll('.spec-lbl');
  if (lbls[idx]) lbls[idx].textContent = val;
}
function ppSpecValue(id, idx, val) {
  const el = document.getElementById(id);
  if (!el) return;
  const rows = el.querySelectorAll('.spec-row');
  if (!rows[idx]) return;
  const spans = rows[idx].querySelectorAll('span');
  if (spans[1]) spans[1].textContent = val;
}
function ppDelSpec(id, idx) {
  const el = document.getElementById(id);
  if (!el) return;
  const rows = el.querySelectorAll('.spec-row');
  if (rows[idx]) rows[idx].remove();
  showProperties(id);
}
function ppAddSpec(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const card = el.querySelector('.specs-card');
  if (!card) return;
  const row = document.createElement('div');
  row.className = 'spec-row';
  row.innerHTML = `<span class="spec-lbl" contenteditable="${editMode?'true':'false'}">Label:</span><span contenteditable="${editMode?'true':'false'}">Value</span>`;
  card.appendChild(row);
  showProperties(id);
}

/* ════════════════════════════════════════════════════
   DELETE ELEMENT
════════════════════════════════════════════════════ */
function deleteEl(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
  updateLayers();
  // Clear properties panel
  const propCard = document.getElementById('prop-card');
  if (propCard) propCard.style.display = 'none';
}

/* ════════════════════════════════════════════════════
   LAYERS PANEL
════════════════════════════════════════════════════ */
function updateLayers() {
  const list = document.getElementById('layersList');
  const els  = document.querySelectorAll('#hero .hero-el');
  list.innerHTML = '';

  if (!els.length) {
    list.innerHTML = '<div style="font-size:10px;color:rgba(255,255,255,.3);text-align:center;padding:8px;">No elements</div>';
    return;
  }

  els.forEach(el => {
    const name   = el.dataset.name || el.id;
    const hidden = el.style.display === 'none';
    const active = el.classList.contains('active-el');

    const item = document.createElement('div');
    item.className = 'layer-item' + (active ? ' selected' : '');
    item.innerHTML = `
      <span class="layer-vis" onclick="toggleVis('${el.id}',this)">${hidden?'🙈':'👁️'}</span>
      <span class="layer-name">${name}</span>
      <button class="layer-del" onclick="deleteEl('${el.id}')">×</button>
    `;
    item.addEventListener('click', e => {
      if (e.target.closest('.layer-vis') || e.target.closest('.layer-del')) return;
      activateEl(el.id);
    });
    list.appendChild(item);
  });
}

function toggleVis(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  const hidden = el.style.display === 'none';
  el.style.display = hidden ? '' : 'none';
  btn.textContent  = hidden ? '👁️' : '🙈';
}

/* ════════════════════════════════════════════════════
   ADD SHAPES
════════════════════════════════════════════════════ */
function addShape(type) {
  const hero = document.getElementById('hero');
  const id   = `el-shape-${++shapeN}`;
  const wrap = document.createElement('div');
  wrap.className  = 'hero-el';
  wrap.id         = id;
  wrap.style.left = '200px';
  wrap.style.top  = '160px';

  let name='', inner='';

  if (type==='rect') {
    name='Rectangle';
    inner=`<div class="cshape is-rect" style="width:110px;height:65px;background:rgba(59,130,246,.75);border:2px solid rgba(255,255,255,.4);">
      <div class="shape-inner" contenteditable="false">Text Here</div></div>`;
  } else if (type==='circle') {
    name='Circle';
    inner=`<div class="cshape is-circle" style="width:85px;height:85px;background:rgba(239,68,68,.78);border:2px solid rgba(255,255,255,.4);">
      <div class="shape-inner" contenteditable="false">Text</div></div>`;
  } else if (type==='triangle') {
    name='Triangle';
    inner=`<div style="width:0;height:0;border-left:48px solid transparent;border-right:48px solid transparent;border-bottom:82px solid rgba(234,179,8,.85);"></div>`;
  } else if (type==='text') {
    name='Text Box';
    inner=`<div style="font-size:18px;font-weight:700;color:white;font-family:'Montserrat',sans-serif;text-shadow:0 2px 8px rgba(0,0,0,.5);white-space:nowrap;" contenteditable="false">New Text</div>`;
  } else if (type==='badge') {
    name='Badge';
    inner=`<div class="cshape is-badge" style="width:82px;height:82px;background:radial-gradient(circle at 38% 38%,#f97316,#c2410c);border:3px solid rgba(255,255,255,.35);box-shadow:0 4px 16px rgba(0,0,0,.35);">
      <div class="shape-inner" style="font-size:9px;" contenteditable="false">BADGE<br>TEXT</div></div>`;
  } else if (type==='imgbox') {
    name='Image Box';
    const iid=`simg-${shapeN}`;
    inner=`<div style="width:130px;height:110px;border:2.5px dashed rgba(255,255,255,.38);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:rgba(255,255,255,.06);" onclick="pickShapeImg('${iid}',this)">
      <img id="${iid}" src="" style="display:none;max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;">
      <span style="color:rgba(255,255,255,.45);font-size:28px;">📷</span></div>`;
  }

  wrap.dataset.name = name;
  wrap.dataset.type = type;
  wrap.innerHTML = `
    <div class="el-handle">⠿</div>
    <button class="el-del" onclick="deleteEl('${id}')">×</button>
    ${inner}
  `;

  // Apply contenteditable if edit mode
  if (editMode) wrap.querySelectorAll('[contenteditable]').forEach(e => e.contentEditable='true');

  hero.appendChild(wrap);
  updateLayers();
  setTimeout(() => activateEl(id), 30);
  return id;
}

function pickShapeImg(imgId, container) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const img = document.getElementById(imgId);
    const ph = container.querySelector('span');
    const blobUrl = URL.createObjectURL(f);
    imgToB64(blobUrl, 600, 0.75).then(b64 => {
      img.src = b64;
      img.style.display = 'block';
      if (ph) ph.style.display = 'none';
      URL.revokeObjectURL(blobUrl);
    });
  };
  inp.click();
}

/* ════════════════════════════════════════════════════
   EDIT MODE
════════════════════════════════════════════════════ */
function toggleEdit() {
  editMode = !editMode;
  document.body.classList.toggle('edit-mode', editMode);

  document.querySelectorAll('[contenteditable]').forEach(el => {
    el.contentEditable = editMode ? 'true' : 'false';
  });

  const btn  = document.getElementById('editBtn');
  const hint = document.getElementById('tb-hint');

  if (editMode) {
    btn.textContent = '✅ Edit Mode ON'; btn.classList.add('active');
    hint.textContent = '🖊 Drag elements • Click text to edit • Use sidebar for shapes & grid';
    hint.style.color = '#86efac';
    updateLayers();
  } else {
    btn.textContent='✏️ Edit Mode'; btn.classList.remove('active');
    hint.textContent='OFF'; hint.style.color='';
    document.querySelectorAll('.hero-el.active-el').forEach(el => el.classList.remove('active-el'));
  }
}

/* ════════════════════════════════════════════════════
   PRODUCT CARD STYLE
════════════════════════════════════════════════════ */
// Stores all card style overrides so save/load can persist them
const cardStyles = {};

function setProdStyle(cls, prop, val) {
  document.querySelectorAll('.' + cls).forEach(el => el.style[prop] = val);
  // Store for save
  if (!cardStyles[cls]) cardStyles[cls] = {};
  cardStyles[cls][prop] = val;
  scheduleAutosave();
}

function applyCardStyles(styles) {
  if (!styles) return;
  Object.entries(styles).forEach(([cls, props]) => {
    Object.entries(props).forEach(([prop, val]) => {
      setProdStyle(cls, prop, val);
      // Restore sidebar control values
      const map = {
        'prod-name':{'color':'pn-color','fontSize':'pn-size','fontWeight':'pn-weight'},
        'prod-mrp': {'color':'mrp-color','fontSize':'mrp-size','fontWeight':'mrp-weight'},
        'prod-packing':{'color':'pk-color','fontSize':'pk-size','fontWeight':'pk-weight'},
        'product-card':{'background':'card-bg','borderColor':'card-border','borderRadius':'card-radius'},
        'psh-title':{'color':'sec-color','fontSize':'sec-size'},
      };
      const ctrlId = map[cls]?.[prop];
      if (ctrlId) {
        const ctrl = document.getElementById(ctrlId);
        if (ctrl) {
          // fontSize comes back as "12px" — strip px for number inputs
          ctrl.value = typeof val === 'string' ? val.replace('px','') : val;
        }
      }
    });
  });
}

/* ════════════════════════════════════════════════════
   HERO IMAGE
════════════════════════════════════════════════════ */
function pickHeroImg() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const wrap = document.getElementById('heroBgWrap');
    const blobUrl = URL.createObjectURL(f);
    imgToB64(blobUrl, 1200, 0.75).then(b64 => {
      wrap.style.backgroundImage = `url('${b64}')`;
      URL.revokeObjectURL(blobUrl);
    });
    wrap.style.backgroundSize = 'cover'; wrap.style.backgroundPosition = 'center';
    document.getElementById('heroPh').style.display = 'none';
    document.getElementById('heroOverlay').style.display = 'block';
    // Reset opacity slider to 100%
    const slider = document.getElementById('heroBgOpacity');
    const val    = document.getElementById('heroBgOpacityVal');
    if (slider) slider.value = 100;
    if (val)    val.textContent = '100%';
    wrap.style.opacity = '1';
  };
  inp.click();
}

function setHeroBgOpacity(v) {
  document.getElementById('heroBgWrap').style.opacity = v / 100;
  const lbl = document.getElementById('heroBgOpacityVal');
  if (lbl) lbl.textContent = v + '%';
  // Update slider gradient fill
  const slider = document.getElementById('heroBgOpacity');
  if (slider) slider.style.background =
    `linear-gradient(to right,#3b82f6 ${v}%,rgba(255,255,255,.15) ${v}%)`;
  scheduleAutosave();
}

function toggleHeroOverlay(on) {
  document.getElementById('heroOverlay').style.display = on ? 'block' : 'none';
  document.getElementById('ovrOn').style.background  = on  ? 'rgba(59,130,246,.35)' : '';
  document.getElementById('ovrOff').style.background = !on ? 'rgba(59,130,246,.35)' : '';
  scheduleAutosave();
}

/* ════════════════════════════════════════════════════
   PRODUCT IMAGE
════════════════════════════════════════════════════ */
function pickProdImg(i) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const img = document.getElementById(`pimg${i}`);
    const ph = document.getElementById(`pph${i}`);
    const blobUrl = URL.createObjectURL(f);
    imgToB64(blobUrl, 400, 0.75).then(b64 => {
      img.src = b64;
      img.style.display = 'block';
      if (ph) ph.style.display = 'none';
      URL.revokeObjectURL(blobUrl);
      syncProductImagePlaceholders(document.getElementById('productsGrid'));
      scheduleAutosave();
    });
  };
  inp.click();
}

/* ════════════════════════════════════════════════════
   DOWNLOAD
════════════════════════════════════════════════════ */
function waitForPaint() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function buildPrintPages() {
  pages[currentPageIndex] = capturePageState();
  saveDraftNow();

  const originalIndex = currentPageIndex;
  const old = document.getElementById('print-pages');
  if (old) old.remove();

  const printRoot = document.createElement('div');
  printRoot.id = 'print-pages';
  document.body.appendChild(printRoot);

  for (let i = 0; i < pages.length; i++) {
    currentPageIndex = i;
    restorePageState(pages[i]);
    await waitForPaint();
    const cat = document.getElementById('catalogue');
    if (!cat) continue;
    const clone = cat.cloneNode(true);
    clone.classList.add('print-page');
    clone.querySelectorAll('[contenteditable]').forEach(el => el.contentEditable = 'false');
    clone.querySelectorAll('.active-el').forEach(el => el.classList.remove('active-el'));
    clone.querySelectorAll('.product-card').forEach(card => {
      const name = (card.querySelector('.prod-name')?.textContent || '').trim();
      const mrp = (card.querySelector('.prod-mrp')?.textContent || '').trim();
      const packing = (card.querySelector('.prod-packing')?.textContent || '').trim();
      const img = card.querySelector('.prod-img, img[id^="pimg"], img');
      const hasRealImg = img && img.src && img.style.display !== 'none';
      const isDefaultText = /^Product\s+\d+$/i.test(name) && /MRP\s+Rs\.\s*000\/-/i.test(mrp) && !packing;
      if (isDefaultText && !hasRealImg) card.classList.add('is-print-empty');
    });
    syncProductImagePlaceholders(clone);
    printRoot.appendChild(clone);
  }

  currentPageIndex = originalIndex;
  restorePageState(pages[originalIndex]);
  renderPageTabs();
  await waitForPaint();
  return printRoot;
}

async function downloadPDF() {
  const wasEditing = editMode;
  if (editMode) toggleEdit();
  try {
    await buildPrintPages();
    document.body.classList.add('printing-pdf');
    document.getElementById('toast-container')?.replaceChildren();
    setTimeout(() => window.print(), 120);
  } catch(e) {
    showToast('PDF prepare failed: ' + e.message, 'error');
  } finally {
    if (wasEditing && !editMode) setTimeout(() => toggleEdit(), 500);
  }
}

/* ════════════════════════════════════════════════════
   FIT GRID — calculate exact row heights to fill page
════════════════════════════════════════════════════ */
function fitGrid() {
  const grid    = document.getElementById('productsGrid');
  const section = document.querySelector('.products-section');
  const hdr     = document.querySelector('.prod-section-hdr');
  if (!grid || !section || !hdr) return;
  if (gRows <= 0 || gCols <= 0 || section.style.display === 'none') {
    grid.style.gridTemplateRows = '';
    return;
  }
  if (layoutHas('pricelist') || layoutHas('comparison') || layoutHas('masonry')) {
    grid.style.gridTemplateRows = '';
    document.documentElement.style.setProperty('--card-scale', '1');
    return;
  }

  const sectionStyle = getComputedStyle(section);
  const gridStyle = getComputedStyle(grid);
  const hdrStyle = getComputedStyle(hdr);
  const secH = section.clientHeight;
  const padV = parseFloat(sectionStyle.paddingTop) + parseFloat(sectionStyle.paddingBottom);
  const hdrH = hdr.offsetHeight + parseFloat(hdrStyle.marginTop) + parseFloat(hdrStyle.marginBottom);
  const rowGap = parseFloat(gridStyle.rowGap || gridStyle.gap) || 0;
  const gapH = rowGap * Math.max(0, gRows - 1);
  const availH = Math.max(0, secH - padV - hdrH);
  const rowH = Math.max(42, Math.floor((availH - gapH) / gRows));

  grid.style.gridTemplateRows = `repeat(${gRows}, ${rowH}px)`;

  /* — Scale card content proportionally —
     Base reference: 3 rows × 4 cols = rowH ~155px, scale = 1.0
     When rowH is bigger → scale > 1 (bigger fonts, bigger image area)
     When rowH is smaller → scale < 1 (smaller fonts) */
  const BASE_ROW_H = 155;
  const scale = Math.max(0.52, Math.min(2.0, rowH / BASE_ROW_H));
  document.documentElement.style.setProperty('--card-scale', scale.toFixed(3));
}

function updateCatalogueScale() {
  const maxWidth = 794;
  const center = document.getElementById('saba-center-canvas');
  const centerStyle = center ? getComputedStyle(center) : null;
  const padX = centerStyle
    ? parseFloat(centerStyle.paddingLeft) + parseFloat(centerStyle.paddingRight)
    : (window.innerWidth <= 830 ? 20 : 32);
  const available = Math.max(280, (center?.clientWidth || window.innerWidth) - padX);
  const scale = Math.min(1, available / maxWidth);
  document.documentElement.style.setProperty('--catalogue-scale', scale.toFixed(5));
  syncCanvasSpacer();
}

function getSelectedZoomScale() {
  const zoomSelect = document.getElementById('zoom-level');
  return (parseInt(zoomSelect?.value || '100', 10) || 100) / 100;
}

function getAutoCanvasScale() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--catalogue-scale')) || 1;
}

function syncCanvasSpacer() {
  const spacer = document.getElementById('canvas-spacer');
  const stage = document.getElementById('catalogue-stage');
  const cat = document.getElementById('catalogue');
  if (!spacer || !cat) return;
  const selectedZoom = getSelectedZoomScale();
  const autoScale = getAutoCanvasScale();
  const visibleScale = selectedZoom * autoScale;
  if (stage) {
    stage.style.width = (cat.offsetWidth * autoScale) + 'px';
    stage.style.height = (cat.offsetHeight * autoScale) + 'px';
  }
  spacer.style.width = (cat.offsetWidth * visibleScale) + 'px';
  spacer.style.height = (cat.offsetHeight * visibleScale) + 'px';
}

/* ════════════════════════════════════════════════════
   TOAST
════════════════════════════════════════════════════ */
function showToast(msg, type='success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ════════════════════════════════════════════════════
   SAVE TEMPLATE
════════════════════════════════════════════════════ */
async function imgToB64(src, maxW, quality) {
  if (!src || src === '') return null;
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ratio = Math.min(1, maxW / (img.naturalWidth || maxW));
      const w = Math.max(1, Math.round((img.naturalWidth || maxW) * ratio));
      const h = Math.max(1, Math.round((img.naturalHeight || maxW) * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function saveTemplate() {
  const btn = document.getElementById('saveBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }
  try {
    const data = getCurrentDesignData();
    const json = JSON.stringify(data);
    localStorage.setItem('cc_save_v3', json);
    const kb = (json.length / 1024).toFixed(0);
    showToast(`✅ Saved! (${kb} KB used)`);
  } catch(e) {
    if (e.name === 'QuotaExceededError') {
      showToast('⚠️ Storage full! Use fewer/smaller images.', 'error');
    } else {
      showToast('⚠️ Save failed: ' + e.message, 'error');
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save'; }
  }
}

/* ════════════════════════════════════════════════════
   LOAD TEMPLATE
════════════════════════════════════════════════════ */
function loadTemplate(silent) {
  const raw = localStorage.getItem('cc_save_v3');
  if (!raw) {
    if (!silent) showToast('No saved template found.', 'error');
    return false;
  }
  try {
    const data = JSON.parse(raw);
    
    if (data.isMultiPage && Array.isArray(data.pages)) {
      pages.length = 0;
      data.pages.forEach(page => pages.push(page));
      currentPageIndex = data.currentPageIndex || 0;
      if (typeof brandKit !== 'undefined' && data.brandKit) Object.assign(brandKit, data.brandKit);
      if (typeof productDB !== 'undefined' && data.productDB) productDB = data.productDB;
    } else {
      if (data.productImgs) {
        Object.keys(data.productImgs).forEach(i => {
          if (data.products && data.products[i]) data.products[i].img = data.productImgs[i];
        });
      }
      pages.length = 0;
      pages.push(data);
      currentPageIndex = 0;
    }
    
    if (pages.length === 0) return false;
    currentPageIndex = Math.max(0, Math.min(currentPageIndex, pages.length - 1));
    
    restorePageState(pages[currentPageIndex]);
    renderPageTabs();
    if (!silent) showToast('✅ Design loaded!');
    return true;
  } catch(e) {
    console.error('Load failed:', e);
    if (!silent) showToast('⚠️ Load failed: ' + e.message, 'error');
    return false;
  }
}

function loadTemplatePrompt() {
  if (!localStorage.getItem('cc_save_v3')) {
    showToast('No saved template found.', 'error');
    return;
  }
  if (confirm('Load saved template? Current unsaved edits will be lost.')) {
    loadTemplate(false);
  }
}

/* ════════════════════════════════════════════════════
   RESET TEMPLATE
════════════════════════════════════════════════════ */
function resetTemplate() {
  if (!confirm('Reset everything to default?\n\nThis will:\n• Clear all your edits\n• Remove saved design from browser memory\n• Reload the page fresh\n\nThis cannot be undone!')) return;
  localStorage.removeItem('cc_save_v3');
  showToast('🔄 Resetting...');
  setTimeout(() => location.reload(), 600);
}

async function hardRefreshApp() {
  if (!confirm('Hard refresh app cache?\n\nYour saved design/pages will stay. Only old cached files and temporary browser cache will be cleared.')) return;
  try {
    saveDraftNow();
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
    }
    if (navigator.serviceWorker?.getRegistrations) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    }
    sessionStorage.clear();
  } catch(e) {
    console.warn('Hard refresh cleanup failed:', e);
  } finally {
    const url = new URL(location.href);
    url.searchParams.set('fresh', Date.now().toString());
    location.replace(url.toString());
  }
}

/* ════════════════════════════════════════════════════
   EXPORT DESIGN (download as JSON file)
════════════════════════════════════════════════════ */
async function exportDesign() {
  const btn = document.querySelector('.tb-export');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Exporting...'; }
  try {
    // Reuse saveTemplate logic but return data instead of storing
    const data = { v: 3, gRows, gCols, pageColors: currentPageColors, heroEls: [], products: [], productImgs: {}, exportedAt: new Date().toISOString() };
    data.layoutType = currentLayoutType;

    // Hero BG
    const heroBgWrap = document.getElementById('heroBgWrap');
    const rawBg = heroBgWrap?.style.backgroundImage || '';
    const bgSrc = rawBg.replace(/^url\(['"](.*)['"]\)$/, '$1').replace(/^url\((.*)\)$/, '$1');
    if (bgSrc && bgSrc !== 'none' && bgSrc !== '') {
      data.heroBgB64   = await imgToB64(bgSrc, 1200, 0.78);
      data.heroBgSize  = heroBgWrap.style.backgroundSize;
      data.heroBgPos   = heroBgWrap.style.backgroundPosition;
      data.heroOverlay = document.getElementById('heroOverlay').style.display;
    }

    // Hero Elements
    for (const el of document.querySelectorAll('#hero .hero-el')) {
      let html = el.innerHTML.replace(/src="blob:[^"]*"/g, 'src=""');
      const shapeImg = el.querySelector('img[id^="simg"]');
      if (shapeImg && shapeImg.src && shapeImg.src.startsWith('blob:')) {
        const b64 = await imgToB64(shapeImg.src, 600, 0.8);
        if (b64) html = html.replace(/src=""/, `src="${b64}"`);
      }
      data.heroEls.push({
        id: el.id, name: el.dataset.name, type: el.dataset.type,
        left: el.style.left, top: el.style.top, right: el.style.right,
        tAlign: el.style.textAlign, opacity: el.style.opacity, display: el.style.display,
        transform: getElementTransformCSS(el),
        html
      });
    }

    // Products
    document.querySelectorAll('.product-card').forEach((card, i) => {
      data.products[i] = {
        name:    card.querySelector('.prod-name')?.textContent    || '',
        mrp:     card.querySelector('.prod-mrp')?.textContent     || '',
        packing: card.querySelector('.prod-packing')?.textContent || '',
        img:     card.querySelector('img')?.src || ''
      };
    });

    // Product Images
    for (let i = 0; i < gRows * gCols; i++) {
      const img = document.getElementById(`pimg${i}`);
      if (img && img.src && img.src.startsWith('blob:')) {
        const b64 = await imgToB64(img.src, 400, 0.78);
        if (b64) data.productImgs[i] = b64;
      }
    }

    // Download as file
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const date = new Date().toISOString().slice(0,10);
    a.href     = url;
    a.download = `catalogue-design-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const kb = (json.length / 1024).toFixed(0);
    showToast(`✅ Design exported! (${kb} KB)`);
  } catch(e) {
    showToast('⚠️ Export failed: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '⬇️ Export'; }
  }
}

/* ════════════════════════════════════════════════════
   IMPORT DESIGN (load from JSON file)
════════════════════════════════════════════════════ */
function importDesign() {
  const inp = document.createElement('input');
  inp.type   = 'file';
  inp.accept = '.json,application/json';
  inp.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm(`Import "${file.name}"?\n\nThis will replace your current design.`)) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.v || !data.heroEls) {
          showToast('⚠️ Invalid design file!', 'error');
          return;
        }
        // Temporarily store in localStorage and load
        localStorage.setItem('cc_save_v3', JSON.stringify(data));
        loadTemplate(true);
        showToast('📥 Design imported from file!');
      } catch(err) {
        showToast('⚠️ Import failed: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };
  inp.click();
}

/* ════════════════════════════════════════════════════
   TEMPLATE PICKER  — data + logic
════════════════════════════════════════════════════ */
const TEMPLATES = {

  blank: {
    gRows:3, gCols:4,
    heroEls:[
      { id:'el-brand', name:'Brand Box', type:'brand',
        left:'', top:'18px', right:'22px', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-brand')">×</button><div class="brand-box"><div class="bname" contenteditable="false">YOUR BRAND</div><div class="btag" contenteditable="false">Your tagline here</div></div>`
      }
    ],
    products: Array.from({length:12},(_,i)=>({name:`Product ${i+1}`,mrp:'MRP Rs. 000/-',packing:'Packing – 0 pcs'})),
    cardStyles:{}
  },

  water: {
    gRows:3, gCols:4,
    heroEls:[
      { id:'el-series', name:'Series Name', type:'series', left:'22px', top:'18px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-series')">×</button><div><div class="series-name" contenteditable="false">CRYSTA</div><div class="series-sub" contenteditable="false">SERIES</div></div>`},
      { id:'el-brand', name:'Brand Box', type:'brand', left:'', top:'18px', right:'22px', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-brand')">×</button><div class="brand-box"><div class="bname" contenteditable="false">NIRMAL DHARA</div><div class="btag" contenteditable="false">A Legacy of Trust and Quality</div></div>`},
      { id:'el-warranty', name:'Warranty Badge', type:'warranty', left:'22px', top:'88px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-warranty')">×</button><div class="warranty-badge"><span class="w-num" contenteditable="false">36</span><span class="w-text" contenteditable="false">MONTHS<br>WARRANTY</span></div>`},
      { id:'el-features', name:'Features List', type:'features', left:'22px', top:'185px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-features')">×</button><div class="features-list"><div class="feat-item"><div class="feat-dot">✓</div><div class="feat-text" contenteditable="false">ISI Marked</div></div><div class="feat-item"><div class="feat-dot">✓</div><div class="feat-text" contenteditable="false">Quality with Longevity</div></div><div class="feat-item"><div class="feat-dot">✓</div><div class="feat-text" contenteditable="false">Exceptional Quality</div></div><div class="feat-item"><div class="feat-dot">✓</div><div class="feat-text" contenteditable="false">Teflon Available</div></div><div class="feat-item"><div class="feat-dot">✓</div><div class="feat-text" contenteditable="false">Chrome &amp; White Available</div></div></div>`},
      { id:'el-specs', name:'Specs Card', type:'specs', left:'22px', top:'348px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-specs')">×</button><div class="specs-card"><div class="spec-row"><span class="spec-lbl" contenteditable="false">Tap Size:</span><span contenteditable="false">15mm</span></div><div class="spec-row"><span class="spec-lbl" contenteditable="false">Flow:</span><span contenteditable="false">Honeycomb Foam Flow</span></div><div class="spec-row"><span class="spec-lbl" contenteditable="false">Turn:</span><span contenteditable="false">360° Full Turn</span></div></div>`},
      { id:'el-360', name:'360° Badge', type:'badge360', left:'', top:'105px', right:'22px', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-360')">×</button><div class="badge-360"><div class="b360-num" contenteditable="false">360°</div><div class="b360-text" contenteditable="false">FULL TURN</div></div>`},
      { id:'el-btmlbl', name:'Bottom Label', type:'bottomlbl', left:'220px', top:'410px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-btmlbl')">×</button><div class="hero-btm-label" contenteditable="false">★ Honeycomb Foam Flow Technology ★</div>`},
      { id:'el-prodinfo', name:'Product Info', type:'prodinfo', left:'', top:'320px', right:'22px', tAlign:'right', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-prodinfo')">×</button><div class="hero-prod-name" contenteditable="false">Wall Mixer</div><div class="hero-prod-detail" contenteditable="false">M.Box – 12 pcs</div><div class="hero-prod-mrp" contenteditable="false">MRP Rs. 3270/-</div>`}
    ],
    products:[
      {name:'Short Body with Flange',mrp:'MRP Rs. 223/-',packing:'Packing – 28 pcs'},
      {name:'Long Body with Flange',mrp:'MRP Rs. 210/-',packing:'Packing – 18 pcs'},
      {name:'Machine Cock with Flange',mrp:'MRP Rs. 315/-',packing:'Packing – 26 pcs'},
      {name:'Angle Cock with Flange',mrp:'MRP Rs. 223/-',packing:'Packing – 40 pcs'},
      {name:'Garden Cock with Flange',mrp:'MRP Rs. 291/-',packing:'Packing – 26 pcs'},
      {name:'Pillar Cock with Flange',mrp:'MRP Rs. 451/-',packing:'Packing – 16 pcs'},
      {name:'2 Way Bib Cock With Flange',mrp:'MRP Rs. 432/-',packing:'Packing – 36 pcs'},
      {name:'2 Way Angle Cock with Flange',mrp:'MRP Rs. 425/-',packing:'Packing – 17 pcs'},
      {name:'Pillar Sink Cock (Short)',mrp:'MRP Rs. 590/-',packing:'Packing – 12 pcs'},
      {name:'Pillar Sink Cock (Long)',mrp:'MRP Rs. 704/-',packing:'Packing – 9 pcs'},
      {name:'Wall Sink Cock (Short) Flange',mrp:'MRP Rs. 506/-',packing:'Packing – 12 pcs'},
      {name:'Wall Sink Cock (Long) Flange',mrp:'MRP Rs. 415/-',packing:'Packing – 9 pcs'}
    ],
    cardStyles:{}
  },

  modern: {
    gRows:2, gCols:4,
    heroEls:[
      { id:'el-brand', name:'Brand Box', type:'brand', left:'22px', top:'22px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-brand')">×</button><div class="brand-box" style="background:rgba(255,255,255,.95);border-color:transparent;"><div class="bname" style="color:#0f172a;" contenteditable="false">YOUR BRAND</div><div class="btag" style="color:#64748b;" contenteditable="false">Premium Quality Products</div></div>`},
      { id:'el-prodinfo', name:'Product Info', type:'prodinfo', left:'', top:'280px', right:'22px', tAlign:'right', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-prodinfo')">×</button><div class="hero-prod-name" style="color:#fff;font-size:30px;" contenteditable="false">Premium Collection</div><div class="hero-prod-detail" style="color:rgba(255,255,255,.65);" contenteditable="false">Best quality guaranteed</div><div class="hero-prod-mrp" style="color:#fbbf24;" contenteditable="false">Starting Rs. 199/-</div>`},
      { id:'el-btmlbl', name:'Bottom Label', type:'bottomlbl', left:'22px', top:'408px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-btmlbl')">×</button><div class="hero-btm-label" style="color:rgba(255,255,255,.35);letter-spacing:4px;" contenteditable="false">★ YOUR TAGLINE HERE ★</div>`}
    ],
    products: Array.from({length:8},(_,i)=>({name:`Product Name ${i+1}`,mrp:`MRP Rs. ${(i+1)*99+399}/-`,packing:`Pack of ${(i%3+1)*4}`})),
    cardStyles:{'product-card':{'background':'#f8faff','borderColor':'#c7d7f0','borderRadius':'12px'},'prod-mrp':{'color':'#1d4ed8','fontWeight':'800'}}
  },

  business: {
    gRows:3, gCols:4,
    heroEls:[
      { id:'el-series', name:'Series Name', type:'series', left:'22px', top:'18px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-series')">×</button><div><div class="series-name" style="color:#fbbf24;" contenteditable="false">ELITE</div><div class="series-sub" style="color:rgba(251,191,36,.6);" contenteditable="false">COLLECTION</div></div>`},
      { id:'el-brand', name:'Brand Box', type:'brand', left:'', top:'18px', right:'22px', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-brand')">×</button><div class="brand-box" style="background:rgba(251,191,36,.1);border-color:rgba(251,191,36,.35);"><div class="bname" style="color:#fbbf24;" contenteditable="false">YOUR BRAND</div><div class="btag" style="color:rgba(255,255,255,.5);" contenteditable="false">Premium Quality Since 2000</div></div>`},
      { id:'el-features', name:'Features List', type:'features', left:'22px', top:'110px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-features')">×</button><div class="features-list"><div class="feat-item"><div class="feat-dot" style="color:#fbbf24;">★</div><div class="feat-text" contenteditable="false">Premium Grade Quality</div></div><div class="feat-item"><div class="feat-dot" style="color:#fbbf24;">★</div><div class="feat-text" contenteditable="false">ISI Certified Products</div></div><div class="feat-item"><div class="feat-dot" style="color:#fbbf24;">★</div><div class="feat-text" contenteditable="false">5 Year Guarantee</div></div><div class="feat-item"><div class="feat-dot" style="color:#fbbf24;">★</div><div class="feat-text" contenteditable="false">Pan India Delivery</div></div></div>`},
      { id:'el-prodinfo', name:'Product Info', type:'prodinfo', left:'', top:'300px', right:'22px', tAlign:'right', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-prodinfo')">×</button><div class="hero-prod-name" style="color:#fff;font-size:28px;" contenteditable="false">Signature Series</div><div class="hero-prod-detail" style="color:rgba(255,255,255,.5);" contenteditable="false">M.Box – 12 pcs</div><div class="hero-prod-mrp" style="color:#fbbf24;" contenteditable="false">MRP Rs. 0000/-</div>`},
      { id:'el-btmlbl', name:'Bottom Label', type:'bottomlbl', left:'22px', top:'408px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-btmlbl')">×</button><div class="hero-btm-label" style="color:rgba(251,191,36,.4);letter-spacing:3px;" contenteditable="false">★ EXCELLENCE IN EVERY PRODUCT ★</div>`}
    ],
    products: Array.from({length:12},(_,i)=>({name:`Premium Product ${i+1}`,mrp:`MRP Rs. ${(i+1)*150+500}/-`,packing:`Box of ${(i%3+1)*6} pcs`})),
    cardStyles:{'product-card':{'background':'#0f0720','borderColor':'rgba(251,191,36,.2)','borderRadius':'10px'},'prod-name':{'color':'#f1f5f9'},'prod-mrp':{'color':'#fbbf24','fontWeight':'800'},'prod-packing':{'color':'rgba(255,255,255,.35)'}}
  },

  /* LAYOUT 5: COVER PAGE – Full-bleed branding, no product grid */
  cover: {
    gRows:0, gCols:0, heroHeight:1050, layoutType:'cover',
    heroEls:[
      { id:'el-cov-brand', name:'Brand Box', type:'brand', left:'50px', top:'50px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-cov-brand')">×</button><div class="brand-box" style="background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2);"><div class="bname" style="font-size:24px;letter-spacing:3px;" contenteditable="false">YOUR BRAND</div><div class="btag" contenteditable="false">Tagline — Est. 2000</div></div>`},
      { id:'el-cov-title', name:'Cover Title', type:'text', left:'50px', top:'240px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-cov-title')">×</button><div><div style="font-size:52px;font-weight:900;color:white;font-family:'Montserrat',sans-serif;line-height:1.1;" contenteditable="false">PRODUCT<br>CATALOGUE</div><div style="font-size:14px;color:rgba(255,255,255,.4);margin-top:12px;letter-spacing:4px;" contenteditable="false">2025 — 2026 EDITION</div></div>`},
      { id:'el-cov-line', name:'Accent Line', type:'text', left:'50px', top:'440px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-cov-line')">×</button><div style="width:100px;height:4px;background:linear-gradient(90deg,#60a5fa,transparent);"></div>`},
      { id:'el-cov-desc', name:'Description', type:'text', left:'50px', top:'470px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-cov-desc')">×</button><div style="max-width:360px;font-size:13px;color:rgba(255,255,255,.5);line-height:1.8;font-family:'Inter',sans-serif;" contenteditable="false">Complete range of premium quality products.<br>Trusted by 10,000+ dealers across India.</div>`},
      { id:'el-cov-badge', name:'Year Badge', type:'badge', left:'580px', top:'780px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-cov-badge')">×</button><div style="width:130px;height:130px;border-radius:50%;background:rgba(96,165,250,.12);border:2px solid rgba(96,165,250,.3);display:flex;flex-direction:column;align-items:center;justify-content:center;"><div style="font-size:22px;font-weight:900;color:#60a5fa;font-family:'Montserrat',sans-serif;" contenteditable="false">25+</div><div style="font-size:8px;color:rgba(255,255,255,.4);letter-spacing:1px;margin-top:3px;text-align:center;" contenteditable="false">YEARS OF<br>TRUST</div></div>`},
      { id:'el-cov-contact', name:'Footer Contact', type:'text', left:'50px', top:'940px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-cov-contact')">×</button><div style="display:flex;gap:30px;font-size:10px;color:rgba(255,255,255,.35);font-family:'Inter',sans-serif;" contenteditable="false"><span>📞 +91 00000 00000</span><span>🌐 www.yoursite.com</span><span>📧 info@company.com</span></div>`}
    ],
    products:[], cardStyles:{}
  },

  /* LAYOUT 6: PRICE LIST – Thin header + 20-row text price table */
  pricelist: {
    gRows:1, gCols:1, heroHeight:90, layoutType:'pricelist',
    heroEls:[
      { id:'el-pl-brand', name:'Brand Box', type:'brand', left:'16px', top:'10px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-pl-brand')">×</button><div class="brand-box" style="background:transparent;border:none;padding:0;"><div class="bname" style="font-size:18px;" contenteditable="false">YOUR BRAND</div><div class="btag" style="font-size:9px;" contenteditable="false">Official Price List — Valid Till Dec 2025</div></div>`},
      { id:'el-pl-gst', name:'GST Note', type:'text', left:'', top:'14px', right:'16px', tAlign:'right', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-pl-gst')">×</button><div style="text-align:right;font-size:9px;color:rgba(255,255,255,.35);font-family:'Inter',sans-serif;" contenteditable="false">GST No: 22AAAAA0000A1Z5<br>All prices inclusive of GST</div>`}
    ],
    products: Array.from({length:20},(_,i)=>({name:`Product Name ${i+1}`,mrp:`Rs. ${(i+1)*120+200}/-`,packing:`${(i%4+1)*6} pcs`})),
    cardStyles:{'product-card':{'borderRadius':'4px','background':'rgba(255,255,255,.02)','borderColor':'rgba(255,255,255,.05)'},'prod-name':{'fontSize':'9px','textAlign':'left'},'prod-mrp':{'fontSize':'10px','color':'#60a5fa','fontWeight':'800','textAlign':'right'},'prod-packing':{'fontSize':'8px','color':'rgba(255,255,255,.3)','textAlign':'center'}}
  },

  /* LAYOUT 7: COMPACT GRID – 4 rows × 5 cols = 20 small cards */
  compact: {
    gRows:4, gCols:5, heroHeight:150,
    heroEls:[
      { id:'el-cm-brand', name:'Brand Box', type:'brand', left:'16px', top:'12px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-cm-brand')">×</button><div class="brand-box" style="background:transparent;border:none;padding:0;"><div class="bname" style="font-size:17px;" contenteditable="false">YOUR BRAND</div><div class="btag" style="font-size:9px;" contenteditable="false">Complete Product Range 2025</div></div>`},
      { id:'el-cm-cat', name:'Category Header', type:'text', left:'310px', top:'18px', right:'', tAlign:'center', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-cm-cat')">×</button><div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:6px;padding:5px 20px;"><div style="font-size:12px;font-weight:800;color:white;letter-spacing:3px;font-family:'Montserrat',sans-serif;" contenteditable="false">CATEGORY NAME</div></div>`},
      { id:'el-cm-lbl', name:'Bottom Label', type:'bottomlbl', left:'16px', top:'104px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-cm-lbl')">×</button><div class="hero-btm-label" style="font-size:7px;letter-spacing:3px;opacity:.4;" contenteditable="false">★ ALL PRICES INCLUSIVE OF GST — PAN INDIA DELIVERY ★</div>`}
    ],
    products: Array.from({length:20},(_,i)=>({name:`Product ${i+1}`,mrp:`Rs. ${(i+1)*80+150}/-`,packing:`${(i%3+1)*6} pcs`})),
    cardStyles:{'product-card':{'borderRadius':'7px'},'prod-name':{'fontSize':'8px'},'prod-mrp':{'fontSize':'8.5px','fontWeight':'800'},'prod-packing':{'fontSize':'7px'}}
  },

  /* LAYOUT 8: LOOKBOOK – Large hero + only 2×2 big feature cards */
  lookbook: {
    gRows:2, gCols:2, heroHeight:520,
    heroEls:[
      { id:'el-lb-brand', name:'Brand Box', type:'brand', left:'', top:'30px', right:'36px', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-lb-brand')">×</button><div class="brand-box"><div class="bname" contenteditable="false">YOUR BRAND</div><div class="btag" contenteditable="false">New Launch 2025</div></div>`},
      { id:'el-lb-title', name:'Hero Title', type:'text', left:'36px', top:'160px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-lb-title')">×</button><div><div style="font-size:46px;font-weight:900;color:white;font-family:'Montserrat',sans-serif;line-height:1.1;" contenteditable="false">SIGNATURE<br>COLLECTION</div><div style="font-size:11px;color:rgba(255,255,255,.45);margin-top:10px;letter-spacing:3px;" contenteditable="false">EXCLUSIVE · PREMIUM · LIMITED EDITION</div></div>`},
      { id:'el-lb-price', name:'Starting Price', type:'text', left:'36px', top:'360px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-lb-price')">×</button><div style="background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);border-radius:8px;padding:10px 18px;display:inline-block;"><div style="font-size:8px;color:rgba(255,255,255,.4);margin-bottom:3px;letter-spacing:2px;">STARTING FROM</div><div style="font-size:26px;font-weight:900;color:#fbbf24;font-family:'Montserrat',sans-serif;" contenteditable="false">Rs. 999/-</div></div>`},
      { id:'el-lb-warranty', name:'Warranty', type:'warranty', left:'', top:'360px', right:'36px', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-lb-warranty')">×</button><div class="warranty-badge"><span class="w-num" contenteditable="false">36</span><span class="w-text" contenteditable="false">MONTHS<br>WARRANTY</span></div>`}
    ],
    products: Array.from({length:4},(_,i)=>({name:`Feature Product ${i+1}`,mrp:`MRP Rs. ${(i+1)*500+999}/-`,packing:`Box of ${(i+1)*3} pcs`})),
    cardStyles:{'product-card':{'borderRadius':'14px','background':'rgba(255,255,255,.04)'},'prod-name':{'fontSize':'12px','fontWeight':'700'},'prod-mrp':{'fontSize':'14px','fontWeight':'900','color':'#fbbf24'},'prod-packing':{'fontSize':'9px'}}
  },

  /* LAYOUT 9: CATEGORY SPLIT – Banner with category tags + 2×4 grid */
  catsplit: {
    gRows:2, gCols:4, heroHeight:185,
    heroEls:[
      { id:'el-cs-brand', name:'Brand Box', type:'brand', left:'20px', top:'16px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-cs-brand')">×</button><div class="brand-box" style="background:transparent;border:none;padding:0;"><div class="bname" style="font-size:20px;" contenteditable="false">YOUR BRAND</div><div class="btag" contenteditable="false">Multi-Category Range</div></div>`},
      { id:'el-cs-cat1', name:'Cat Tag 1', type:'text', left:'20px', top:'86px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-cs-cat1')">×</button><div style="display:inline-block;background:rgba(96,165,250,.18);border:1px solid rgba(96,165,250,.4);border-radius:20px;padding:4px 13px;font-size:9px;font-weight:700;color:#93c5fd;letter-spacing:1px;" contenteditable="false">FAUCETS &amp; TAPS</div>`},
      { id:'el-cs-cat2', name:'Cat Tag 2', type:'text', left:'170px', top:'86px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-cs-cat2')">×</button><div style="display:inline-block;background:rgba(52,211,153,.14);border:1px solid rgba(52,211,153,.35);border-radius:20px;padding:4px 13px;font-size:9px;font-weight:700;color:#6ee7b7;letter-spacing:1px;" contenteditable="false">MIXERS</div>`},
      { id:'el-cs-cat3', name:'Cat Tag 3', type:'text', left:'280px', top:'86px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-cs-cat3')">×</button><div style="display:inline-block;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);border-radius:20px;padding:4px 13px;font-size:9px;font-weight:700;color:#fde68a;letter-spacing:1px;" contenteditable="false">SANITARYWARE</div>`},
      { id:'el-cs-lbl', name:'Label', type:'bottomlbl', left:'20px', top:'136px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-cs-lbl')">×</button><div class="hero-btm-label" style="font-size:7.5px;opacity:.35;" contenteditable="false">★ ISI CERTIFIED — PAN INDIA DELIVERY — QUALITY ASSURED ★</div>`}
    ],
    products: Array.from({length:8},(_,i)=>({name:`Product Name ${i+1}`,mrp:`MRP Rs. ${(i+1)*120+300}/-`,packing:`Packing – ${(i%3+1)*6} pcs`})),
    cardStyles:{}
  },

  /* LAYOUT 10: DEALER RATE SHEET – Minimal top bar + 5×3 dense grid */
  dealersheet: {
    gRows:5, gCols:3, heroHeight:75,
    heroEls:[
      { id:'el-ds-brand', name:'Brand Box', type:'brand', left:'14px', top:'8px', right:'', tAlign:'', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-ds-brand')">×</button><div class="brand-box" style="background:transparent;border:none;padding:0;"><div class="bname" style="font-size:16px;" contenteditable="false">YOUR BRAND</div><div class="btag" style="font-size:8px;" contenteditable="false">Dealer Rate Sheet — Confidential</div></div>`},
      { id:'el-ds-date', name:'Validity', type:'text', left:'', top:'10px', right:'14px', tAlign:'right', opacity:'', display:'',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-ds-date')">×</button><div style="text-align:right;font-size:9px;color:rgba(255,255,255,.3);font-family:'Inter',sans-serif;" contenteditable="false">Valid: Oct 2025 – Mar 2026<br>Subject to change without notice</div>`}
    ],
    products: Array.from({length:15},(_,i)=>({name:`Product Name ${i+1}`,mrp:`MRP Rs. ${(i+1)*80+150}/-`,packing:`${(i%3+1)*6} pcs`})),
    cardStyles:{'product-card':{'borderRadius':'5px','background':'rgba(255,255,255,.02)','borderColor':'rgba(255,255,255,.05)'},'prod-name':{'fontSize':'8.5px'},'prod-mrp':{'fontSize':'9.5px','color':'#60a5fa','fontWeight':'800'},'prod-packing':{'fontSize':'7.5px'}}
  }

};

const EXTRA_TEMPLATE_CATEGORIES = [
  'Tiles and flooring','Home appliances','Electrical switches and wires','Lighting','Paint and wall finish',
  'Industrial machinery','Auto parts','Bike/car accessories','Footwear','Cosmetics and beauty products',
  'Perfume','Bakery/sweets','Stationery','Toys and kids products','Packaging products',
  'Agricultural products','Solar products','Interior design portfolio','Fitness/gym equipment','Gift items',
  'Wholesale price list'
];

const EXTRA_TEMPLATE_STYLES = [
  'Premium Brochure','Wholesale Price-List','Minimal Clean','Bold Promotional',
  'Technical Specs','Dealer/Distributor','Image Showcase','Compact Grid'
];

function slugifyTemplateId(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function demoProductImage(label, accent='#2563eb') {
  const safeLabel = String(label || 'Product').replace(/[<>&"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="320" viewBox="0 0 420 320">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop stop-color="#f8fafc"/>
        <stop offset="1" stop-color="#e2e8f0"/>
      </linearGradient>
      <filter id="shadow"><feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#0f172a" flood-opacity=".16"/></filter>
    </defs>
    <rect width="420" height="320" rx="28" fill="url(#bg)"/>
    <ellipse cx="210" cy="246" rx="112" ry="18" fill="#0f172a" opacity=".12"/>
    <rect x="126" y="76" width="168" height="146" rx="24" fill="${accent}" filter="url(#shadow)"/>
    <rect x="156" y="108" width="108" height="66" rx="12" fill="#fff" opacity=".22"/>
    <circle cx="286" cy="82" r="22" fill="#fff" opacity=".34"/>
    <text x="210" y="268" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="800" fill="#1e293b">${safeLabel}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function makeStarterTemplate(category, style, index) {
  const layoutMap = {
    'Premium Brochure':'lookbook',
    'Wholesale Price-List':'pricelist',
    'Minimal Clean':'grid',
    'Bold Promotional':'catsplit',
    'Technical Specs':'specsheet',
    'Dealer/Distributor':'dealersheet',
    'Image Showcase':'showcase',
    'Compact Grid':'compact'
  };
  const layoutType = layoutMap[style] || 'grid';
  const dense = ['pricelist','dealersheet','compact'].includes(layoutType);
  const showcase = ['lookbook','showcase','catsplit'].includes(layoutType);
  const gRows = layoutType === 'pricelist' ? 1 : dense ? 4 : showcase ? 2 : 3;
  const gCols = layoutType === 'pricelist' ? 1 : dense ? 5 : showcase ? 3 : 4;
  const heroHeight = dense ? 145 : showcase ? 430 : 260;
  const productCount = layoutType === 'pricelist' ? 20 : gRows * gCols;
  const accent = ['#2563eb','#059669','#dc2626','#7c3aed','#ca8a04','#0f766e','#be185d','#475569'][index % 8];
  const id = `${slugifyTemplateId(category)}-${slugifyTemplateId(style)}`;
  return {
    id,
    name: `${category} ${style}`,
    category,
    industry: dense ? 'Wholesale' : 'Retail',
    style,
    pageSize: 'A4',
    isPremium: showcase,
    previewColor: accent,
    description: `${style} starter layout for ${category}`,
    gRows,
    gCols,
    heroHeight,
    layoutType,
    heroBg: `linear-gradient(135deg, ${accent}, #020617)`,
    heroEls: [
      {
        id:`el-${id}-brand`, name:'Brand Box', type:'brand', left:'24px', top:'22px',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-${id}-brand')">×</button><div class="brand-box"><div class="bname" contenteditable="false">YOUR BRAND</div><div class="btag" contenteditable="false">${category}</div></div>`
      },
      {
        id:`el-${id}-title`, name:'Catalogue Title', type:'text', left:'24px', top:'112px',
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-${id}-title')">×</button><div><div class="hero-prod-name" style="font-size:${showcase ? 34 : 24}px;" contenteditable="false">${style.toUpperCase()}</div><div class="hero-prod-detail" contenteditable="false">Editable ${category} catalogue template</div></div>`
      },
      {
        id:`el-${id}-label`, name:'Bottom Label', type:'bottomlbl', left:'24px', top:`${Math.max(82, heroHeight - 30)}px`,
        html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-${id}-label')">×</button><div class="hero-btm-label" contenteditable="false">★ REPLACE WITH YOUR BRAND MESSAGE ★</div>`
      }
    ],
    products: Array.from({ length:productCount }, (_, i) => ({
      name:`${category} ${['Premium','Classic','Elite','Studio','Pro','Select'][i % 6]} ${i + 1}`,
      mrp:`MRP Rs. ${(i + 1) * 75 + 199}/-`,
      packing:dense ? `Box of ${(i % 4 + 1) * 12}` : 'Ready demo details',
      img: demoProductImage(`${category.split(' ')[0]} ${i + 1}`, accent)
    })),
    cardStyles: {
      'product-card': { borderRadius: dense ? '5px' : '10px' },
      'prod-mrp': { color: accent, fontWeight:'800' }
    }
  };
}

function getTemplateLibrary() {
  const base = Array.isArray(window.SABA_TEMPLATE_LIBRARY) ? window.SABA_TEMPLATE_LIBRARY : [];
  const generated = EXTRA_TEMPLATE_CATEGORIES.map((category, i) =>
    makeStarterTemplate(category, EXTRA_TEMPLATE_STYLES[i % EXTRA_TEMPLATE_STYLES.length], i)
  );
  const seen = new Set();
  return [...base, ...generated].filter(Boolean).map(tmpl => {
    const sizes = tmpl.sizes || [tmpl.pageSize || 'A4'];
    const styleLayoutMap = {
      'Premium Brochure':'lookbook',
      'Wholesale Price-List':'pricelist',
      'Dealer/Distributor':'dealersheet',
      'Minimal Clean':'grid',
      'Image Showcase':'showcase',
      'Lookbook':'lookbook',
      'Compact Grid':'compact',
      'Cover Page':'cover',
      'Technical Specs':'specsheet',
      'Bold Promotional':'catsplit'
    };
    return {
      ...tmpl,
      layoutType: tmpl.layoutType || styleLayoutMap[tmpl.style] || 'grid',
      premium: tmpl.premium ?? tmpl.isPremium ?? false,
      sizes,
      description: tmpl.description || tmpl.previewDesc || `${tmpl.style || 'Catalogue'} template`,
      previewColor: tmpl.previewColor || '#1e293b'
    };
  }).filter(tmpl => {
    if (!tmpl.id || seen.has(tmpl.id)) return false;
    seen.add(tmpl.id);
    return true;
  });
}

function showPicker() {
  openTemplateBrowser();
}

function openTemplateBrowser() {
  document.getElementById('template-browser').style.display = 'flex';
  document.getElementById('tb-resume-bar').style.display =
    localStorage.getItem('cc_save_v3') ? 'flex' : 'none';
  renderTemplateBrowser();
}

function closeTemplateBrowser() {
  const tb = document.getElementById('template-browser');
  if (tb) tb.style.display = 'none';
}

function resumeSaved() {
  closeTemplateBrowser();
  loadTemplate(true);
  showToast('📥 Previous design restored!');
}

let activeTbSize = 'All';
function setTbSize(size, el) {
  activeTbSize = size;
  document.querySelectorAll('#tb-size-filters .tb-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  filterTemplates();
}

function showTemplateBrowser() {
  const tb = document.getElementById('template-browser');
  if (tb) tb.style.display = 'flex';
  renderTemplateBrowser();
}

function renderTemplateBrowser() {
  const library = getTemplateLibrary();
  const grid = document.getElementById('tb-grid-container');
  if(!grid) return;
  
  const catFilt = document.getElementById('tb-cat-filter').value.toLowerCase();
  const styleFilt = document.getElementById('tb-style-filter').value.toLowerCase();
  const searchQ = document.getElementById('tb-search').value.toLowerCase();
  const premiumOnly = document.getElementById('tb-premium-filter').checked;
  
  grid.innerHTML = '';
  let count = 0;
  
  library.forEach(tmpl => {
    if (premiumOnly && !tmpl.premium) return;
    if (activeTbSize !== 'All' && tmpl.sizes && !tmpl.sizes.includes(activeTbSize)) return;
    if (catFilt !== 'all' && tmpl.category.toLowerCase() !== catFilt) return;
    if (styleFilt !== 'all' && tmpl.style.toLowerCase() !== styleFilt) return;
    if (searchQ && !tmpl.name.toLowerCase().includes(searchQ) && !tmpl.industry.toLowerCase().includes(searchQ) && !tmpl.description.toLowerCase().includes(searchQ)) return;
    
    const card = document.createElement('div');
    card.className = 'tb-card ' + (tmpl.premium ? 'premium-card' : '');
    card.onclick = () => applyTemplate(tmpl.id);
    
    // Support templates that are already an array of pages or a single page object
    const pagesList = tmpl.pages || [tmpl];
    
    const p0 = pagesList[0];
    const previewHTML = renderTemplatePreview(tmpl, p0);
    
    card.innerHTML = `
      <div class="tb-preview">
        ${previewHTML}
      </div>
      <div class="tb-card-info">
        <div class="tb-card-tags">
          <span class="tb-tag tb-tag-cat">${tmpl.category}</span>
          <span class="tb-tag">${tmpl.style}</span>
          ${pagesList.length > 1 ? `<span class="tb-tag" style="background:rgba(168,85,247,0.15); color:#d8b4fe;">${pagesList.length} PAGES</span>` : ''}
        </div>
        <h3>${tmpl.name}</h3>
        <p>${tmpl.description || ''}</p>
        <button class="tb-use-btn">Use This Template</button>
      </div>
    `;
    grid.appendChild(card);
    count++;
  });
  
  if (count === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1; padding:40px; text-align:center; color:rgba(255,255,255,0.4); font-size:14px;">No templates match your filters. Try clearing the search or filters.</div>';
  }
}

function filterTemplates() {
  renderTemplateBrowser();
}

function applyTemplate(id) {
  const library = getTemplateLibrary();
  const tmpl = library.find(t => t.id === id);
  if (!tmpl) return;
  
  if (pages.length > 1 || document.querySelectorAll('.hero-el').length > 0) {
    if (!confirm('Applying a new template will overwrite your current pages. Continue?')) return;
  }
  
  // Clear existing pages array and load new pages
  pages.length = 0;
  const pagesList = tmpl.pages || [tmpl];
  pagesList.forEach(pState => {
    pages.push(JSON.parse(JSON.stringify(pState))); 
  });
  
  currentPageIndex = 0;
  currentLayoutType = pages[0]?.layoutType || tmpl.layoutType || 'grid';
  restorePageState(pages[currentPageIndex]);
  renderPageTabs();
  
  closeTemplateBrowser();
  updateLayers();
  captureHistory();
  showToast(`✅ Template Applied: ${tmpl.name}`);
}


/* ════════════════════════════════════════════════════
   SABA — FULL FEATURE ENGINE
════════════════════════════════════════════════════ */

/* ── Tab switcher ── */
function switchTab(tabId, clickedBtn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  if (clickedBtn) clickedBtn.classList.add('active');
  const pane = document.getElementById('tab-' + tabId);
  if (pane) pane.classList.add('active');
}

/* ── Zoom ── */
document.getElementById('zoom-level')?.addEventListener('change', function(e) {
  const scale = parseInt(e.target.value) / 100;
  const wrapper = document.getElementById('canvas-zoom-wrapper');
  if (wrapper) wrapper.style.transform = `scale(${scale})`;
  syncCanvasSpacer();
});

/* ── Canvas size ── */
document.getElementById('canvas-size')?.addEventListener('change', function(e) {
  const cat = document.getElementById('catalogue');
  const sec = document.querySelector('.products-section');
  if (!cat) return;
  const sizes = {
    'A4':        { w:794,  h:1123, hero:430 },
    'A5':        { w:559,  h:794,  hero:300 },
    'Square':    { w:794,  h:794,  hero:330 },
    'Landscape': { w:1123, h:794,  hero:380 }
  };
  const sz = sizes[e.target.value] || sizes['A4'];
  cat.style.width  = sz.w + 'px';
  cat.style.height = sz.h + 'px';
  const hero = document.querySelector('.hero');
  if (hero) hero.style.height = sz.hero + 'px';
  if (sec)  sec.style.height  = (sz.h - sz.hero) + 'px';
  requestAnimationFrame(() => {
    updateCatalogueScale();
    fitGrid();
  });
  showToast('📐 Canvas: ' + e.target.value);
});

/* ── Undo / Redo ── */
const historyStack = [];
let historyPos = -1;
const MAX_HISTORY = 30;

function captureHistory() {
  // Only capture meaningful state snapshots
  const state = {
    heroEls: [],
    gRows, gCols, layoutType: currentLayoutType, pageColors: currentPageColors
  };
  document.querySelectorAll('#hero .hero-el').forEach(el => {
    state.heroEls.push({
      id: el.id, name: el.dataset.name, type: el.dataset.type,
      left: el.style.left, top: el.style.top, right: el.style.right,
      tAlign: el.style.textAlign, opacity: el.style.opacity,
      display: el.style.display, transform: getElementTransformCSS(el), innerHTML: el.innerHTML
    });
  });
  // Trim future if branching
  if (historyPos < historyStack.length - 1) historyStack.splice(historyPos + 1);
  historyStack.push(JSON.stringify(state));
  if (historyStack.length > MAX_HISTORY) historyStack.shift();
  historyPos = historyStack.length - 1;
  updateHistoryBtns();
  scheduleAutosave();
}

function restoreHistory(state) {
  const s = JSON.parse(state);
  gRows = s.gRows; gCols = s.gCols;
  currentLayoutType = s.layoutType || 'grid';
  applyPageColors(s.pageColors || currentPageColors);
  buildGrid(state.products);
  const hero = document.getElementById('hero');
  hero.querySelectorAll('.hero-el').forEach(e => e.remove());
  s.heroEls.forEach(d => {
    const el = document.createElement('div');
    el.className = 'hero-el';
    el.id = d.id; el.dataset.name = d.name; el.dataset.type = d.type;
    if (d.left)    el.style.left      = d.left;
    if (d.top)     el.style.top       = d.top;
    if (d.right)   el.style.right     = d.right;
    if (d.tAlign)  el.style.textAlign = d.tAlign;
    if (d.opacity) el.style.opacity   = d.opacity;
    if (d.transform) el.style.transform = d.transform;
    el.style.display = d.display || '';
    el.innerHTML = restoredElementHTML(d);
    ensureElementControls(el);
    hero.appendChild(el);
  });
  updateLayers();
  updateBuilderControls();
  requestAnimationFrame(fitGrid);
}

function undoAction() {
  if (historyPos <= 0) { showToast('Nothing to undo', 'error'); return; }
  historyPos--;
  restoreHistory(historyStack[historyPos]);
  showToast('↩ Undo');
  updateHistoryBtns();
}

function redoAction() {
  if (historyPos >= historyStack.length - 1) { showToast('Nothing to redo', 'error'); return; }
  historyPos++;
  restoreHistory(historyStack[historyPos]);
  showToast('↪ Redo');
  updateHistoryBtns();
}

function updateHistoryBtns() {
  const ub = document.getElementById('undoBtn');
  const rb = document.getElementById('redoBtn');
  if (ub) ub.style.opacity = historyPos <= 0 ? '0.35' : '1';
  if (rb) rb.style.opacity = historyPos >= historyStack.length-1 ? '0.35' : '1';
}

/* ── Keyboard shortcuts ── */
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoAction(); }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redoAction(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveTemplate(); }
});

/* ── Toggle snap grid ── */
let gridVisible = false;
function toggleGrid() {
  gridVisible = !gridVisible;
  const c = document.getElementById('saba-center-canvas');
  if (gridVisible) {
    c.style.backgroundImage = `
      repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(99,179,237,.08) 20px),
      repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(99,179,237,.08) 20px)`;
    showToast('⊞ Grid ON');
  } else {
    c.style.backgroundImage = `
      repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,.03) 40px),
      repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,.03) 40px)`;
    showToast('⊞ Grid OFF');
  }
}

/* ── Search Elements ── */
const SEARCH_CATALOG = [
  { name:'Text Box',         ico:'T',  cat:'Text',     action:"addShape('text')" },
  { name:'Heading',          ico:'H₁', cat:'Text',     action:"addShape('text')" },
  { name:'Rectangle',        ico:'▬',  cat:'Shape',    action:"addShape('rect')" },
  { name:'Circle',           ico:'⭕', cat:'Shape',    action:"addShape('circle')" },
  { name:'Triangle',         ico:'△',  cat:'Shape',    action:"addShape('triangle')" },
  { name:'Badge',            ico:'🏅', cat:'Shape',    action:"addShape('badge')" },
  { name:'Image Frame',      ico:'🖼', cat:'Media',    action:"addShape('imgbox')" },
  { name:'Warranty Badge',   ico:'🛡', cat:'Block',    action:"addBlock('warranty')" },
  { name:'Price Tag',        ico:'💰', cat:'Block',    action:"addBlock('pricetag')" },
  { name:'Discount Badge',   ico:'%',  cat:'Block',    action:"addBlock('discount')" },
  { name:'Spec Box',         ico:'📊', cat:'Block',    action:"addBlock('specbox')" },
  { name:'Feature List',     ico:'✅', cat:'Block',    action:"addBlock('featurelist')" },
  { name:'Contact Block',    ico:'📞', cat:'Block',    action:"addBlock('contactblock')" },
  { name:'Category Header',  ico:'🏷', cat:'Block',    action:"addBlock('catHeader')" },
  { name:'Divider Line',     ico:'━',  cat:'Decor',    action:"addBlock('divider')" },
  { name:'Star',             ico:'⭐', cat:'Decor',    action:"addBlock('star')" },
  { name:'Product Card',     ico:'📦', cat:'Product',  action:"addBlock('prodcard')" },
  { name:'Series Name',      ico:'✦',  cat:'Hero',     action:"addHeroEl('series')" },
  { name:'Brand Box',        ico:'🏢', cat:'Hero',     action:"addHeroEl('brand')" },
  { name:'360 Badge',        ico:'🔄', cat:'Hero',     action:"addHeroEl('badge360')" },
  { name:'Bottom Label',     ico:'📝', cat:'Hero',     action:"addHeroEl('bottomlbl')" },
  { name:'Product Info',     ico:'📋', cat:'Hero',     action:"addHeroEl('prodinfo')" },
];

function searchElements(q) {
  const res  = document.getElementById('search-results');
  const empty = document.getElementById('search-empty');
  const globalRes = document.getElementById('global-search-results');
  if (globalRes) globalRes.innerHTML = '';
  if (!q.trim()) {
    res.innerHTML = ''; res.style.display = 'none';
    empty.textContent = 'Start typing to find elements...';
    empty.style.display = '';
    return;
  }
  const matches = SEARCH_CATALOG.filter(i =>
    i.name.toLowerCase().includes(q.toLowerCase()) ||
    i.cat.toLowerCase().includes(q.toLowerCase())
  );
  if (!matches.length) {
    res.innerHTML = ''; res.style.display = 'none';
    empty.textContent = 'No results for "' + q + '"';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';
  res.style.display = 'grid';
  res.innerHTML = matches.map(item => {
    const idx = SEARCH_CATALOG.indexOf(item);
    return `
    <div class="search-result-item" draggable="true" ondragstart="startAssetDrag(event,'catalog',${idx})" onclick="runSearchAction(${idx})">
      <div class="sri-ico">${item.ico}</div>
      <div class="sri-name">${item.name}</div>
      <div class="sri-cat">${item.cat}</div>
    </div>`;
  }).join('');
}

function renderTemplatePreview(tmpl, page) {
  if (!page) return '';
  const layout = page.layoutType || tmpl.layoutType || 'grid';
  const has = token => layoutHas(token, layout);
  const bg = String(page.heroBg || `linear-gradient(145deg, ${tmpl.previewColor}, #0f172a)`).replace(/"/g, "'");
  const mini = count => Array.from({ length: count }, (_, i) => {
    const p = page.products?.[i];
    if (p?.img) {
      return `<div style="background:#fff url('${p.img}') center/contain no-repeat;border-radius:4px;border:1px solid rgba(15,23,42,.08);"></div>`;
    }
    return '<div style="background:rgba(255,255,255,.12);border-radius:3px;"></div>';
  }).join('');

  if (has('cover')) {
    return `
      <div style="height:100%;background:${bg};padding:18px;position:relative;overflow:hidden;">
        <div style="width:80px;height:12px;background:rgba(255,255,255,.72);border-radius:2px;"></div>
        <div style="width:140px;height:42px;background:rgba(255,255,255,.18);border-radius:4px;margin-top:42px;"></div>
        <div style="position:absolute;right:18px;bottom:18px;width:54px;height:54px;border-radius:50%;border:2px solid rgba(255,255,255,.22);"></div>
      </div>`;
  }

  if (has('pricelist')) {
    return `
      <div style="height:52px;background:${bg};padding:12px;"><div style="width:110px;height:10px;background:rgba(255,255,255,.6);border-radius:2px;"></div></div>
      <div style="flex:1;background:#f8fafc;padding:8px;display:flex;flex-direction:column;gap:4px;">
        ${Array(8).fill('<div style="display:grid;grid-template-columns:18px 1fr 44px;gap:6px;height:10px;"><span style="background:#dbeafe;border-radius:6px;"></span><span style="background:#d9e2ef;border-radius:2px;"></span><span style="background:#93c5fd;border-radius:2px;"></span></div>').join('')}
      </div>`;
  }

  if (has('dealersheet') || has('compact')) {
    return `
      <div style="height:42px;background:${bg};padding:10px;"><div style="width:90px;height:9px;background:rgba(255,255,255,.55);border-radius:2px;"></div></div>
      <div style="flex:1;background:rgba(255,255,255,.02);display:grid;grid-template-columns:repeat(5,1fr);gap:3px;padding:5px;">${mini(20)}</div>`;
  }

  if (has('lookbook') || has('showcase') || has('dark')) {
    return `
      <div style="height:62%;background:${bg};position:relative;padding:18px;">
        <div style="width:116px;height:34px;background:rgba(255,255,255,.18);border-radius:5px;margin-top:28px;"></div>
        <div style="position:absolute;right:18px;top:18px;width:50px;height:34px;background:rgba(255,255,255,.14);border-radius:6px;"></div>
      </div>
      <div style="flex:1;display:grid;grid-template-columns:repeat(2,1fr);gap:5px;padding:6px;background:#101827;">${mini(4)}</div>`;
  }

  if (has('specsheet') || has('technical')) {
    return `
      <div style="height:35%;background:${bg};padding:14px;"><div style="width:130px;height:12px;background:rgba(255,255,255,.55);border-radius:2px;"></div></div>
      <div style="flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:5px;padding:6px;background:#f8fafc;">
        ${Array(6).fill('<div style="background:#fff;border:1px solid #dbe3ef;border-radius:4px;padding:4px;"><div style="height:22px;background:#e2e8f0;border-radius:3px;margin-bottom:4px;"></div><div style="height:4px;background:#cbd5e1;margin-bottom:3px;"></div><div style="height:4px;background:#bfdbfe;"></div></div>').join('')}
      </div>`;
  }

  if (has('split')) {
    return `
      <div style="height:100%;display:grid;grid-template-columns:1fr 1fr;">
        <div style="background:${bg};padding:16px;"><div style="width:72px;height:34px;background:rgba(255,255,255,.18);border-radius:4px;margin-top:34px;"></div></div>
        <div style="background:#f8fafc;display:grid;grid-template-columns:repeat(2,1fr);gap:4px;padding:6px;">${mini(8)}</div>
      </div>`;
  }

  if (has('sidebar')) {
    return `
      <div style="height:100%;display:grid;grid-template-columns:35% 65%;">
        <div style="background:${bg};padding:12px;"><div style="width:54px;height:42px;background:rgba(255,255,255,.2);border-radius:4px;margin-top:55px;"></div></div>
        <div style="background:#fafafa;columns:2;column-gap:5px;padding:6px;">${Array(7).fill('<div style="display:inline-block;width:100%;height:28px;background:#e2e8f0;border-radius:4px;margin-bottom:5px;"></div>').join('')}</div>
      </div>`;
  }

  return `
    <div style="flex:1;background:${bg};display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
      <div style="font-size:36px;opacity:.1;font-weight:bold;font-family:'Montserrat',sans-serif;">${tmpl.name.substring(0,1)}</div>
      <div style="position:absolute;bottom:10px;width:60%;height:4px;background:rgba(255,255,255,.2);border-radius:2px;"></div>
    </div>
    <div style="height:45px;background:rgba(255,255,255,.02);display:grid;grid-template-columns:repeat(${Math.min(page.gCols || 4, 5)},1fr);gap:3px;padding:4px;">${mini(Math.min(10, (page.gRows || 2) * (page.gCols || 4)))}</div>`;
}

function runSearchAction(index, dropEvent) {
  const item = SEARCH_CATALOG[index];
  if (!item) return;
  const id = Function(`return (${item.action})`)();
  if (id && dropEvent) placeElementFromDrop(id, dropEvent);
  showToast(`✅ ${item.name} added`);
}

function startAssetDrag(event, source, payload) {
  event.dataTransfer.setData('application/x-saba-asset', JSON.stringify({ source, payload }));
  event.dataTransfer.effectAllowed = 'copy';
}

function setupCanvasDrops() {
  const hero = document.getElementById('hero');
  if (!hero) return;
  hero.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  hero.addEventListener('drop', e => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/x-saba-asset');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.source === 'catalog') runSearchAction(data.payload, e);
      if (data.source === 'global') addGlobalAssetToCanvas(data.payload, e);
    } catch (err) {
      showToast('Could not add dragged asset', 'error');
    }
  });
}

function placeElementFromDrop(id, e) {
  const el = document.getElementById(id);
  const hero = document.getElementById('hero');
  if (!el || !hero || !e) return;
  const rect = hero.getBoundingClientRect();
  const scale = getCatalogueScale();
  el.style.right = 'auto';
  const maxH = document.getElementById('hero').offsetHeight || 430;
  el.style.left = Math.max(0, Math.min(760, (e.clientX - rect.left) / scale - 20)) + 'px';
  el.style.top = Math.max(0, Math.min(maxH - 20, (e.clientY - rect.top) / scale - 20)) + 'px';
  activateEl(id);
  captureHistory();
}

function getCurrentSearchQuery() {
  return (document.getElementById('element-search')?.value || '').trim();
}

function searchGlobalAssets() {
  const q = getCurrentSearchQuery();
  const res = document.getElementById('global-search-results');
  const empty = document.getElementById('search-empty');
  if (!res) return;
  if (!q) {
    showToast('Search something first, then use Global Assets', 'error');
    return;
  }
  const encoded = encodeURIComponent(q);
  const assets = [
    { name:`${q} icon`, type:'Icon', url:`https://source.unsplash.com/320x240/?${encoded},icon` },
    { name:`${q} product`, type:'Image', url:`https://source.unsplash.com/320x240/?${encoded},product` },
    { name:`${q} background`, type:'Background', url:`https://source.unsplash.com/320x240/?${encoded},background` },
    { name:`${q} texture`, type:'Texture', url:`https://source.unsplash.com/320x240/?${encoded},texture` }
  ];
  res.style.display = 'grid';
  res.innerHTML = assets.map((asset, i) => `
    <div class="search-result-item" draggable="true" ondragstart="startAssetDrag(event,'global',${i})" onclick="addGlobalAssetToCanvas(${i})">
      <div class="global-thumb">🌐</div>
      <div class="sri-name">${asset.name}</div>
      <div class="sri-cat">${asset.type} · license unknown</div>
    </div>
  `).join('');
  window.SABA_GLOBAL_RESULTS = assets;
  if (empty) {
    empty.style.display = '';
    empty.textContent = 'Global assets use web image URLs. Check license/source before commercial use.';
  }
}

function addGlobalAssetToCanvas(index, dropEvent) {
  const asset = window.SABA_GLOBAL_RESULTS?.[index];
  if (!asset) return;
  const id = addWebImageAsset(asset.url, asset.name);
  if (dropEvent) placeElementFromDrop(id, dropEvent);
  showToast('🌐 Global asset added. Check license before commercial use.');
}

function addImageFromUrl() {
  const url = prompt('Paste image URL to add it to the catalogue:');
  if (!url) return;
  if (!/^https?:\/\//i.test(url.trim())) {
    showToast('Please enter a valid http/https image URL', 'error');
    return;
  }
  addWebImageAsset(url.trim(), 'Web Image');
  showToast('🌐 Image URL added');
}

function addWebImageAsset(url, label) {
  const hero = document.getElementById('hero');
  const id = `el-web-${Date.now()}`;
  const el = document.createElement('div');
  el.className = 'hero-el';
  el.id = id;
  el.dataset.name = label || 'Web Image';
  el.dataset.type = 'imgbox';
  el.style.left = '90px';
  el.style.top = '90px';
  el.innerHTML = `<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('${id}')">×</button><div style="width:150px;height:110px;border:2px solid rgba(255,255,255,.25);border-radius:10px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;overflow:hidden;"><img src="${url}" style="max-width:100%;max-height:100%;object-fit:contain;" referrerpolicy="no-referrer"><span style="display:none;color:rgba(255,255,255,.45);font-size:10px;">Image failed</span></div>`;
  hero.appendChild(el);
  updateLayers();
  setTimeout(() => activateEl(id), 30);
  captureHistory();
  return id;
}
/* ── Add Hero Elements by type ── */
function addHeroEl(type) {
  const hero = document.getElementById('hero');
  const id   = `el-${type}-${Date.now()}`;
  const templates = {
    series:    { name:'Series Name', html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('${id}')">×</button><div><div class="series-name" contenteditable="false">SERIES NAME</div><div class="series-sub" contenteditable="false">SUBTITLE</div></div>` },
    brand:     { name:'Brand Box',   html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('${id}')">×</button><div class="brand-box"><div class="bname" contenteditable="false">YOUR BRAND</div><div class="btag" contenteditable="false">Tagline here</div></div>` },
    badge360:  { name:'360° Badge',  html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('${id}')">×</button><div class="badge-360"><div class="b360-num" contenteditable="false">360°</div><div class="b360-text" contenteditable="false">FULL TURN</div></div>` },
    bottomlbl: { name:'Bottom Label',html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('${id}')">×</button><div class="hero-btm-label" contenteditable="false">★ YOUR LABEL TEXT ★</div>` },
    prodinfo:  { name:'Product Info', html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('${id}')">×</button><div class="hero-prod-name" contenteditable="false">Product Name</div><div class="hero-prod-detail" contenteditable="false">Pack info here</div><div class="hero-prod-mrp" contenteditable="false">MRP Rs. 000/-</div>` },
  };
  const t = templates[type]; if (!t) return;
  const el = document.createElement('div');
  el.className = 'hero-el'; el.id = id;
  el.dataset.name = t.name; el.dataset.type = type;
  el.style.left = '80px'; el.style.top = '80px';
  el.innerHTML = t.html;
  if (editMode) el.querySelectorAll('[contenteditable]').forEach(e => e.contentEditable = 'true');
  hero.appendChild(el);
  updateLayers();
  setTimeout(() => activateEl(id), 30);
  captureHistory();
  return id;
}

/* ── Add Catalogue Blocks ── */
function addBlock(type) {
  const hero = document.getElementById('hero');
  const id   = `el-blk-${Date.now()}`;
  const configs = {
    warranty:     { name:'Warranty Badge',  type:'warranty',  left:'30px', top:'90px',
      html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('${id}')">×</button><div class="warranty-badge"><span class="w-num" contenteditable="false">36</span><span class="w-text" contenteditable="false">MONTHS<br>WARRANTY</span></div>` },
    pricetag:     { name:'Price Tag',       type:'badge',     left:'60px', top:'120px',
      html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('${id}')">×</button><div class="cshape is-badge" style="width:90px;height:90px;background:radial-gradient(circle,#16a34a,#14532d);border:3px solid rgba(255,255,255,.4);"><div class="shape-inner" contenteditable="false">Rs.999<br>/-</div></div>` },
    discount:     { name:'Discount Badge',  type:'badge',     left:'60px', top:'120px',
      html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('${id}')">×</button><div class="cshape is-badge" style="width:90px;height:90px;background:radial-gradient(circle,#dc2626,#7f1d1d);border:3px solid rgba(255,255,255,.4);"><div class="shape-inner" style="font-size:22px;" contenteditable="false">20%<br><span style="font-size:9px;">OFF</span></div></div>` },
    specbox:      { name:'Spec Box',        type:'specs',     left:'22px', top:'200px',
      html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('${id}')">×</button><div class="specs-card"><div class="spec-row"><span class="spec-lbl" contenteditable="false">Size:</span><span contenteditable="false">15mm</span></div><div class="spec-row"><span class="spec-lbl" contenteditable="false">Material:</span><span contenteditable="false">Brass</span></div><div class="spec-row"><span class="spec-lbl" contenteditable="false">Color:</span><span contenteditable="false">Chrome</span></div></div>` },
    featurelist:  { name:'Feature List',    type:'features',  left:'22px', top:'180px',
      html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('${id}')">×</button><div class="features-list"><div class="feat-item"><div class="feat-dot">✓</div><div class="feat-text" contenteditable="false">ISI Certified</div></div><div class="feat-item"><div class="feat-dot">✓</div><div class="feat-text" contenteditable="false">Premium Quality</div></div><div class="feat-item"><div class="feat-dot">✓</div><div class="feat-text" contenteditable="false">Long Lasting</div></div></div>` },
    contactblock: { name:'Contact Block',   type:'text',      left:'22px', top:'330px',
      html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('${id}')">×</button><div style="background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:10px 14px;min-width:180px;"><div style="font-size:10px;color:#7fdecc;font-weight:700;margin-bottom:5px;">CONTACT US</div><div style="font-size:9px;color:rgba(255,255,255,.75);line-height:1.7;" contenteditable="false">📞 +91 00000 00000<br>📧 info@company.com<br>🌐 www.company.com</div></div>` },
    catHeader:    { name:'Category Header', type:'text',      left:'200px', top:'20px',
      html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('${id}')">×</button><div style="background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.2);border-radius:6px;padding:6px 20px;"><div style="font-size:14px;font-weight:800;color:white;letter-spacing:3px;font-family:'Montserrat',sans-serif;" contenteditable="false">CATEGORY NAME</div></div>` },
    divider:      { name:'Divider Line',    type:'text',      left:'20px', top:'215px',
      html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('${id}')">×</button><div style="width:350px;height:2px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);"></div>` },
    star:         { name:'Star',            type:'badge',     left:'80px', top:'80px',
      html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('${id}')">×</button><div class="cshape is-badge" style="width:76px;height:76px;background:radial-gradient(circle,#eab308,#a16207);border:2px solid rgba(255,255,255,.3);"><div class="shape-inner" style="font-size:28px;" contenteditable="false">⭐</div></div>` },
    prodcard:     { name:'Product Card',    type:'text',      left:'60px', top:'60px',
      html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('${id}')">×</button><div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:12px;text-align:center;min-width:100px;"><div style="width:70px;height:60px;background:rgba(255,255,255,.1);border-radius:6px;margin:0 auto 8px;"></div><div style="font-size:10px;font-weight:700;color:white;" contenteditable="false">Product Name</div><div style="font-size:11px;font-weight:800;color:#ffd54f;margin-top:3px;" contenteditable="false">MRP Rs. 000/-</div></div>` },
  };
  const cfg = configs[type]; if (!cfg) return;
  const el = document.createElement('div');
  el.className = 'hero-el'; el.id = id;
  el.dataset.name = cfg.name; el.dataset.type = cfg.type;
  el.style.left = cfg.left; el.style.top = cfg.top;
  el.innerHTML = cfg.html;
  if (editMode) el.querySelectorAll('[contenteditable]').forEach(e => e.contentEditable = 'true');
  hero.appendChild(el);
  updateLayers();
  setTimeout(() => activateEl(id), 30);
  captureHistory();
  return id;
}

/* ── Right panel properties sync ── */
function showProperties(id) {
  // Update LEFT sidebar prop-card
  const panel = document.getElementById('prop-panel-body');
  const card  = document.getElementById('prop-card');
  // Update RIGHT panel too
  const rpBody = document.getElementById('rp-prop-body');
  const el = document.getElementById(id);
  if (!el) { if (rpBody) rpBody.innerHTML = '<div class="pp-empty">Select an element to see properties</div>'; return; }

  if (card) card.style.display = '';
  const type = el.dataset.type || 'text';
  const builder = PP_BUILDERS[type] || (() => '');
  const html = commonProps(id, el) + builder(id, el);
  if (panel) panel.innerHTML = html;
  if (rpBody) rpBody.innerHTML = html;
}

/* ── Brand Kit ── */
let brandKit = {};

function saveBrandKit() {
  brandKit = {
    company:   document.getElementById('brand-company')?.value  || '',
    tagline:   document.getElementById('brand-tagline')?.value  || '',
    phone:     document.getElementById('brand-phone')?.value    || '',
    email:     document.getElementById('brand-email')?.value    || '',
    website:   document.getElementById('brand-website')?.value  || '',
    address:   document.getElementById('brand-address')?.value  || '',
    gst:       document.getElementById('brand-gst')?.value      || '',
    instagram: document.getElementById('brand-instagram')?.value|| '',
    colors:    [1,2,3,4,5,6].map(n => document.getElementById('bc'+n)?.value || '#ffffff'),
    font:      document.getElementById('brand-font')?.value     || "'Montserrat',sans-serif",
  };
  localStorage.setItem('saba_brand_kit', JSON.stringify(brandKit));
}

function loadBrandKit() {
  const raw = localStorage.getItem('saba_brand_kit');
  if (!raw) return;
  try {
    brandKit = JSON.parse(raw);
    if (brandKit.company)   { const el = document.getElementById('brand-company');   if (el) el.value = brandKit.company; }
    if (brandKit.tagline)   { const el = document.getElementById('brand-tagline');   if (el) el.value = brandKit.tagline; }
    if (brandKit.phone)     { const el = document.getElementById('brand-phone');     if (el) el.value = brandKit.phone; }
    if (brandKit.email)     { const el = document.getElementById('brand-email');     if (el) el.value = brandKit.email; }
    if (brandKit.website)   { const el = document.getElementById('brand-website');   if (el) el.value = brandKit.website; }
    if (brandKit.address)   { const el = document.getElementById('brand-address');   if (el) el.value = brandKit.address; }
    if (brandKit.gst)       { const el = document.getElementById('brand-gst');       if (el) el.value = brandKit.gst; }
    if (brandKit.instagram) { const el = document.getElementById('brand-instagram'); if (el) el.value = brandKit.instagram; }
    if (brandKit.colors) brandKit.colors.forEach((c,i) => { const el = document.getElementById('bc'+(i+1)); if (el) el.value = c; });
    if (brandKit.font)    { const el = document.getElementById('brand-font'); if (el) el.value = brandKit.font; }
  } catch(e) {}
}

function applyBrandFont() {
  const font = document.getElementById('brand-font')?.value;
  if (!font) return;
  document.querySelectorAll('.bname,.btag,.brand-box').forEach(el => el.style.fontFamily = font);
}

function pickBrandLogo() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const preview = document.getElementById('brand-logo-preview');
    const blobUrl = URL.createObjectURL(f);
    imgToB64(blobUrl, 300, 0.8).then(b64 => {
      if (preview) preview.innerHTML = `<img src="${b64}" style="max-width:100%;max-height:70px;border-radius:6px;border:1px solid rgba(255,255,255,.1);">`;
      brandKit.logoUrl = b64;
      URL.revokeObjectURL(blobUrl);
    });
    showToast('✅ Logo uploaded!');
  };
  inp.click();
}

function applyBrandToPage() {
  const company = document.getElementById('brand-company')?.value;
  const tagline = document.getElementById('brand-tagline')?.value;
  // Apply to brand-box elements on hero
  document.querySelectorAll('.bname').forEach(el => { if (company) el.textContent = company; });
  document.querySelectorAll('.btag').forEach(el => { if (tagline) el.textContent = tagline; });
  // Apply section title
  const secTitle = document.querySelector('.psh-title');
  if (secTitle && company) secTitle.textContent = company + ' — Products';
  applyBrandFont();
  showToast('⚡ Brand applied to page!');
  captureHistory();
}

/* ── Product Database ── */
let productDB = [];
let mpImgData  = null;

function loadProductDB() {
  const raw = localStorage.getItem('saba_products');
  if (raw) try { productDB = JSON.parse(raw); } catch(e) {}
  renderProductDB();
}

function saveProductDB() {
  localStorage.setItem('saba_products', JSON.stringify(productDB));
}

function renderProductDB(filter) {
  const list = document.getElementById('product-db-list');
  if (!list) return;
  const items = filter
    ? productDB.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || (p.category||'').toLowerCase().includes(filter.toLowerCase()))
    : productDB;
  if (!items.length) {
    list.innerHTML = '<div style="font-size:10px;color:rgba(255,255,255,.25);text-align:center;padding:16px;">No products yet. Click + Add Product.</div>';
    return;
  }
  list.innerHTML = items.map((p,i) => `
    <div class="product-db-item">
      <div class="pdi-name">${p.name}</div>
      <div class="pdi-meta">${p.mrp || ''} ${p.category ? '· '+p.category : ''} ${p.packing ? '· '+p.packing : ''}</div>
      <div class="pdi-actions">
        <button class="pp-btn" onclick="addProductToCanvas(${i})" style="flex:1;justify-content:center;">+ Add to Canvas</button>
        <button class="pp-btn pp-btn-danger" onclick="deleteProductFromDB(${i})">✕</button>
      </div>
    </div>`).join('');
}

function filterProductDB(q) { renderProductDB(q); }

function showAddProductModal() {
  document.getElementById('add-product-modal').style.display = 'flex';
  document.getElementById('mp-name').focus();
  mpImgData = null;
  const prev = document.getElementById('mp-img-preview');
  if (prev) { prev.style.display = 'none'; prev.src = ''; }
}

function closeProductModal() {
  document.getElementById('add-product-modal').style.display = 'none';
  ['mp-name','mp-category','mp-sku','mp-mrp','mp-dealer','mp-packing','mp-specs'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
}

function pickModalProductImg() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      mpImgData = ev.target.result;
      const prev = document.getElementById('mp-img-preview');
      if (prev) { prev.src = mpImgData; prev.style.display = 'block'; }
    };
    reader.readAsDataURL(f);
  };
  inp.click();
}

function saveProductToDB() {
  const name = document.getElementById('mp-name')?.value.trim();
  if (!name) { showToast('Product name is required!', 'error'); return; }
  const product = {
    name,
    category: document.getElementById('mp-category')?.value.trim() || '',
    sku:      document.getElementById('mp-sku')?.value.trim()      || '',
    mrp:      document.getElementById('mp-mrp')?.value.trim()      || '',
    dealer:   document.getElementById('mp-dealer')?.value.trim()   || '',
    packing:  document.getElementById('mp-packing')?.value.trim()  || '',
    specs:    document.getElementById('mp-specs')?.value.trim()    || '',
    img:      mpImgData || '',
    addedAt:  Date.now()
  };
  productDB.push(product);
  saveProductDB();
  renderProductDB();
  closeProductModal();
  showToast(`✅ "${name}" added to database!`);
}

function deleteProductFromDB(i) {
  if (!confirm('Remove this product?')) return;
  productDB.splice(i, 1);
  saveProductDB();
  renderProductDB();
  showToast('🗑 Product removed');
}

function addProductToCanvas(i) {
  const p = productDB[i];
  if (!p) return;
  // Update first empty product card in grid
  const cards = document.querySelectorAll('.product-card');
  let placed = false;
  for (const card of cards) {
    const n = card.querySelector('.prod-name');
    if (n && (n.textContent.startsWith('Product ') || n.textContent === '')) {
      if (n) n.textContent = p.name;
      const m = card.querySelector('.prod-mrp');
      if (m) m.textContent = p.mrp || 'MRP Rs. ---';
      const pk = card.querySelector('.prod-packing');
      if (pk) pk.textContent = p.packing || '';
      placed = true; break;
    }
  }
  if (!placed) showToast('All product slots are filled!', 'error');
  else showToast(`✅ "${p.name}" placed on canvas!`);
}

function importProductsCSV() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.csv,text/csv';
  inp.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const lines = ev.target.result.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g,''));
      let added = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g,''));
        const p = {};
        headers.forEach((h,idx) => {
          if (h === 'name'     || h === 'productname') p.name     = cols[idx] || '';
          if (h === 'category' || h === 'cat')         p.category = cols[idx] || '';
          if (h === 'sku'      || h === 'model')       p.sku      = cols[idx] || '';
          if (h === 'mrp'      || h === 'price')       p.mrp      = cols[idx] || '';
          if (h === 'packing'  || h === 'pack')        p.packing  = cols[idx] || '';
          if (h === 'dealer'   || h === 'dealerprice') p.dealer   = cols[idx] || '';
        });
        if (p.name) { productDB.push({ ...p, addedAt: Date.now() }); added++; }
      }
      saveProductDB();
      renderProductDB();
      showToast(`✅ ${added} products imported from CSV!`);
    };
    reader.readAsText(f);
  };
  inp.click();
}

/* ════════════════════════════════════════════════════
   INIT — SABA full startup
════════════════════════════════════════════════════ */
// Always edit mode in SABA
loadTheme();
document.body.classList.add('edit-mode');
editMode = true;

// Update edit button UI
const eBtn = document.getElementById('editBtn');
if (eBtn) { eBtn.textContent = '✅ Editing'; eBtn.classList.add('active'); }

// Responsive scale (legacy mobile support)
updateCatalogueScale();
loadPageColors();
buildGrid();
initDrag();
setupCanvasDrops();
requestAnimationFrame(fitGrid);

// Load brand kit
loadBrandKit();
loadProductDB();

const hadSavedDesign = !!localStorage.getItem('cc_save_v3');
if (hadSavedDesign) loadTemplate(true);

// Capture initial history state
requestAnimationFrame(() => {
  captureHistory();
  updateHistoryBtns();
});

// Show template picker only on a fresh project, not after refresh.
if (!hadSavedDesign) requestAnimationFrame(() => showPicker());

window.addEventListener('resize', () => {
  updateCatalogueScale();
  fitGrid();
});

// Capture history after drag ends
document.addEventListener('pointerup', () => {
  if (dragEl) setTimeout(captureHistory, 100);
});

document.addEventListener('input', e => {
  if (e.target.closest?.('#hero, #productsGrid')) scheduleAutosave();
});

window.addEventListener('afterprint', () => {
  document.body.classList.remove('printing-pdf');
  document.getElementById('print-pages')?.remove();
});

/* ════════════════════════════════════════════════════
   MULTI-PAGE SYSTEM — Real implementation
════════════════════════════════════════════════════ */

// Save current canvas state as a page snapshot
function capturePageState() {
  const heroEls = [];
  document.querySelectorAll('#hero .hero-el').forEach(el => {
    heroEls.push({
      id: el.id, name: el.dataset.name, type: el.dataset.type,
      left: el.style.left, top: el.style.top, right: el.style.right,
      tAlign: el.style.textAlign, opacity: el.style.opacity,
      display: el.style.display, transform: getElementTransformCSS(el), innerHTML: el.innerHTML
    });
  });
  const products = [];
  document.querySelectorAll('.product-card').forEach(card => {
    products.push({
      name:    card.querySelector('.prod-name')?.textContent    || '',
      mrp:     card.querySelector('.prod-mrp')?.textContent     || '',
      packing: card.querySelector('.prod-packing')?.textContent || '',
      img:     card.querySelector('img')?.src || ''
    });
  });
  const heroBgWrap = document.getElementById('heroBgWrap');
  const hero = document.getElementById('hero');
  const sec = document.querySelector('.products-section');
  return {
    gRows, gCols,
    layoutType: currentLayoutType,
    pageColors: currentPageColors,
    heroEls,
    products,
    heroDisplay: hero ? hero.style.display : '',
    heroHeight:  hero ? hero.style.height : '430px',
    secDisplay:  sec ? sec.style.display : '',
    secHeight:   sec ? sec.style.height : '',
    heroBg:      heroBgWrap?.style.backgroundImage || '',
    heroBgSize:  heroBgWrap?.style.backgroundSize  || '',
    heroBgPos:   heroBgWrap?.style.backgroundPosition || '',
    heroBgOp:    heroBgWrap?.style.opacity         || '1',
    heroOverlay: document.getElementById('heroOverlay')?.style.display || 'none',
    hideHeroPh:  pages[currentPageIndex]?.hideHeroPh || false,
    cardStyles:  JSON.parse(JSON.stringify(cardStyles || {}))
  };
}

// Restore a saved page state to the canvas
function restorePageState(state) {
  if (!state) return;
  // Grid
  gRows = Number.isFinite(Number(state.gRows)) ? Number(state.gRows) : 3;
  gCols = Number.isFinite(Number(state.gCols)) ? Number(state.gCols) : 4;
  currentLayoutType = state.layoutType || 'grid';
  applyPageColors(state.pageColors || DEFAULT_PAGE_COLORS);
  buildGrid(state.products);
  // Hero and Sec Heights
  const hero = document.getElementById('hero');
  const sec = document.querySelector('.products-section');
  const isCover = layoutHas('cover', state.layoutType) || gRows <= 0 || gCols <= 0;
  const heroHeight = state.heroHeight
    ? (String(state.heroHeight).endsWith('px') ? String(state.heroHeight) : state.heroHeight + 'px')
    : (isCover ? '1123px' : '430px');
  if (hero) hero.style.height = heroHeight;
  if (hero) hero.style.display = state.heroDisplay || '';
  if (sec) {
    sec.style.display = isCover ? 'none' : (state.secDisplay || '');
    if (!isCover) {
      const heroPx = parseFloat(heroHeight) || 430;
      sec.style.height = state.secHeight || `calc(1123px - ${heroPx}px)`;
    }
  }
  // Hero BG
  const wrap = document.getElementById('heroBgWrap');
  wrap.style.backgroundImage    = state.heroBg     || '';
  wrap.style.backgroundSize     = state.heroBgSize  || 'cover';
  wrap.style.backgroundPosition = state.heroBgPos   || 'center';
  wrap.style.opacity            = state.heroBgOp    || '1';
  const ph = document.getElementById('heroPh');
  const ov = document.getElementById('heroOverlay');
  ph.style.display = (state.heroBg || state.hideHeroPh) ? 'none' : '';
  if (ov) ov.style.display = state.heroOverlay || 'none';
  // Hero elements
  hero.querySelectorAll('.hero-el').forEach(e => e.remove());
  (state.heroEls || []).forEach(d => {
    const el = document.createElement('div');
    el.className = 'hero-el'; el.id = d.id;
    el.dataset.name = d.name || ''; el.dataset.type = d.type || '';
    if (d.left)    el.style.left      = d.left;
    if (d.top)     el.style.top       = d.top;
    if (d.right)   el.style.right     = d.right;
    if (d.tAlign)  el.style.textAlign = d.tAlign;
    if (d.opacity) el.style.opacity   = d.opacity;
    if (d.transform) el.style.transform = d.transform;
    el.style.display = d.display || '';
    el.innerHTML = restoredElementHTML(d);
    ensureElementControls(el);
    if (editMode) el.querySelectorAll('[contenteditable]').forEach(e => e.contentEditable = 'true');
    hero.appendChild(el);
  });
  // Products
  document.querySelectorAll('.product-card').forEach((card, i) => {
    if (!state.products || !state.products[i]) return;
    const p = state.products[i];
    const n  = card.querySelector('.prod-name');    if (n)  n.textContent  = p.name;
    const m  = card.querySelector('.prod-mrp');     if (m)  m.textContent  = p.mrp;
    const pk = card.querySelector('.prod-packing'); if (pk) pk.textContent = p.packing;
    
    const img = card.querySelector('.prod-img, img[id^="pimg"], img');
    const ph = card.querySelector('.prod-img-ph');
    if (img && p.img && p.img !== '' && !p.img.includes('placeholder')) {
      img.src = p.img;
      img.style.display = 'block';
      if (ph) ph.style.display = 'none';
    } else {
      if (img) { img.src = ''; img.style.display = 'none'; }
      if (ph) ph.style.display = 'flex';
    }
  });
  syncProductImagePlaceholders(document.getElementById('productsGrid'));
  // Card styles
  if (state.cardStyles) applyCardStyles(state.cardStyles);
  updateLayers();
  requestAnimationFrame(fitGrid);
}

// Add a new page
function addPage() {
  const currentState = capturePageState();
  pages[currentPageIndex] = currentState;

  // Create a new page based on current template layout
  const newPage = JSON.parse(JSON.stringify(currentState));
  
  // Keep the layout, backgrounds, and styling, but reset products to placeholders
  const prodCount = (newPage.gRows || 3) * (newPage.gCols || 4);
  newPage.products = Array.from({length: Math.max(12, prodCount)}, (_,i) => ({ 
    name: `Product ${i+1}`, mrp: 'MRP Rs. 000/-', packing: '' 
  }));

  pages.push(newPage);
  currentPageIndex = pages.length - 1;

  restorePageState(newPage);
  renderPageTabs();
  showToast(`✅ Page ${currentPageIndex + 1} added!`);
}

// Switch to a specific page
function switchPage(idx) {
  if (idx === currentPageIndex) return;
  // Save current
  pages[currentPageIndex] = capturePageState();
  // Switch
  currentPageIndex = idx;
  restorePageState(pages[currentPageIndex]);
  renderPageTabs();
  showToast(`📄 Page ${currentPageIndex + 1}`);
}

// Delete a page
function deletePage(idx, e) {
  if (e) e.stopPropagation();
  if (pages.length <= 1) { showToast('Cannot delete the only page!', 'error'); return; }
  if (!confirm(`Delete Page ${idx + 1}?`)) return;
  pages.splice(idx, 1);
  if (currentPageIndex >= pages.length) currentPageIndex = pages.length - 1;
  restorePageState(pages[currentPageIndex]);
  renderPageTabs();
  showToast(`🗑 Page deleted`);
}

// Rename a page (double-click)
function renamePage(idx) {
  const tabsEl = document.getElementById('page-tabs');
  const tab = tabsEl.children[idx];
  if (!tab) return;
  const oldName = tab.dataset.label || `Page ${idx + 1}`;
  const newName = prompt('Rename page:', oldName);
  if (newName && newName.trim()) {
    tab.dataset.label = newName.trim();
    renderPageTabs();
  }
}

// Render page tab strip
function renderPageTabs() {
  const tabsEl    = document.getElementById('page-tabs');
  const countLbl  = document.getElementById('page-count-lbl');
  // Ensure pages array is always in sync
  while (pages.length < 1) pages.push(capturePageState());
  const labels = Array.from({ length: pages.length }, (_, i) =>
    tabsEl.children[i]?.dataset?.label || `Page ${i + 1}`
  );
  tabsEl.innerHTML = labels.map((lbl, i) => `
    <button class="page-tab ${i === currentPageIndex ? 'active' : ''}"
      data-label="${lbl}"
      onclick="switchPage(${i})"
      ondblclick="renamePage(${i})"
      title="Double-click to rename">
      ${lbl}
      ${pages.length > 1 ? `<span class="page-tab-del" onclick="deletePage(${i}, event)">×</span>` : ''}
    </button>`).join('');
  if (countLbl) countLbl.textContent = `Page ${currentPageIndex + 1} of ${pages.length}`;
}

// Initialize pages array with page 1 only when no saved design/template loaded.
if (pages.length === 0) pages.push(capturePageState());
renderPageTabs();

/* ════════════════════════════════════════════════════
   ALIGNMENT GUIDES — Real implementation
════════════════════════════════════════════════════ */

let guidesVisible = false;
const GUIDE_COLOR = 'rgba(99,179,237,0.55)';

function toggleGuides() {
  guidesVisible = !guidesVisible;
  const btn = document.getElementById('guides-btn');
  if (guidesVisible) {
    showGuides();
    if (btn) { btn.style.color = '#60a5fa'; btn.style.borderColor = 'rgba(96,165,250,.5)'; }
    showToast('⊕ Guides ON — Smart center lines enabled');
  } else {
    removeGuides();
    if (btn) { btn.style.color = ''; btn.style.borderColor = ''; }
    showToast('⊕ Guides OFF');
  }
}

function showGuides() {
  const cat = document.getElementById('catalogue');
  if (!cat) return;
  removeGuides(); // Remove old ones first
  // Vertical center guide
  const vGuide = document.createElement('div');
  vGuide.className = 'saba-guide saba-guide-v';
  vGuide.id = 'guide-v-center';
  vGuide.style.cssText = `
    position:absolute; top:0; bottom:0; left:50%; width:1px;
    background:${GUIDE_COLOR}; pointer-events:none; z-index:9998;
    box-shadow: 0 0 6px rgba(99,179,237,.4);
  `;
  // Horizontal center guide
  const hGuide = document.createElement('div');
  hGuide.className = 'saba-guide saba-guide-h';
  hGuide.id = 'guide-h-center';
  hGuide.style.cssText = `
    position:absolute; left:0; right:0; top:50%; height:1px;
    background:${GUIDE_COLOR}; pointer-events:none; z-index:9998;
    box-shadow: 0 0 6px rgba(99,179,237,.4);
  `;
  // Rule-of-thirds lines
  ['33.33%','66.66%'].forEach((pos, i) => {
    const vt = document.createElement('div');
    vt.className = 'saba-guide';
    vt.style.cssText = `position:absolute; top:0; bottom:0; left:${pos}; width:1px; background:rgba(99,179,237,.2); pointer-events:none; z-index:9997;`;
    const ht = document.createElement('div');
    ht.className = 'saba-guide';
    ht.style.cssText = `position:absolute; left:0; right:0; top:${pos}; height:1px; background:rgba(99,179,237,.2); pointer-events:none; z-index:9997;`;
    cat.appendChild(vt); cat.appendChild(ht);
  });
  cat.appendChild(vGuide);
  cat.appendChild(hGuide);
}

function removeGuides() {
  document.querySelectorAll('.saba-guide').forEach(g => g.remove());
}

// Smart snap guide: show guide when dragged element aligns with canvas center
function checkSnapGuides(el) {
  if (!guidesVisible || !el) return;
  const cat = document.getElementById('catalogue');
  if (!cat) return;
  const catRect = cat.getBoundingClientRect();
  const elRect  = el.getBoundingClientRect();
  const elCx = elRect.left + elRect.width  / 2;
  const elCy = elRect.top  + elRect.height / 2;
  const catCx = catRect.left + catRect.width  / 2;
  const catCy = catRect.top  + catRect.height / 2;
  const vG = document.getElementById('guide-v-center');
  const hG = document.getElementById('guide-h-center');
  // Highlight guide when within 8px of center
  if (vG) vG.style.background = Math.abs(elCx - catCx) < 8 ? '#60a5fa' : GUIDE_COLOR;
  if (hG) hG.style.background = Math.abs(elCy - catCy) < 8 ? '#60a5fa' : GUIDE_COLOR;
}
