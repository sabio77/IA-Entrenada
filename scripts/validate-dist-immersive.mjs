import { readFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const distRoot = path.join(root, 'dist');
const failures = [];
const PUBLIC_SITE_URL = 'https://ia-col.com/';
const GUIDE_BASELINE = {
  distFiles: 132,
  seoItems: 47,
  sections: 234,
  faqs: 214,
  terms: 170
};

function assert(ok, msg) {
  if (!ok) failures.push(msg);
}

async function exists(relPath) {
  try {
    await stat(path.join(root, relPath));
    return true;
  } catch {
    return false;
  }
}

async function readText(relPath) {
  return readFile(path.join(root, relPath), 'utf8');
}

async function readJson(relPath) {
  return JSON.parse(await readText(relPath));
}

async function walk(relDir) {
  const absolute = path.join(root, relDir);
  const out = [];
  async function rec(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const rel = path.relative(root, full).replace(/\\/g, '/');
      if (entry.isDirectory()) await rec(full);
      else out.push(rel);
    }
  }
  try { await rec(absolute); } catch {}
  return out;
}

function normalizeUrlPath(url = '/') {
  const clean = String(url || '/').trim().replace(/^https?:\/\/[^/]+/i, '') || '/';
  const withSlash = clean.startsWith('/') ? clean : `/${clean}`;
  return withSlash.endsWith('/') ? withSlash : `${withSlash}/`;
}

