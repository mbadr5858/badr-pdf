// BADR PDF — CV builder: form + live preview + templates + PDF export.
// Everything runs in the browser; data is kept only in this device's storage.
import '../lang-toggle.js';
import '../native-download.js';
import { getLanguageFromUrl } from '../i18n/i18n';
import { Capacitor } from '@capacitor/core';

type Lang = 'ar' | 'en';
interface Exp {
  title: string;
  org: string;
  dates: string;
  details: string;
}
interface Edu {
  degree: string;
  school: string;
  dates: string;
}
interface CV {
  lang: Lang;
  template: string;
  color: string;
  photo: string;
  name: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  link: string;
  summary: string;
  experience: Exp[];
  education: Edu[];
  skills: string;
  languages: string;
  certs: string;
}

const STORE_KEY = 'badr-cv-v1';
const TEMPLATES = ['ats', 'classic', 'minimal', 'bold', 'sidebar'] as const;
const ATS_FRIENDLY = new Set(['ats', 'classic', 'minimal']);
const COLORS = ['#0f3d3e', '#1e3a8a', '#7c2d12', '#4c1d95', '#111827', '#065f46'];

const UI: Record<Lang, Record<string, string>> = {
  ar: {
    title: 'صانع السيرة الذاتية',
    subtitle: 'املأ بياناتك، اختر قالبًا، ونزّل سيرتك الذاتية PDF. بياناتك لا تغادر جهازك.',
    sample: 'تعبئة بنموذج جاهز',
    clear: 'مسح الكل',
    templates: 'نماذج السيرة الذاتية',
    personal: 'البيانات الشخصية',
    photo: 'صورة شخصية (اختياري)',
    remove: 'إزالة',
    name: 'الاسم الكامل',
    jobTitle: 'المسمى الوظيفي',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    location: 'المدينة / الدولة',
    link: 'رابط (LinkedIn / موقع)',
    summary: 'نبذة مختصرة',
    experience: 'الخبرات العملية',
    addExp: '+ إضافة خبرة',
    education: 'التعليم',
    addEdu: '+ إضافة مؤهل',
    more: 'مهارات وغيرها',
    skills: 'المهارات (افصل بينها بفاصلة)',
    languages: 'اللغات (افصل بينها بفاصلة)',
    certs: 'الشهادات والدورات (كل واحدة في سطر)',
    preview: 'معاينة',
    download: 'تحميل PDF',
    making: 'جارٍ التجهيز…',
    expTitle: 'المسمى',
    expOrg: 'الجهة',
    dates: 'الفترة',
    details: 'المهام والإنجازات (كل نقطة في سطر)',
    degree: 'المؤهل',
    school: 'الجامعة / المعهد',
    confirmClear: 'مسح كل البيانات؟',
    confirmSample: 'استبدال بياناتك الحالية بالنموذج؟',
    tpl_ats: 'ATS (للأنظمة)',
    atsBadge: 'متوافق مع ATS',
    tpl_classic: 'كلاسيكي',
    tpl_sidebar: 'شريط جانبي',
    tpl_minimal: 'بسيط',
    tpl_bold: 'رأس عريض',
    s_profile: 'نبذة',
    s_exp: 'الخبرات',
    s_edu: 'التعليم',
    s_skills: 'المهارات',
    s_langs: 'اللغات',
    s_certs: 'الشهادات والدورات',
    s_contact: 'التواصل',
    yourName: 'اسمك هنا',
  },
  en: {
    title: 'CV Builder',
    subtitle: 'Fill in your details, pick a template, and download your CV as PDF. Your data never leaves your device.',
    sample: 'Fill with a sample',
    clear: 'Clear all',
    templates: 'CV templates',
    personal: 'Personal details',
    photo: 'Photo (optional)',
    remove: 'Remove',
    name: 'Full name',
    jobTitle: 'Job title',
    email: 'Email',
    phone: 'Phone',
    location: 'City / Country',
    link: 'Link (LinkedIn / website)',
    summary: 'Short profile',
    experience: 'Work experience',
    addExp: '+ Add experience',
    education: 'Education',
    addEdu: '+ Add education',
    more: 'Skills & more',
    skills: 'Skills (comma separated)',
    languages: 'Languages (comma separated)',
    certs: 'Certificates & courses (one per line)',
    preview: 'Preview',
    download: 'Download PDF',
    making: 'Preparing…',
    expTitle: 'Title',
    expOrg: 'Company',
    dates: 'Dates',
    details: 'Duties & achievements (one per line)',
    degree: 'Degree',
    school: 'School / University',
    confirmClear: 'Clear all data?',
    confirmSample: 'Replace your current data with the sample?',
    tpl_ats: 'ATS',
    atsBadge: 'ATS friendly',
    tpl_classic: 'Classic',
    tpl_sidebar: 'Sidebar',
    tpl_minimal: 'Minimal',
    tpl_bold: 'Bold header',
    s_profile: 'Profile',
    s_exp: 'Experience',
    s_edu: 'Education',
    s_skills: 'Skills',
    s_langs: 'Languages',
    s_certs: 'Certificates & courses',
    s_contact: 'Contact',
    yourName: 'Your Name',
  },
};

