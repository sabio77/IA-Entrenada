import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const failures = [];
async function exists(p){ try { await stat(path.join(root,p)); return true; } catch { return false; } }
function assert(ok,msg){ if(!ok) failures.push(msg); }
async function json(p){ return JSON.parse(await readFile(path.join(root,p),'utf8')); }
async function walk(dir){ const out=[]; async function rec(d){ for(const e of await readdir(path.join(root,d),{withFileTypes:true})){ const r=path.join(d,e.name).replace(/\\/g,'/'); if(e.isDirectory()) await rec(r); else out.push(r); } } await rec(dir); return out; }
const required=['index.html','css/hashinmy-immersive.css','css/hashinmy-classic.css','js/hashinmy-immersive.js','textX/es.json','textX/en.json','textX/seo/es.json','textX/seo/en.json','robots.txt','llms.txt','render.yaml','package.json','mapsx.txt','page-sitemap.xml','.well-known/memoriabackend-domain-verification.txt'];
for (const file of required) assert(await exists(file), `Falta ${file}`);
const index = await readFile(path.join(root,'index.html'),'utf8');
assert(index.includes('https://ia-col.com/'), 'index.html debe usar dominio canonico ia-col.com');
assert(index.includes('data-i18n-text') && index.includes('hmSeoHub'), 'index.html debe conservar i18n runtime y hub SEO de la guia');
assert(index.includes('https://mapsx.app/chat-ia'), 'index.html debe conservar integracion Chat-IA heredada');
for (const schemaTerm of ['CollectionPage','BreadcrumbList','ItemList','planes-despliegue-ia-colombia','IA Colombia | IA entrenada para empresas online y offline']) assert(index.includes(schemaTerm), `index.html debe superar la guia con schema SEO fuente enriquecido: falta ${schemaTerm}`);
const js = await readFile(path.join(root,'js/hashinmy-immersive.js'),'utf8');
assert(js.includes("const PUBLIC_SITE_URL = 'https://ia-col.com/';"), 'JS debe usar PUBLIC_SITE_URL ia-col.com');
assert(js.includes("const CONTACT_EMAIL = 'contacto@ia-col.com';"), 'JS debe enviar fallback a contacto@ia-col.com');
assert(js.includes('ia-scene-01-trained-ai.png') && js.includes('ia-scene-08-roadmap-deploy.png'), 'JS debe referenciar prompts visuales IA Colombia');
assert(js.includes("const PROOF_LOGO_PLACEHOLDER_INITIALS = 'IA';") && !js.includes("initials.textContent = 'HM'") && !js.includes("return 'HM'"), 'JS no debe conservar fallback visual heredado HM; debe usar IA Colombia');
const buildScript = await readFile(path.join(root,'scripts/build-immersive.mjs'),'utf8');
assert(buildScript.includes("const PROOF_LOGO_PLACEHOLDER_INITIALS = 'IA';") && !buildScript.includes('<span>HM</span>') && !buildScript.includes("|| 'HM'"), 'Build estático no debe generar iniciales HM heredadas de la guía');
for (const [moduleName, moduleText] of [['js/hashinmy-immersive.js', js], ['scripts/build-immersive.mjs', buildScript]]) {
  assert(moduleText.includes('entry?.q') && moduleText.includes('entry?.a'), `${moduleName} debe aceptar FAQs SEO con claves q/a del proyecto actual`);
  assert(moduleText.includes('entry?.definition') && moduleText.includes('getSeoTermMeaning'), `${moduleName} debe aceptar glosario SEO con clave definition del proyecto actual`);
  assert(moduleText.includes('DefinedTermSet') && moduleText.includes('FAQPage'), `${moduleName} debe conservar schemas SEO de FAQPage y DefinedTermSet`);
}
const es = await json('textX/es.json');
const en = await json('textX/en.json');
assert(es.meta.applicationName==='IA Colombia' && en.meta.applicationName==='IA Colombia', 'textX debe estar adaptado a IA Colombia');
const requiredRuntimeScenes = ['intro','serviceFamily','buildType','automationType','modernization','operation','value','risk','finance','timeline','summary'];
for (const bundle of [es,en]) {
  assert(bundle.services?.length>=6, 'Debe haber al menos 6 servicios interactivos');
  for (const name of requiredRuntimeScenes) {
    const scene = bundle.scenes?.[name];
    assert(scene?.title, `Falta escena ${name}`);
    assert(scene?.copy, `Falta copy runtime en escena ${name}`);
    assert(scene?.progress, `Falta progress runtime en escena ${name}; sin este campo la inicialización JS rechaza el bundle y la web queda sin opciones`);
    assert(Array.isArray(scene?.options) || name === 'summary', `Faltan opciones runtime en escena ${name}`);
  }
}
const seoEs = await json('textX/seo/es.json');
const seoEn = await json('textX/seo/en.json');
assert(seoEs.items.length>=52 && seoEn.items.length===seoEs.items.length, 'SEO debe superar la guia con al menos 52 fichas y paridad es/en');
assert(seoEs.categories.length>=6 && seoEn.categories.length>=6, 'SEO debe tener al menos 6 categorias por idioma');
const seoEsIds = new Set(seoEs.items.map((item) => item.id));
const seoEnIds = new Set(seoEn.items.map((item) => item.id));
assert(seoEs.items.every((item) => seoEnIds.has(item.id)) && seoEn.items.every((item) => seoEsIds.has(item.id)), 'SEO bilingüe debe conservar paridad exacta de IDs entre español e inglés');
const seoTotals = { esSections: 0, enSections: 0, esFaqs: 0, enFaqs: 0, esTerms: 0, enTerms: 0 };
for (const item of seoEs.items) {
  const sections = Array.isArray(item.sections) ? item.sections : [];
  const faqs = Array.isArray(item.faqs) ? item.faqs : [];
  const terms = Array.isArray(item.terms) ? item.terms : [];
  seoTotals.esSections += sections.length;
  seoTotals.esFaqs += faqs.length;
  seoTotals.esTerms += terms.length;
  assert(sections.length>=6, `Ficha SEO ES ${item.id} debe tener al menos 6 secciones enriquecidas para superar la guia`);
  assert(faqs.length>=5, `Ficha SEO ES ${item.id} debe tener al menos 5 FAQs para superar la guia`);
  assert(terms.length>=4, `Ficha SEO ES ${item.id} debe tener al menos 4 terminos/glosario para superar la guia`);
}
for (const item of seoEn.items) {
  const sections = Array.isArray(item.sections) ? item.sections : [];
  const faqs = Array.isArray(item.faqs) ? item.faqs : [];
  const terms = Array.isArray(item.terms) ? item.terms : [];
  seoTotals.enSections += sections.length;
  seoTotals.enFaqs += faqs.length;
  seoTotals.enTerms += terms.length;
  assert(sections.length>=6, `Ficha SEO EN ${item.id} debe tener al menos 6 secciones enriquecidas para superar la guia`);
  assert(faqs.length>=5, `Ficha SEO EN ${item.id} debe tener al menos 5 FAQs para superar la guia`);
  assert(terms.length>=4, `Ficha SEO EN ${item.id} debe tener al menos 4 terminos/glosario para superar la guia`);
}
assert(seoTotals.esSections>=312 && seoTotals.enSections>=312 && seoTotals.esFaqs>=260 && seoTotals.enFaqs>=260 && seoTotals.esTerms>=208 && seoTotals.enTerms>=208, 'SEO debe superar la guia no solo por numero de fichas, tambien por profundidad total de secciones, FAQs y glosario');
for (const id of ['ia-entrenada-empresas','guia-completa-ia-colombia-web-vieja','chat-ia-para-webs','ia-offline-empresas','ia-online-nube','ia-center-plataforma-comercial','lexia-ia-legal','omnia-ia-autoentrenable','postai-api-analitica','reentrenamiento-automatico-ia','ia-capacitacion-empresarial','ia-retencion-conocimiento-rotacion-personal','ia-procesos-criticos-empresariales','ia-apps-webs-software-empresarial','ia-produccion-industrial-sin-internet','implementacion-ia-en-sitio-videollamada','ia-diagnostico-clasificacion-prediccion','ia-automatizacion-ventas-atencion-24-7','planes-despliegue-ia-colombia']) assert(seoEs.items.some(i=>i.id===id), `Falta ficha SEO ${id}`);
const robots = await readFile(path.join(root,'robots.txt'),'utf8');
assert(robots.includes('https://ia-col.com/sitemap.xml'), 'robots debe apuntar al sitemap del dominio');
const render = await readFile(path.join(root,'render.yaml'),'utf8');
for (const renderNeedle of ['staticPublishPath: ./dist','source: /index.html','source: /index2.html','source: /img/IA-Colombia.webp','destination: /assets/ia-colombia-logo.png','source: /soluciones/*','destination: /es/soluciones/:splat','source: /solutions/*','destination: /en/solutions/:splat','path: /css/*','path: /js/*','path: /textX/*.json','path: /textX/seo/*.json','public, max-age=300, must-revalidate','no-store, no-cache, must-revalidate']) assert(render.includes(renderNeedle), `render.yaml debe conservar cache, headers y redirecciones superiores a la guia: falta ${renderNeedle}`);
const pageSitemap = await readFile(path.join(root,'page-sitemap.xml'),'utf8');
assert(pageSitemap.includes('https://ia-col.com/es/soluciones/ia-entrenada-empresas/') && pageSitemap.includes('https://ia-col.com/en/solutions/ia-entrenada-empresas/') && pageSitemap.includes('https://ia-col.com/es/comercial/planes-despliegue-ia-colombia/'), 'page-sitemap.xml debe publicar fichas SEO bilingües y la ficha comercial heredada de planes');

