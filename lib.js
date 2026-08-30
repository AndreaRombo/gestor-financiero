/* ---------- lógica pura, sin DOM: compartida entre index.html y tests.html ---------- */
const MES=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const eur=v=>new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(v);
const DIACRITICS_RE=new RegExp("["+String.fromCharCode(0x0300)+"-"+String.fromCharCode(0x036f)+"]","g");
const strip=s=>String(s??"").toLowerCase().normalize("NFD").replace(DIACRITICS_RE,"");

const KEYS={
  ingresos:["nomina","salario","paga","abono","ingreso","transferencia recibida","devolucion","reembolso","bizum recibido","finiquito","pension","dividendo","alquiler cobrado"],
  supermercado:["mercadona","carrefour","lidl","aldi","dia ","eroski","alcampo","consum","supercor","hipercor","ahorramas","supermercado","fruteria","carniceria","panaderia","pescaderia"],
  suministros:["iberdrola","endesa","naturgy","luz","agua","emasa","hidralia","gas natural","movistar","vodafone","orange","jazztel","yoigo","masmovil","pepephone","digi","telefonica","internet","fibra","comunidad","seguro hogar","ibi","basura"],
  ocio:["restaurante","bar ","cafeteria","cafe ","glovo","just eat","uber eats","deliveroo","cine","teatro","tapas","bodega","cerveceria","pizzeria","burger","mcdonald","telepizza","domino","starbucks","chiringuito","discoteca","concierto","hotel","booking","airbnb"],
  suscripciones:["netflix","spotify","disney","hbo","max ","prime video","amazon prime","dazn","filmin","movistar plus","apple.com","itunes","icloud","google one","youtube premium","adobe","microsoft 365","office 365","chatgpt","openai","canva","dropbox","gimnasio","basic fit","altafit"],
  transporte:["gasolinera","cepsa","repsol","shell","bp ","galp","carburante","renfe","alsa","metro","emt","tussam","autobus","taxi","uber","cabify","bolt","parking","aparcamiento","peaje","itv","taller","revision","seguro coche"]
};

function parseAmount(v){
  if(typeof v==="number")return isFinite(v)?v:NaN;
  let s=String(v??"").trim();if(!s)return NaN;
  let neg=false;
  if(/^\(.*\)$/.test(s)){neg=true;s=s.slice(1,-1);}
  s=s.replace(/eur/gi,"").replace(/[€$£\s ]/g,"");
  if(s.startsWith("-")){neg=true;s=s.slice(1);}else if(s.startsWith("+"))s=s.slice(1);
  if(!/^[\d.,]+$/.test(s))return NaN;
  const lc=s.lastIndexOf(","),ld=s.lastIndexOf(".");
  if(lc>-1&&ld>-1)s=lc>ld?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"");
  else if(lc>-1)s=/^\d{1,3}(,\d{3})+$/.test(s)?s.replace(/,/g,""):s.replace(",",".");
  else if(ld>-1&&/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,"");
  const n=parseFloat(s);
  return isFinite(n)?(neg?-n:n):NaN;
}
function serialToDate(n){
  const d=new Date(Math.round((n-25569)*86400000));
  return new Date(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
}
function parseDate(v,defaultYear){
  if(v==null||v==="")return null;
  if(v instanceof Date)return isNaN(v)?null:v;
  if(typeof v==="number")return (v>20000&&v<60000)?serialToDate(v):null;
  const s=String(v).trim();
  if(/^\d{5}(\.\d+)?$/.test(s)){const n=+s;if(n>20000&&n<60000)return serialToDate(n);}
  let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m)return new Date(+m[1],+m[2]-1,+m[3]);
  m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if(m){let y=+m[3];if(y<100)y+=2000;return new Date(y,+m[2]-1,+m[1]);}
  m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})$/);
  if(m)return defaultYear?new Date(defaultYear,+m[2]-1,+m[1]):null;
  m=s.match(/^(\d{1,2})[\s-]+([a-zñ]{3,})\.?$/i);
  if(m){
    const mi=MES.indexOf(strip(m[2]).slice(0,3));
    if(mi>-1)return defaultYear?new Date(defaultYear,mi,+m[1]):null;
  }
  const d=new Date(s);
  return isNaN(d)?null:d;
}
function categorize(concepto,importe){
  const s=strip(concepto);
  let best=null,len=0;
  for(const [cat,words] of Object.entries(KEYS))
    for(const w of words)
      if(s.includes(w)&&w.length>len){best=cat;len=w.length;}
  if(best)return best;
  return importe>0?"ingresos":"varios";
}
function categorySlug(name){
  return strip(name).replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"cat";
}
function splitLine(line){
  const out=[];let cur="",q=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='"'){ if(q&&line[i+1]==='"'){cur+='"';i++;} else q=!q; }
    else if((c===","||c===";"||c==="\t")&&!q){out.push(cur);cur="";}
    else cur+=c;
  }
  out.push(cur);
  return out.map(s=>s.trim());
}
function csvToMatrix(text){
  return text.split(/\r?\n/).filter(l=>l.trim()).map(splitLine);
}
function sig(r){return (r.fecha?r.fecha.toISOString().slice(0,10):"")+"|"+strip(r.concepto)+"|"+r.importe.toFixed(2);}
function guessColumns(matrix,defaultYear){
  const n=Math.min(matrix.length,40);
  const ncols=Math.max(0,...matrix.slice(0,n).map(r=>(r||[]).length));
  let bestF=-1,bestFScore=0;
  for(let col=0;col<ncols;col++){
    let hits=0,total=0;
    for(let i=0;i<n;i++){
      const v=(matrix[i]||[])[col];
      if(v==null||v==="")continue;
      total++;
      if(parseDate(v,defaultYear))hits++;
    }
    if(total>=3&&hits/total>0.6&&hits>bestFScore){bestFScore=hits;bestF=col;}
  }
  if(bestF===-1)return null;
  let bestA=-1,bestAScore=0;
  for(let col=0;col<ncols;col++){
    if(col===bestF)continue;
    let hits=0,total=0;
    for(let i=0;i<n;i++){
      const v=(matrix[i]||[])[col];
      if(v==null||v==="")continue;
      total++;
      if(!isNaN(parseAmount(v)))hits++;
    }
    if(total>=3&&hits/total>0.6&&hits>bestAScore){bestAScore=hits;bestA=col;}
  }
  if(bestA===-1)return null;
  let bestC=-1,bestLen=0;
  for(let col=0;col<ncols;col++){
    if(col===bestF||col===bestA)continue;
    let len=0,total=0;
    for(let i=0;i<n;i++){
      const v=(matrix[i]||[])[col];
      if(v==null||v==="")continue;
      total++;len+=String(v).length;
    }
    if(total>=3&&len>bestLen){bestLen=len;bestC=col;}
  }
  if(bestC===-1)return null;
  return {f:bestF,c:bestC,a:bestA,cargo:-1,abono:-1,cat:-1,fj:-1,noHeader:true};
}
function extractSheetInfo(link){
  const m=String(link||"").match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if(!m)return null;
  const g=link.match(/[?&#]gid=(\d+)/);
  return {id:m[1],gid:g?g[1]:"0"};
}
function tabDateContext(title){
  const s=strip(title);
  const ym=s.match(/(20\d{2})/);
  const year=ym?+ym[1]:null;
  let month=null;
  for(let i=0;i<MES.length;i++){
    if(s.includes(MES[i])){month=i+1;break;}
  }
  return {month,year:year||(month?(month>=9?2025:2026):2026)};
}