const SAMPLES: Record<Lang, Omit<CV, 'lang' | 'template' | 'color' | 'photo'>> = {
  ar: {
    name: 'محمود بدر',
    jobTitle: 'محاسب تكاليف أول',
    email: 'name@example.com',
    phone: '+20 100 000 0000',
    location: 'القاهرة، مصر',
    link: 'linkedin.com/in/username',
    summary:
      'محاسب تكاليف بخبرة تزيد عن 8 سنوات في قطاع المطاعم والأغذية، متخصص في ضبط تكلفة الطعام وبناء الوصفات المعيارية وتحليل الانحرافات، مع خبرة في أنظمة نقاط البيع والتقارير الإدارية.',
    experience: [
      {
        title: 'محاسب تكاليف أول',
        org: 'مجموعة مطاعم',
        dates: '2021 – حتى الآن',
        details:
          'بناء وصفات معيارية لأكثر من 300 صنف\nخفض تكلفة الطعام بنسبة 4% خلال سنة\nإعداد تقارير شهرية للإدارة عن الربحية',
      },
      {
        title: 'محاسب',
        org: 'شركة أغذية',
        dates: '2017 – 2021',
        details: 'متابعة المخزون والجرد الدوري\nمطابقة فواتير الموردين',
      },
    ],
    education: [
      { degree: 'بكالوريوس تجارة – شعبة محاسبة', school: 'جامعة القاهرة', dates: '2013 – 2017' },
    ],
    skills: 'محاسبة التكاليف, Excel متقدم, تحليل البيانات, أنظمة POS, إعداد التقارير, إدارة المخزون',
    languages: 'العربية (اللغة الأم), الإنجليزية (جيد جدًا)',
    certs: 'شهادة محاسب تكاليف معتمد\nدورة Power BI',
  },
  en: {
    name: 'Mahmoud Badr',
    jobTitle: 'Senior Cost Accountant',
    email: 'name@example.com',
    phone: '+20 100 000 0000',
    location: 'Cairo, Egypt',
    link: 'linkedin.com/in/username',
    summary:
      'Cost accountant with 8+ years in restaurants and food service, focused on food-cost control, standard recipes and variance analysis, with hands-on experience in POS systems and management reporting.',
    experience: [
      {
        title: 'Senior Cost Accountant',
        org: 'Restaurant Group',
        dates: '2021 – Present',
        details:
          'Built standard recipes for 300+ menu items\nCut food cost by 4% within one year\nMonthly profitability reports for management',
      },
      {
        title: 'Accountant',
        org: 'Food Company',
        dates: '2017 – 2021',
        details: 'Inventory control and periodic stock counts\nSupplier invoice reconciliation',
      },
    ],
    education: [
      { degree: 'B.Com, Accounting', school: 'Cairo University', dates: '2013 – 2017' },
    ],
    skills: 'Cost accounting, Advanced Excel, Data analysis, POS systems, Reporting, Inventory management',
    languages: 'Arabic (native), English (very good)',
    certs: 'Certified Cost Accountant\nPower BI course',
  },
};

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;