const legacyCoverageText = [index, js, JSON.stringify(es), JSON.stringify(en), JSON.stringify(seoEs), JSON.stringify(seoEn), robots].join('\n').toLowerCase();
for (const term of ['ia webs','atención 24/7','24/7 service','sin mensualidades','without external subscriptions','una sola compra','one purchase','líneas de producción','production lines','rotación de personal','staff rotation','videollamada','video-call','personal técnico especializado','specialized technical staff','solicitudes post','post requests','gestión de riesgos','risk management','cifrado completo','full encryption','entidades estatales','state entities','privacidad total','total privacy','precios e información de productos','product prices and information','tus propios servidores','your own servers','bajo tu marca','under your own brand','gpu y cpu','gpu and cpu','miles de solicitudes simultáneamente','thousands of simultaneous requests','ia disponible desde 10.000 usd','ai available from 10,000 usd','soporte técnico inicial','initial technical support','software adicional','additional software','servidor especializado ia','specialized ai server','pequeñas empresas','small companies','grandes corporaciones','large corporations','asesoramiento personalizado','personalized advice','soluciones de ia a tu medida','tailored ai solutions','información comercial, técnica','commercial, technical','automatizar ventas, atención y procesos críticos','automate sales, service and critical processes','respuestas hiper-relevantes','hyper-relevant answers','operación online','online operation','sistema de reentrenamiento automático','automatic retraining system','desarrollo local por ia colombia','local development by ia colombia','tipo de ia y cómo ganar dinero usándola','type of ai and how to make money using it','asistencia técnica inteligente para plantas de producción sin conexión a internet','intelligent technical assistance for production plants without internet','generar ingresos mediante suscripciones o planes de acceso','generate revenue through subscriptions or access plans','bufetes de abogados, consultores jurídicos y departamentos legales','law firms, legal consultants and legal departments','aprender de cualquier entorno, industria o conocimiento humano','learn from any environment, industry or human knowledge','procesar y analizar información recibida a través de solicitudes post','processes and analyzes information received through post requests','sin necesidad de interfaces visuales ni complejas integraciones','without needing visual interfaces or complex integrations','reduce carga humana','reduces human workload','apis estándar','standard apis','webhooks en tiempo real','real-time webhooks','mejora la conversión al atender usuarios 24/7','improves conversion by serving users 24/7','forma de contactar a la empresa o vendedor','contact the company or seller','ia offline es una inteligencia artificial de uso privado','private offline ai','compatible con modelos locales y en la nube','compatible with local and cloud models','crear startups o negocios basados en ia','create startups or ai-based businesses','nuestro chat-ia está disponible','our chat-ai is available']) assert(legacyCoverageText.includes(term), `Falta cobertura heredada de web vieja: ${term}`);
for (const id of ['guia-completa-ia-colombia-web-vieja','ia-sin-mensualidad-offline','ia-colombia-contacto','cifrado-control-acceso','ia-capacitacion-empresarial','ia-retencion-conocimiento-rotacion-personal','ia-procesos-criticos-empresariales','ia-apps-webs-software-empresarial','ia-produccion-industrial-sin-internet','implementacion-ia-en-sitio-videollamada','ia-diagnostico-clasificacion-prediccion','ia-automatizacion-ventas-atencion-24-7','planes-despliegue-ia-colombia']) assert(seoEs.items.some(i=>i.id===id) && seoEn.items.some(i=>i.id===id), `Falta ficha SEO bilingüe ${id}`);
const verification = await readFile(path.join(root,'.well-known/memoriabackend-domain-verification.txt'),'utf8');
assert(verification.includes('memoriaBACKEND-domain-verification='), 'Falta verificación memoriaBACKEND en .well-known');

