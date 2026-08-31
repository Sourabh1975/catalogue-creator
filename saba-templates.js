/* ════════════════════════════════════════════════════
   SABA ADVANCED TEMPLATE LIBRARY
   Contains diverse, Canva-style template structures
════════════════════════════════════════════════════ */

function sabaSvgData(svg) {
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function sabaDemoImage(label, bg='#e2e8f0', accent='#2563eb') {
  return sabaSvgData(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="320" viewBox="0 0 420 320">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="${bg}"/>
        <stop offset="1" stop-color="#ffffff"/>
      </linearGradient>
      <filter id="s"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0f172a" flood-opacity=".18"/></filter>
    </defs>
    <rect width="420" height="320" rx="28" fill="url(#g)"/>
    <ellipse cx="210" cy="248" rx="112" ry="20" fill="#0f172a" opacity=".12"/>
    <rect x="134" y="88" width="152" height="132" rx="28" fill="${accent}" filter="url(#s)"/>
    <rect x="160" y="112" width="100" height="68" rx="14" fill="#fff" opacity=".24"/>
    <circle cx="282" cy="92" r="24" fill="#fff" opacity=".34"/>
    <text x="210" y="266" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="#1e293b">${label}</text>
  </svg>`);
}

function sabaHeroBg(title, bg='#0f172a', accent='#38bdf8') {
  return `url('${sabaSvgData(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="560" viewBox="0 0 1000 560">
    <defs>
      <linearGradient id="b" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="#020617"/></linearGradient>
      <radialGradient id="a" cx=".72" cy=".38" r=".48"><stop stop-color="${accent}" stop-opacity=".45"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1000" height="560" fill="url(#b)"/>
    <rect width="1000" height="560" fill="url(#a)"/>
    <circle cx="780" cy="220" r="132" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="5"/>
    <rect x="610" y="270" width="210" height="140" rx="30" fill="#fff" opacity=".12"/>
    <rect x="72" y="420" width="330" height="8" rx="4" fill="${accent}" opacity=".75"/>
    <text x="74" y="382" font-family="Arial, sans-serif" font-size="48" font-weight="900" fill="#fff" opacity=".16">${title}</text>
  </svg>`)}')`;
}

window.SABA_TEMPLATE_LIBRARY = [
  // ─── 0. BLANK CANVAS (Custom Tables/Freeform) ───
  {
    id: 'blank-canvas',
    name: 'Blank Canvas',
    category: 'General', industry: 'Any', style: 'Blank', pageSize: 'A4', isPremium: false,
    previewColor: '#ffffff', description: 'Start from scratch. Drop tables, text, or grids.',
    gRows: 0, gCols: 0, heroHeight: 1123, layoutType: 'cover', hideHeroPh: true,
    heroEls: [],
    products: [], cardStyles: {}
  },
  // ─── 1. THE CLASSIC RETAIL (Standard) ───
  {
    id: 'classic-retail',
    name: 'Classic Retail Catalog',
    category: 'Grocery/FMCG', industry: 'Retail', style: 'Standard', pageSize: 'A4', isPremium: false,
    previewColor: '#0a1628', description: 'Standard Top Hero + 3x4 Grid',
    gRows: 3, gCols: 4, heroHeight: 430, layoutType: 'grid',
    heroBg: sabaHeroBg('SABA FRESH', '#0f3d2e', '#22c55e'),
    heroEls: [
      { id:'el-cr-title', name:'Title', type:'text', left:'30px', top:'50px', html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-cr-title')">×</button><div><div style="font-size:42px;font-weight:900;color:white;font-family:'Montserrat',sans-serif;letter-spacing:2px;text-transform:uppercase;" contenteditable="false">SUMMER<br>COLLECTION</div></div>`},
      { id:'el-cr-brand', name:'Brand', type:'brand', left:'', top:'50px', right:'30px', html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-cr-brand')">×</button><div class="brand-box"><div class="bname" contenteditable="false">SABA FRESH</div><div class="btag" contenteditable="false">Quality Products</div></div>`},
      { id:'el-cr-badge', name:'Discount', type:'badge', left:'30px', top:'200px', html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-cr-badge')">×</button><div class="cshape is-badge" style="background:#ef4444;width:80px;height:80px;"><span class="shape-inner" style="font-size:16px;" contenteditable="false">50%<br>OFF</span></div>`},
    ],
    products: ['Organic Tea','Cold Pressed Oil','Whole Wheat Atta','Premium Basmati','Herbal Soap','Dry Fruit Mix','Masala Combo','Honey Jar','Fruit Jam','Roasted Snacks','Instant Coffee','Health Drink'].map((name,i)=>({name,mrp:`MRP Rs. ${(i+2)*70}/-`,packing:`Pack of ${i%3+2}`,img:sabaDemoImage(name, '#dcfce7', '#16a34a')})),
    cardStyles: {}
  },

  // ─── 2. THE MAGAZINE COVER (No Grid) ───
  {
    id: 'magazine-cover',
    name: 'Editorial Cover Page',
    category: 'Fashion clothing', industry: 'Fashion', style: 'Lookbook', pageSize: 'A4', isPremium: true,
    previewColor: '#2d0b5e', description: 'Full page visual, magazine style layout',
    gRows: 0, gCols: 0, heroHeight: 1123, layoutType: 'cover',
    heroBg: sabaHeroBg('FASHION', '#2d0b5e', '#c084fc'),
    heroEls: [
      { id:'el-mc-brand', name:'Brand Box', type:'text', left:'50%', top:'40px', html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-mc-brand')">×</button><div style="transform:translateX(-50%);text-align:center;"><div style="font-size:28px;font-weight:900;color:white;letter-spacing:10px;font-family:'Montserrat',sans-serif;" contenteditable="false">VOGUE</div></div>`},
      { id:'el-mc-title', name:'Main Title', type:'text', left:'50px', top:'350px', html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-mc-title')">×</button><div><div style="font-size:72px;font-weight:900;color:white;font-family:'Montserrat',sans-serif;line-height:1;" contenteditable="false">AUTUMN<br>WINTER<br>2026</div></div>`},
      { id:'el-mc-desc', name:'Description', type:'text', left:'50px', top:'600px', html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-mc-desc')">×</button><div style="width:280px;font-size:14px;color:rgba(255,255,255,.7);line-height:1.6;" contenteditable="false">Discover the latest trends in urban fashion. High quality materials meeting cutting-edge design.</div>`},
      { id:'el-mc-web', name:'Website', type:'text', left:'50px', top:'1020px', html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-mc-web')">×</button><div style="font-size:12px;font-weight:700;color:white;letter-spacing:3px;" contenteditable="false">WWW.VOGUEFASHION.COM</div>`}
    ],
    products: [], cardStyles: {}
  },

  // ─── 3. THE SPLIT SCREEN (Left Hero, Right Grid) ───
  {
    id: 'split-electronics',
    name: 'Modern Split-Screen',
    category: 'Electronics', industry: 'Retail', style: 'Modern', pageSize: 'A4', isPremium: true,
    previewColor: '#0a1f15', description: '50% Image left, 50% Product grid right',
    gRows: 4, gCols: 2, heroHeight: 1123, layoutType: 'split',
    heroBg: sabaHeroBg('SMART HOME', '#082f49', '#38bdf8'),
    heroBgOp: '1',
    heroEls: [
      { id:'el-sp-title', name:'Title', type:'text', left:'40px', top:'80px', html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-sp-title')">×</button><div><div style="font-size:36px;font-weight:900;color:white;font-family:'Montserrat',sans-serif;line-height:1.2;" contenteditable="false">SMART<br>HOME<br>DEVICES</div></div>`},
      { id:'el-sp-text', name:'Subtitle', type:'text', left:'40px', top:'220px', html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-sp-text')">×</button><div style="font-size:12px;color:rgba(255,255,255,.8);letter-spacing:1px;text-transform:uppercase;" contenteditable="false">Next Gen Living</div>`}
    ],
    products: ['Smart Speaker','WiFi Camera','Video Doorbell','Smart Plug','LED Light Strip','Air Sensor','Touch Switch','Home Hub'].map((name,i)=>({name,mrp:`Rs. ${(i+2)*950}/-`,packing:'1 unit',img:sabaDemoImage(name, '#e0f2fe', '#0284c7')})),
    cardStyles: {'product-card':{'background':'white','boxShadow':'0 2px 10px rgba(0,0,0,0.05)','borderRadius':'8px','border':'none'}}
  },

  // ─── 4. THE MINIMALIST LIST (Jewelry / Cosmetics) ───
  {
    id: 'minimalist-jewelry',
    name: 'Minimalist Elegant',
    category: 'Jewellery', industry: 'Luxury', style: 'Minimalist', pageSize: 'A4', isPremium: false,
    previewColor: '#e0ded3', description: 'Clean white background, spacious 2x3 grid',
    gRows: 3, gCols: 2, heroHeight: 200, layoutType: 'minimalist',
    heroBg: 'linear-gradient(to right, #ffffff, #fdfdfd)',
    heroEls: [
      { id:'el-mi-brand', name:'Brand', type:'text', left:'50%', top:'60px', html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-mi-brand')">×</button><div style="transform:translateX(-50%);text-align:center;"><div style="font-size:24px;color:#333;font-family:'Playfair Display', serif;letter-spacing:6px;text-transform:uppercase;" contenteditable="false">AURA JEWELS</div><div style="font-size:9px;color:#888;letter-spacing:4px;margin-top:8px;" contenteditable="false">FINE JEWELRY COLLECTION</div></div>`}
    ],
    products: ['Pearl Necklace','Diamond Ring','Gold Bracelet','Ruby Pendant','Classic Earrings','Heritage Kada'].map((name,i)=>({name,mrp:`Rs. ${(i+4)*12500}/-`,packing:'18K Gold',img:sabaDemoImage(name, '#f8fafc', '#b45309')})),
    cardStyles: {'prod-name':{'fontFamily':'"Playfair Display", serif','color':'#222','fontSize':'14px'},'prod-mrp':{'color':'#666','fontWeight':'400'},'prod-packing':{'display':'none'}}
  },

  // ─── 5. THE SIDEBAR (Real Estate / Furniture) ───
  {
    id: 'sidebar-masonry',
    name: 'Sidebar Masonry',
    category: 'Furniture', industry: 'Retail', style: 'Creative', pageSize: 'A4', isPremium: true,
    previewColor: '#1e293b', description: 'Left sidebar (35%) with text, right masonry grid',
    gRows: 4, gCols: 3, heroHeight: 1123, layoutType: 'sidebar masonry', // Combines both classes
    heroBg: sabaHeroBg('SPACES', '#1e293b', '#94a3b8'),
    heroEls: [
      { id:'el-sm-title', name:'Heading', type:'text', left:'30px', top:'350px', html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-sm-title')">×</button><div><div style="font-size:48px;font-weight:900;color:white;font-family:'Montserrat',sans-serif;line-height:1.1;" contenteditable="false">MODERN<br>SPACES</div></div>`},
      { id:'el-sm-desc', name:'Text', type:'text', left:'30px', top:'480px', html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-sm-desc')">×</button><div style="width:200px;font-size:12px;color:rgba(255,255,255,.6);line-height:1.6;" contenteditable="false">Curated furniture pieces designed for contemporary living.</div>`}
    ],
    products: ['Lounge Chair','Oak Coffee Table','Modular Sofa','Wall Console','Dining Set','Bookshelf','Accent Lamp','Side Table','TV Unit','Storage Bench'].map((name,i)=>({name,mrp:`Rs. ${(i+3)*3200}/-`,packing:'Available in 3 colors',img:sabaDemoImage(name, '#f1f5f9', '#475569')})),
    cardStyles: {}
  },

  // ─── 6. THE DARK SHOWCASE (Tech / Gaming) ───
  {
    id: 'dark-tech',
    name: 'Dark Mode Tech',
    category: 'Electronics', industry: 'Gaming', style: 'Dark', pageSize: 'A4', isPremium: true,
    previewColor: '#0b1120', description: 'Full dark theme with glowing accents',
    gRows: 3, gCols: 2, heroHeight: 350, layoutType: 'dark',
    heroBg: 'linear-gradient(135deg, #0b1120, #1e1b4b)',
    heroEls: [
      { id:'el-dt-brand', name:'Brand', type:'text', left:'40px', top:'40px', html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-dt-brand')">×</button><div style="font-size:24px;font-weight:900;color:#818cf8;letter-spacing:3px;font-family:'Montserrat',sans-serif;" contenteditable="false">NEXUS</div>`},
      { id:'el-dt-title', name:'Title', type:'text', left:'40px', top:'150px', html:`<div class="el-handle">⠿</div><button class="el-del" onclick="deleteEl('el-dt-title')">×</button><div><div style="font-size:52px;font-weight:900;color:white;font-family:'Montserrat',sans-serif;line-height:1;text-shadow:0 0 20px rgba(129,140,248,.5);" contenteditable="false">PRO<br>SERIES</div></div>`},
    ],
    products: ['Gaming Mouse','Mechanical Keyboard','Pro Headset','Streaming Mic','RGB Controller','4K Webcam'].map((name,i)=>({name,mrp:`Rs. ${(i+2)*2499}/-`,packing:'RGB Enabled',img:sabaDemoImage(name, '#111827', '#818cf8')})),
    cardStyles: {'prod-name':{'fontSize':'16px','fontWeight':'800'},'product-card':{'borderRadius':'16px','padding':'20px'},'prod-img-box':{'minHeight':'150px'}}
  }
];

if (typeof module !== 'undefined') module.exports = { SABA_TEMPLATE_LIBRARY: window.SABA_TEMPLATE_LIBRARY };