function emptyCV(lang: Lang): CV {
  return {
    lang,
    template: 'ats',
    color: COLORS[0],
    photo: '',
    name: '',
    jobTitle: '',
    email: '',
    phone: '',
    location: '',
    link: '',
    summary: '',
    experience: [{ title: '', org: '', dates: '', details: '' }],
    education: [{ degree: '', school: '', dates: '' }],
    skills: '',
    languages: '',
    certs: '',
  };
}

function load(lang: Lang): CV {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...emptyCV(lang), ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return emptyCV(lang);
}

function save(): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(cv));
  } catch {
    /* storage unavailable or full (large photo) */
  }
}

const pageLang: Lang = getLanguageFromUrl() === 'ar' ? 'ar' : 'en';
let cv: CV = load(pageLang);

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}
const splitList = (s: string, sep: RegExp) =>
  s.split(sep).map((x) => x.trim()).filter(Boolean);

/* ---------------- CV rendering ---------------- */

function renderCV(data: CV): string {
  const L = UI[data.lang];
  const contact = [data.email, data.phone, data.location, data.link]
    .filter(Boolean)
    .map((c) => `<span>${esc(c)}</span>`)
    .join('');
  const photo = data.photo ? `<img class="cv-photo" src="${data.photo}" alt="" />` : '';
  const name = `<h1 class="cv-name">${esc(data.name || L.yourName)}</h1>`;
  const role = data.jobTitle ? `<p class="cv-role">${esc(data.jobTitle)}</p>` : '';

  const sec = (title: string, body: string) =>
    body ? `<section class="cv-sec"><h2 class="cv-sec-h">${title}</h2>${body}</section>` : '';

  const profile = data.summary ? `<p>${esc(data.summary)}</p>` : '';
  const exp = data.experience
    .filter((e) => e.title || e.org || e.details)
    .map((e) => {
      const pts = splitList(e.details, /\n/);
      return `<div class="cv-entry"><div class="cv-entry-top"><div><span class="cv-entry-title">${esc(e.title)}</span>${
        e.org ? ` <span class="cv-entry-org">· ${esc(e.org)}</span>` : ''
      }</div><span class="cv-entry-date">${esc(e.dates)}</span></div>${
        pts.length ? `<ul class="cv-list">${pts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''
      }</div>`;
    })
    .join('');
  const edu = data.education
    .filter((e) => e.degree || e.school)
    .map(
      (e) =>
        `<div class="cv-entry"><div class="cv-entry-top"><span class="cv-entry-title">${esc(e.degree)}</span><span class="cv-entry-date">${esc(e.dates)}</span></div><div class="cv-entry-org">${esc(e.school)}</div></div>`
    )
    .join('');
  const chips = (s: string) => {
    const items = splitList(s, /[,،\n]/);
    if (data.template === 'ats')
      return items.length ? `<p>${items.map(esc).join(data.lang === 'ar' ? '، ' : ', ')}</p>` : '';
    return items.length
      ? `<div class="cv-chips">${items.map((i) => `<span class="cv-chip">${esc(i)}</span>`).join('')}</div>`
      : '';
  };
  const certsItems = splitList(data.certs, /\n/);
  const certs = certsItems.length
    ? `<ul class="cv-list">${certsItems.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`
    : '';

  const S = {
    profile: sec(L.s_profile, profile),
    exp: sec(L.s_exp, exp),
    edu: sec(L.s_edu, edu),
    skills: sec(L.s_skills, chips(data.skills)),
    langs: sec(L.s_langs, chips(data.languages)),
    certs: sec(L.s_certs, certs),
    contact: sec(L.s_contact, contact ? `<div class="cv-contact">${contact}</div>` : ''),
  };
  const contactRow = contact ? `<div class="cv-contact">${contact}</div>` : '';

  switch (data.template) {
    case 'sidebar':
      return `<aside class="cv-side">${photo}${S.contact}${S.skills}${S.langs}</aside>
        <div class="cv-main">${name}${role}${S.profile}${S.exp}${S.edu}${S.certs}</div>`;
    case 'ats':
      return `<header class="cv-header">${name}${role}${contactRow}</header>
        ${S.profile}${S.exp}${S.edu}${S.skills}${S.langs}${S.certs}`;
    case 'minimal':
      return `<header class="cv-header">${name}${role}${contactRow}</header>
        ${S.profile}${S.exp}${S.edu}${S.skills}${S.langs}${S.certs}`;
    case 'bold':
      return `<header class="cv-header">${photo}<div>${name}${role}${contactRow}</div></header>
        <div class="cv-body"><div>${S.profile}${S.exp}${S.edu}</div><div>${S.skills}${S.langs}${S.certs}</div></div>`;
    default:
      return `<header class="cv-header">${photo}<div>${name}${role}${contactRow}</div></header>
        ${S.profile}${S.exp}${S.edu}${S.skills}${S.langs}${S.certs}`;
  }
}

function paintPaper(el: HTMLElement, data: CV): void {
  el.className = `cv-paper tpl-${data.template}`;
  el.dir = data.lang === 'ar' ? 'rtl' : 'ltr';
  el.lang = data.lang;
  el.style.setProperty('--accent', data.color);
  el.style.setProperty('--accent-soft', data.color + '1a');
  el.innerHTML = renderCV(data);
}

/* ---------------- Form ---------------- */

const form = $<HTMLFormElement>('cvForm');
const simpleFields = ['name', 'jobTitle', 'email', 'phone', 'location', 'link', 'summary', 'skills', 'languages', 'certs'] as const;

function itemHTML(kind: 'experience' | 'education', i: number): string {
  const L = UI[cv.lang];
  const del = `<button type="button" class="cvb-item-del" data-del="${kind}" data-i="${i}" aria-label="${L.remove}">×</button>`;
  if (kind === 'experience') {
    const e = cv.experience[i];
    return `<div class="cvb-item">${del}
      <label><span>${L.expTitle}</span><input data-k="experience" data-i="${i}" data-f="title" value="${esc(e.title)}" /></label>
      <div class="cvb-two">
        <label><span>${L.expOrg}</span><input data-k="experience" data-i="${i}" data-f="org" value="${esc(e.org)}" /></label>
        <label><span>${L.dates}</span><input data-k="experience" data-i="${i}" data-f="dates" value="${esc(e.dates)}" /></label>
      </div>
      <label><span>${L.details}</span><textarea rows="3" data-k="experience" data-i="${i}" data-f="details">${esc(e.details)}</textarea></label>
    </div>`;
  }
  const e = cv.education[i];
  return `<div class="cvb-item">${del}
    <label><span>${L.degree}</span><input data-k="education" data-i="${i}" data-f="degree" value="${esc(e.degree)}" /></label>
    <div class="cvb-two">
      <label><span>${L.school}</span><input data-k="education" data-i="${i}" data-f="school" value="${esc(e.school)}" /></label>
      <label><span>${L.dates}</span><input data-k="education" data-i="${i}" data-f="dates" value="${esc(e.dates)}" /></label>
    </div>
  </div>`;
}

function renderLists(): void {
  $('expList').innerHTML = cv.experience.map((_, i) => itemHTML('experience', i)).join('');
  $('eduList').innerHTML = cv.education.map((_, i) => itemHTML('education', i)).join('');
}

function fillForm(): void {
  for (const f of simpleFields) {
    const el = form.elements.namedItem(f) as HTMLInputElement | null;
    if (el) el.value = cv[f];
  }
  const img = $<HTMLImageElement>('photoPreview');
  img.hidden = !cv.photo;
  if (cv.photo) img.src = cv.photo;
  $('photoRemove').hidden = !cv.photo;
  renderLists();
}

function applyUILanguage(): void {
  const L = UI[cv.lang];
  document.querySelectorAll<HTMLElement>('.cvb [data-t]').forEach((el) => {
    const k = el.dataset.t!;
    if (L[k]) el.textContent = L[k];
  });
  const main = document.querySelector<HTMLElement>('.cvb');
  if (main) main.dir = cv.lang === 'ar' ? 'rtl' : 'ltr';
  form.dir = cv.lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll<HTMLButtonElement>('[data-cvlang]').forEach((b) =>
    b.classList.toggle('on', b.dataset.cvlang === cv.lang)
  );
}

function renderTemplates(): void {
  const L = UI[cv.lang];
  const row = $('tplRow');
  row.innerHTML = '';
  for (const t of TEMPLATES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cvb-tpl' + (cv.template === t ? ' on' : '');
    const thumb = document.createElement('div');
    thumb.className = 'cvb-tpl-thumb';
    const paper = document.createElement('div');
    const base = cv.name ? cv : { ...cv, ...SAMPLES[cv.lang] };
    paintPaper(paper, { ...base, template: t });
    thumb.appendChild(paper);
    btn.appendChild(thumb);
    btn.append(L[`tpl_${t}`]);
    if (ATS_FRIENDLY.has(t)) {
      const badge = document.createElement('span');
      badge.className = 'cvb-ats';
      badge.textContent = L.atsBadge;
      btn.appendChild(badge);
    }
    btn.addEventListener('click', () => {
      cv.template = t;
      update(true);
    });
    row.appendChild(btn);
  }
  const colors = $('colorRow');
  colors.innerHTML = '';
  for (const c of COLORS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.background = c;
    b.className = cv.color === c ? 'on' : '';
    b.setAttribute('aria-label', c);
    b.addEventListener('click', () => {
      cv.color = c;
      update(true);
    });
    colors.appendChild(b);
  }
}

function fitPreview(): void {
  const scroller = $('paperScroller');
  const scale = $('paperScale');
  const avail = scroller.clientWidth - 24;
  const s = Math.min(1, avail / 794);
  scale.style.transform = `scale(${s})`;
  const paper = $('cvPaper');
  scale.style.height = paper.offsetHeight * s + 'px';
  scale.style.width = 794 * s + 'px';
}

let tplTimer = 0;
function update(refreshTemplates = false): void {
  paintPaper($('cvPaper'), cv);
  fitPreview();
  save();
  window.clearTimeout(tplTimer);
  if (refreshTemplates) renderTemplates();
  else tplTimer = window.setTimeout(renderTemplates, 600);
}

form.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.k) {
    const list = cv[t.dataset.k as 'experience' | 'education'] as unknown as Record<string, string>[];
    list[Number(t.dataset.i)][t.dataset.f!] = t.value;
  } else if ((simpleFields as readonly string[]).includes(t.name)) {
    (cv as unknown as Record<string, string>)[t.name] = t.value;
  }
  update();
});

form.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const add = t.closest<HTMLElement>('[data-add]')?.dataset.add;
  if (add === 'experience') cv.experience.push({ title: '', org: '', dates: '', details: '' });
  if (add === 'education') cv.education.push({ degree: '', school: '', dates: '' });
  const del = t.closest<HTMLElement>('[data-del]');
  if (del) {
    const k = del.dataset.del as 'experience' | 'education';
    (cv[k] as unknown[]).splice(Number(del.dataset.i), 1);
  }
  if (add || del) {
    renderLists();
    update();
  }
});

$<HTMLInputElement>('photoInput').addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    const size = 320;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const m = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size);
    cv.photo = c.toDataURL('image/jpeg', 0.85);
    URL.revokeObjectURL(img.src);
    fillForm();
    update(true);
  };
  img.src = URL.createObjectURL(file);
});
$('photoRemove').addEventListener('click', () => {
  cv.photo = '';
  fillForm();
  update(true);
});

document.querySelectorAll<HTMLButtonElement>('[data-cvlang]').forEach((b) =>
  b.addEventListener('click', () => {
    cv.lang = b.dataset.cvlang as Lang;
    applyUILanguage();
    renderLists();
    update(true);
  })
);

$('cvSample').addEventListener('click', () => {
  const hasData = cv.name || cv.summary;
  if (hasData && !confirm(UI[cv.lang].confirmSample)) return;
  cv = { ...cv, ...structuredClone(SAMPLES[cv.lang]) };
  fillForm();
  update(true);
});
$('cvClear').addEventListener('click', () => {
  if (!confirm(UI[cv.lang].confirmClear)) return;
  cv = { ...emptyCV(cv.lang), template: cv.template, color: cv.color };
  fillForm();
  update(true);
});

/* ---------------- PDF export ---------------- */

// Real-text PDF via the browser's "Save as PDF": text stays selectable and
// searchable (ATS-readable), Arabic shaping and template fonts are preserved.
function printPDF(): void {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0;';
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')]
    .map((n) => n.outerHTML)
    .join('');
  const paper = document.createElement('div');
  paintPaper(paper, cv);
  const title = esc((cv.name || 'CV') + ' - CV');
  doc.open();
  doc.write(`<!doctype html><html lang="${cv.lang}" dir="${paper.dir}"><head><meta charset="utf-8"><title>${title}</title>${styles}
    <style>@page{size:A4;margin:0}html,body{margin:0;background:#fff}
    .cv-paper{box-shadow:none!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .cv-entry,.cv-sec-h{break-inside:avoid}</style></head><body>${paper.outerHTML}</body></html>`);
  doc.close();
  const go = async () => {
    try {
      await doc.fonts?.ready;
    } catch {
      /* ignore */
    }
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
    setTimeout(() => frame.remove(), 60000);
  };
  if (doc.readyState === 'complete') setTimeout(go, 300);
  else frame.addEventListener('load', () => setTimeout(go, 300));
}

// Inside the Android app the WebView cannot print, so build the PDF here.
async function imagePDF(): Promise<void> {
  const btn = $<HTMLButtonElement>('cvDownload');
  const L = UI[cv.lang];
  btn.disabled = true;
  btn.textContent = L.making;
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;';
  const paper = document.createElement('div');
  paintPaper(paper, cv);
  paper.style.boxShadow = 'none';
  holder.appendChild(paper);
  document.body.appendChild(holder);
  try {
    await document.fonts.ready;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    const canvas = await html2canvas(paper, { scale: 2.5, backgroundColor: '#ffffff', windowWidth: 794 });
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const pagePx = Math.round((canvas.width * ph) / pw);
    for (let y = 0, n = 0; y < canvas.height - 4; y += pagePx, n++) {
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = Math.min(pagePx, canvas.height - y);
      const sctx = slice.getContext('2d')!;
      sctx.fillStyle = '#fff';
      sctx.fillRect(0, 0, slice.width, slice.height);
      sctx.drawImage(canvas, 0, -y);
      if (n > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pw, (slice.height * pw) / slice.width);
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(pdf.output('blob'));
    a.download = `${(cv.name || 'CV').trim().replace(/\s+/g, '-')}-CV.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    console.error('CV export failed', err);
    alert(cv.lang === 'ar' ? 'تعذّر إنشاء الملف، حاول مرة أخرى.' : 'Could not create the PDF. Please try again.');
  } finally {
    holder.remove();
    btn.disabled = false;
    btn.textContent = L.download;
  }
}

function downloadPDF(): void {
  if (Capacitor.isNativePlatform()) void imagePDF();
  else printPDF();
}
$('cvDownload').addEventListener('click', downloadPDF);

/* ---------------- Init ---------------- */
applyUILanguage();
fillForm();
update(true);
window.addEventListener('resize', fitPreview);