const assetFiles = await walk('assets');
for (const f of assetFiles) assert(f.endsWith('.txt') || f.endsWith('.json'), `assets no debe incluir imagen binaria en esta iteracion: ${f}`);
const promptFiles = assetFiles.filter(f => f.endsWith('.png.txt') || f.endsWith('.webp.txt') || f.endsWith('.jpg.txt') || f.endsWith('.jpeg.txt'));
assert(promptFiles.length>=9, 'Debe haber prompts visuales suficientes para logo y escenas, sin binarios');
for (const f of promptFiles) {
  const prompt = await json(f);
  assert(prompt.asset && prompt.prompt && prompt.fallback_behavior, `${f} debe ser JSON de prompt visual con asset, prompt y fallback_behavior`);
  assert(String(prompt.fallback_behavior).toLowerCase().includes('figura geométrica') || String(prompt.fallback_behavior).toLowerCase().includes('geometric'), `${f} debe declarar fallback geométrico`);
}
for (const name of ['ia-colombia-logo.png.txt','ia-scene-01-trained-ai.png.txt','ia-scene-08-roadmap-deploy.png.txt']) assert(assetFiles.includes('assets/'+name), `Falta prompt visual ${name}`);
if (failures.length) { console.error(failures.map(f=>'• '+f).join('\n')); process.exit(1); }
console.log(`Validacion IA Colombia completada: ${seoEs.items.length} fichas SEO, 2 idiomas y prompts visuales sin binarios.`);