function seoPagePath(url = '/') {
  const normalized = normalizeUrlPath(url).replace(/^\//, '');
  return `dist/${normalized}index.html`;
}

function stripTags(value = '') {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countStaticDd(html = '', className = '') {
  const index = html.indexOf(className);
  if (index < 0) return 0;
  const fragment = html.slice(index, html.indexOf('</dl>', index) > index ? html.indexOf('</dl>', index) : undefined);
  return (fragment.match(/<dd\b/gi) || []).length;
}

function containsAll(text = '', needles = []) {
  const lower = String(text || '').toLowerCase();
  return needles.every((needle) => lower.includes(String(needle).toLowerCase()));
}

const requiredFiles = [
  'dist/index.html',
  'dist/404.html',
  'dist/robots.txt',
  'dist/sitemap.xml',
  'dist/page-sitemap.xml',
  'dist/llms.txt',
  'dist/render.yaml',
  'dist/textX/es.json',
  'dist/textX/en.json',
  'dist/textX/languages.json',
  'dist/textX/seo/es.json',
  'dist/textX/seo/en.json',
  'dist/.well-known/memoriabackend-domain-verification.txt'
];
for (const file of requiredFiles) assert(await exists(file), `Falta ${file}`);

const distFiles = await walk('dist');
const htmlFiles = distFiles.filter((file) => file.endsWith('.html'));
assert(distFiles.length > GUIDE_BASELINE.distFiles, `dist debe superar a web_guia_xeUpEbn en cobertura estática: ${distFiles.length} <= ${GUIDE_BASELINE.distFiles}`);
assert(htmlFiles.length >= 108, 'dist debe generar home, hubs, 404 y páginas SEO bilingües suficientes');

const index = await readText('dist/index.html');
const robots = await readText('dist/robots.txt');
const sitemap = await readText('dist/sitemap.xml');
const pageSitemap = await readText('dist/page-sitemap.xml');
const llms = await readText('dist/llms.txt');
const render = await readText('dist/render.yaml');
const js = await readText('dist/js/hashinmy-immersive.js');
const verification = await readText('dist/.well-known/memoriabackend-domain-verification.txt');
const es = await readJson('dist/textX/es.json');
const en = await readJson('dist/textX/en.json');
const languages = await readJson('dist/textX/languages.json');
const seoEs = await readJson('dist/textX/seo/es.json');
const seoEn = await readJson('dist/textX/seo/en.json');

assert(index.includes('IA Colombia') && index.includes(PUBLIC_SITE_URL), 'dist/index.html debe estar hidratado con IA Colombia y dominio ia-col.com');
assert(index.includes('<span>IA</span>') && !index.includes('<span>HM</span>'), 'dist/index.html debe usar fallback geométrico IA, no HM');
assert(index.includes('https://mapsx.app/chat-ia'), 'dist/index.html debe conservar integración Chat-IA heredada');
assert(js.includes("const PUBLIC_SITE_URL = 'https://ia-col.com/';"), 'JS distribuido debe usar PUBLIC_SITE_URL ia-col.com');
assert(js.includes("const CONTACT_EMAIL = 'contacto@ia-col.com';"), 'JS distribuido debe conservar contacto ia-col.com');
assert(js.includes('entry?.q') && js.includes('entry?.a') && js.includes('entry?.definition'), 'JS distribuido debe renderizar claves SEO q/a/definition del proyecto actual');
assert(verification.includes('memoriaBACKEND-domain-verification='), 'dist debe publicar verificación memoriaBACKEND');

for (const file of htmlFiles) {
  const html = await readText(file);
  assert(!html.includes('hashinmy.com'), `${file} conserva dominio heredado hashinmy.com`);
  assert(!html.includes('Hashinmy'), `${file} conserva marca visible heredada Hashinmy`);
  assert(!html.includes('<span>HM</span>'), `${file} conserva fallback visual HM heredado de la guía`);
  assert(html.includes('IA Colombia'), `${file} debe conservar marca IA Colombia`);
  if (!file.endsWith('404.html')) {
    assert(html.includes('ia-col.com'), `${file} debe conservar dominio canónico ia-col.com`);
  }
}

const languageCodes = (languages.languages || languages.items || languages || []).map((entry) => String(entry.code || entry.iso || '').toLowerCase()).filter(Boolean);
assert(languageCodes.length === 2 && languageCodes.includes('es') && languageCodes.includes('en'), 'dist debe manejar exactamente 2 idiomas: español e inglés');
for (const [code, bundle] of [['es', es], ['en', en]]) {
  assert(bundle.meta?.applicationName === 'IA Colombia', `textX/${code}.json debe estar adaptado a IA Colombia`);
  assert(bundle.meta?.description?.toLowerCase().includes('online') && bundle.meta?.description?.toLowerCase().includes('offline'), `textX/${code}.json debe explicar operación online/offline`);
  assert(Array.isArray(bundle.services) && bundle.services.length >= 6, `textX/${code}.json debe conservar servicios interactivos`);
  for (const scene of ['intro', 'serviceFamily', 'buildType', 'automationType', 'modernization', 'operation', 'value', 'risk', 'finance', 'timeline', 'summary']) {
    assert(bundle.scenes?.[scene]?.title, `textX/${code}.json falta escena ${scene}`);
  }
}

for (const [code, seo] of [['es', seoEs], ['en', seoEn]]) {
  const sectionTotal = seo.items.reduce((sum, item) => sum + (Array.isArray(item.sections) ? item.sections.length : 0), 0);
  const faqTotal = seo.items.reduce((sum, item) => sum + (Array.isArray(item.faqs) ? item.faqs.length : 0), 0);
  const termTotal = seo.items.reduce((sum, item) => sum + (Array.isArray(item.terms) ? item.terms.length : 0), 0);
  assert(seo.items.length > GUIDE_BASELINE.seoItems, `SEO ${code} debe superar cantidad de fichas de la guía`);
  assert(sectionTotal > GUIDE_BASELINE.sections, `SEO ${code} debe superar profundidad de secciones de la guía`);
  assert(faqTotal > GUIDE_BASELINE.faqs, `SEO ${code} debe superar profundidad de FAQs de la guía`);
  assert(termTotal > GUIDE_BASELINE.terms, `SEO ${code} debe superar profundidad de glosario de la guía`);
  assert(Array.isArray(seo.categories) && seo.categories.length >= 6, `SEO ${code} debe conservar mínimo 6 categorías`);
  for (const item of seo.items) {
    assert(item.id && item.url && item.title && item.metaDescription, `SEO ${code} tiene ficha incompleta`);
    assert(Array.isArray(item.sections) && item.sections.length >= 6, `SEO ${code}/${item.id} debe tener al menos 6 secciones`);
    assert(Array.isArray(item.faqs) && item.faqs.length >= 5, `SEO ${code}/${item.id} debe tener al menos 5 FAQs en JSON`);
    assert(Array.isArray(item.terms) && item.terms.length >= 4, `SEO ${code}/${item.id} debe tener al menos 4 términos en JSON`);
  }
}

const seoEsIds = new Set(seoEs.items.map((item) => item.id));
const seoEnIds = new Set(seoEn.items.map((item) => item.id));
assert(seoEs.items.length === seoEn.items.length, 'SEO debe conservar paridad de fichas entre español e inglés');
assert([...seoEsIds].every((id) => seoEnIds.has(id)) && [...seoEnIds].every((id) => seoEsIds.has(id)), 'SEO debe conservar paridad exacta de IDs entre idiomas');

for (const [code, seo, hubPath, otherHubPath] of [
  ['es', seoEs, '/es/soluciones/', '/en/solutions/'],
  ['en', seoEn, '/en/solutions/', '/es/soluciones/']
]) {
  const hubFile = seoPagePath(hubPath);
  assert(await exists(hubFile), `Falta hub SEO ${hubPath}`);
  const hubHtml = await readText(hubFile);
  assert(hubHtml.includes('CollectionPage') && hubHtml.includes('ItemList'), `${hubFile} debe conservar schemas CollectionPage e ItemList`);
  assert(hubHtml.includes(`rel="canonical" href="${PUBLIC_SITE_URL.slice(0, -1)}${hubPath}"`), `${hubFile} debe tener canonical correcto`);
  assert(hubHtml.includes(`href="${PUBLIC_SITE_URL.slice(0, -1)}${otherHubPath}"`), `${hubFile} debe tener alternates bilingües`);
  assert((hubHtml.match(/hm-seo-static-page__solution/g) || []).length >= seo.items.length, `${hubFile} debe listar todas las fichas SEO del idioma`);

  for (const item of seo.items) {
    const itemUrl = normalizeUrlPath(item.url);
    const file = seoPagePath(itemUrl);
    assert(await exists(file), `Falta página SEO estática ${itemUrl}`);
    const html = await readText(file);
    const cleanTitle = stripTags(item.title);
    const cleanDescription = stripTags(item.metaDescription || item.summary);
    assert(html.includes(`<html lang="${code}`) || html.includes(`lang="${code}`), `${file} debe declarar idioma ${code}`);
    assert(html.includes(`rel="canonical" href="${PUBLIC_SITE_URL.slice(0, -1)}${itemUrl}"`), `${file} debe tener canonical correcto`);
    assert(html.includes(`property="og:url" content="${PUBLIC_SITE_URL.slice(0, -1)}${itemUrl}"`), `${file} debe tener og:url correcto`);
    assert(html.includes(`<h1>${cleanTitle}</h1>`), `${file} debe renderizar H1 de la ficha`);
    assert(cleanDescription && html.includes(cleanDescription.slice(0, Math.min(80, cleanDescription.length))), `${file} debe renderizar descripción SEO`);
    assert(html.includes('BreadcrumbList') && html.includes('TechArticle') && html.includes('OfferCatalog'), `${file} debe conservar BreadcrumbList, TechArticle y OfferCatalog`);
    assert(html.includes('FAQPage') && html.includes('DefinedTermSet'), `${file} debe publicar FAQPage y DefinedTermSet`);
    assert(html.includes('hm-seo-static-page__guide'), `${file} debe renderizar guía visible`);
    assert(countStaticDd(html, 'hm-seo-static-page__terms') >= 4, `${file} debe renderizar glosario visible con al menos 4 términos`);
    assert(countStaticDd(html, 'hm-seo-static-page__faq') >= 2, `${file} debe renderizar FAQs visibles desde q/a`);
  }
}

for (const id of [
  'ia-entrenada-empresas',
  'guia-completa-ia-colombia-web-vieja',
  'chat-ia-para-webs',
  'ia-offline-empresas',
  'ia-online-nube',
  'ia-center-plataforma-comercial',
  'lexia-ia-legal',
  'omnia-ia-autoentrenable',
  'postai-api-analitica',
  'reentrenamiento-automatico-ia',
  'ia-capacitacion-empresarial',
  'ia-retencion-conocimiento-rotacion-personal',
  'ia-procesos-criticos-empresariales',
  'ia-apps-webs-software-empresarial',
  'ia-produccion-industrial-sin-internet',
  'implementacion-ia-en-sitio-videollamada',
  'ia-diagnostico-clasificacion-prediccion',
  'ia-automatizacion-ventas-atencion-24-7',
  'planes-despliegue-ia-colombia'
]) {
  assert(seoEsIds.has(id) && seoEnIds.has(id), `Falta ficha SEO bilingüe obligatoria ${id}`);
}

assert(robots.includes('https://ia-col.com/sitemap.xml') && robots.includes('https://ia-col.com/page-sitemap.xml'), 'robots.txt debe publicar ambos sitemaps del dominio');
assert(sitemap.includes('https://ia-col.com/es/') && sitemap.includes('https://ia-col.com/en/'), 'sitemap.xml debe publicar homes bilingües');
assert(pageSitemap.includes('https://ia-col.com/es/soluciones/ia-entrenada-empresas/') && pageSitemap.includes('https://ia-col.com/en/solutions/ia-entrenada-empresas/'), 'page-sitemap.xml debe publicar fichas SEO bilingües');
for (const item of [...seoEs.items, ...seoEn.items]) {
  const url = `${PUBLIC_SITE_URL.slice(0, -1)}${normalizeUrlPath(item.url)}`;
  assert(pageSitemap.includes(url), `page-sitemap.xml no incluye ${url}`);
  assert(llms.includes(url), `llms.txt no incluye ${url}`);
}

for (const renderNeedle of [
  'staticPublishPath: ./dist',
  'source: /index.html',
  'source: /index2.html',
  'source: /img/IA-Colombia.webp',
  'destination: /assets/ia-colombia-logo.png',
  'source: /soluciones/*',
  'destination: /es/soluciones/:splat',
  'source: /solutions/*',
  'destination: /en/solutions/:splat',
  'path: /css/*',
  'path: /js/*',
  'path: /textX/*.json',
  'path: /textX/seo/*.json',
  'public, max-age=300, must-revalidate',
  'no-store, no-cache, must-revalidate'
]) assert(render.includes(renderNeedle), `dist/render.yaml sin regla robusta: ${renderNeedle}`);

const distAssetFiles = distFiles.filter((file) => file.startsWith('dist/assets/'));
for (const file of distAssetFiles) {
  assert(file.endsWith('.txt') || file.endsWith('.json'), `assets no debe incluir imagen binaria en esta iteración: ${file}`);
}
const promptFiles = distAssetFiles.filter((file) => /\.(png|webp|jpe?g)\.txt$/i.test(file));
assert(promptFiles.length >= 9, 'dist/assets debe conservar prompts visuales suficientes para logo y escenas, sin binarios');
for (const file of promptFiles) {
  const prompt = await readJson(file);
  assert(prompt.asset && prompt.prompt && prompt.fallback_behavior, `${file} debe ser JSON de prompt visual con asset, prompt y fallback_behavior`);
  assert(String(prompt.fallback_behavior).toLowerCase().includes('figura geométrica') || String(prompt.fallback_behavior).toLowerCase().includes('geometric'), `${file} debe declarar fallback geométrico`);
}

const legacyCoverageText = [index, js, JSON.stringify(es), JSON.stringify(en), JSON.stringify(seoEs), JSON.stringify(seoEn), robots, sitemap, pageSitemap, llms].join('\n').toLowerCase();
for (const term of [
  'ia webs', 'atención 24/7', '24/7 service', 'sin mensualidades', 'without external subscriptions', 'una sola compra', 'one purchase',
  'líneas de producción', 'production lines', 'rotación de personal', 'staff rotation', 'videollamada', 'video-call', 'personal técnico especializado', 'specialized technical staff',
  'solicitudes post', 'post requests', 'gestión de riesgos', 'risk management', 'cifrado completo', 'full encryption', 'entidades estatales', 'state entities',
  'privacidad total', 'total privacy', 'precios e información de productos', 'product prices and information', 'tus propios servidores', 'your own servers',
  'bajo tu marca', 'under your own brand', 'gpu y cpu', 'gpu and cpu', 'miles de solicitudes simultáneamente', 'thousands of simultaneous requests',
  'ia disponible desde 10.000 usd', 'ai available from 10,000 usd', 'soporte técnico inicial', 'initial technical support', 'software adicional', 'additional software',
  'servidor especializado ia', 'specialized ai server', 'pequeñas empresas', 'small companies', 'grandes corporaciones', 'large corporations',
  'asesoramiento personalizado', 'personalized advice', 'soluciones de ia a tu medida', 'tailored ai solutions', 'información comercial, técnica', 'commercial, technical',
  'automatizar ventas, atención y procesos críticos', 'automate sales, service and critical processes', 'respuestas hiper-relevantes', 'hyper-relevant answers',
  'operación online', 'online operation', 'sistema de reentrenamiento automático', 'automatic retraining system', 'desarrollo local por ia colombia', 'local development by ia colombia',
  'tipo de ia y cómo ganar dinero usándola', 'type of ai and how to make money using it', 'asistencia técnica inteligente para plantas de producción sin conexión a internet',
  'intelligent technical assistance for production plants without internet', 'generar ingresos mediante suscripciones o planes de acceso', 'generate revenue through subscriptions or access plans',
  'bufetes de abogados, consultores jurídicos y departamentos legales', 'law firms, legal consultants and legal departments', 'aprender de cualquier entorno, industria o conocimiento humano',
  'learn from any environment, industry or human knowledge', 'procesar y analizar información recibida a través de solicitudes post', 'processes and analyzes information received through post requests',
  'sin necesidad de interfaces visuales ni complejas integraciones', 'without needing visual interfaces or complex integrations', 'reduce carga humana', 'reduces human workload',
  'apis estándar', 'standard apis', 'webhooks en tiempo real', 'real-time webhooks', 'mejora la conversión al atender usuarios 24/7', 'improves conversion by serving users 24/7',
  'forma de contactar a la empresa o vendedor', 'contact the company or seller', 'ia offline es una inteligencia artificial de uso privado', 'private offline ai',
  'compatible con modelos locales y en la nube', 'compatible with local and cloud models', 'crear startups o negocios basados en ia', 'create startups or ai-based businesses',
  'nuestro chat-ia está disponible', 'our chat-ai is available'
]) assert(legacyCoverageText.includes(term), `dist sin cobertura heredada de web vieja: ${term}`);

if (failures.length) {
  console.error(failures.map((failure) => `• ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Dist IA Colombia validado: ${distFiles.length} archivos, ${htmlFiles.length} HTML, ${seoEs.items.length} fichas SEO bilingües con FAQ/glosario visible y schema enriquecido.`);
