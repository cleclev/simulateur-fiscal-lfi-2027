(function () {
  "use strict";
  const form = document.querySelector("#simulator-form");
  const panels = [...document.querySelectorAll(".step-panel")];
  const steps = [...document.querySelectorAll(".step")];
  let current = 1;
  let lastResult = null;

  function numberValue(name) {
    const el = form.elements[name];
    return el ? Number(el.value || 0) : 0;
  }
  function textValue(name) {
    const el = form.elements[name];
    return el ? el.value : "";
  }
  function checked(name) {
    const el = form.elements[name];
    return el ? el.checked : false;
  }
  const fieldHelp = {
    relationship:"Le statut conjugal détermine si l'impôt 2026 est calculé en foyer commun ou séparément.",
    age1:"L'âge permet d'identifier les situations liées à la garantie d'autonomie et à la retraite.",
    age2:"L'âge du second déclarant complète l'analyse du foyer et des droits sociaux.",
    childrenCount:"Le nombre d'enfants crée un champ d'âge pour chaque enfant afin d'appliquer les bons seuils.",
    canteenChildren:"Indiquez les enfants de moins de 18 ans qui mangent à la cantine : la gratuité est valorisée à environ 600 € par an.",
    status1:"Le statut permet d'appliquer les revalorisations prévues pour les salaires, les pensions et l'AAH/RSA.",
    status2:"Le statut permet d'appliquer les revalorisations prévues pour les salaires, les pensions et l'AAH/RSA.",
    income1:"Revenu net mensuel avant impôt sur le revenu, utilisé pour comparer le pouvoir d'achat.",
    income2:"Revenu net mensuel avant impôt sur le revenu, utilisé pour comparer le pouvoir d'achat.",
    bonus1:"Les heures supplémentaires et l'épargne salariale peuvent augmenter les revenus imposables ou les ressources annuelles.",
    bonus2:"Les heures supplémentaires et l'épargne salariale peuvent augmenter les revenus imposables ou les ressources annuelles.",
    apl:"Aide personnalisée au logement actuellement perçue ; elle est revalorisée dans le scénario 2027.",
    familyBenefits:"Allocations familiales actuellement perçues ; le scénario 2027 applique une revalorisation de 10 %.",
    rsaAah:"RSA ou AAH actuellement perçu ; l'AAH est portée à 1 700 € dans le scénario programmatique.",
    rentalIncome:"Revenus nets tirés de biens loués, ajoutés aux revenus annuels pour l'impôt et le patrimoine.",
    livretA:"Épargne réglementée dont le plafond et la rémunération changent dans le scénario 2027.",
    financialNet:"Valeur nette des comptes-titres, PEA, assurance-vie, crypto-actifs et liquidités, hors biens professionnels.",
    financialGains:"Dividendes, intérêts et plus-values mobilières imposables sur une année.",
    lifeInsurance:"Encours total des contrats d'assurance-vie servant à estimer la fiscalité du capital.",
    lifeForeignPct:"Part de l'assurance-vie détenue à l'étranger, concernée par la remise en cause des avantages fiscaux.",
    lifeAge:"L'ancienneté du contrat détermine le taux indicatif appliqué dans la comparaison.",
    per:"Versements volontaires sur un plan d'épargne retraite : déductibles en 2026, sans déduction dans le scénario 2027.",
    professionalAssets:"Outil de travail et parts professionnelles susceptibles d'être exonérés de l'assiette patrimoniale.",
    propertyCount:"Nombre de logements détenus ; le programme prévoit un plafond de cinq logements transmissibles.",
    propertyValue:"Valeur nette des biens immobiliers après emprunts, utilisée pour l'IFI et l'ISF climatique.",
    inheritance:"Montant de la transmission envisagée, comparé aux seuils successoraux des deux scénarios.",
    lifetimeDonations:"Somme des donations et héritages déjà reçus au cours de la vie pour le cumul successoral.",
    donorParents:"Nombre de parents donateurs servant à estimer l'abattement de 100 000 € en 2026.",
    heirs:"Nombre d'héritiers utilisé pour le réglage de la franchise successorale 2027."
  };
  function enhanceLabels(scope = document) {
    scope.querySelectorAll("label").forEach(label => {
      if (label.querySelector(".info-help")) return;
      const field = label.querySelector("input, select");
      const key = field?.name;
      const help = label.dataset.help || fieldHelp[key];
      if (!help) return;
      const head = document.createElement("span");
      head.className = "label-head";
      [...label.childNodes].forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) head.append(node);
        else if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains("unit")) head.append(node);
      });
      if (!head.textContent.trim()) {
        const text = label.querySelector("span:not(.unit)");
        if (text) head.append(text);
      }
      const info = document.createElement("button");
      info.type = "button";
      info.className = "info-help";
      info.setAttribute("aria-label", `Explication : ${help}`);
      info.innerHTML = `<span aria-hidden="true">i</span><em>${help}</em>`;
      head.append(info);
      label.prepend(head);
    });
  }
  function renderChildrenFields(ages = []) {
    const count = Math.max(0, Math.min(20, Number(form.elements.childrenCount?.value || 0)));
    const container = document.querySelector("#children-ages");
    const canteenWrap = document.querySelector("#canteen-wrap");
    container.innerHTML = "";
    if (!count) {
      canteenWrap.classList.add("hidden");
      return;
    }
    container.className = "children-ages grid grid-4";
    for (let index = 0; index < count; index += 1) {
      const label = document.createElement("label");
      label.dataset.help = "L'âge de l'enfant permet de distinguer les seuils de garantie d'autonomie et l'éligibilité à la cantine.";
      label.innerHTML = `Enfant ${index + 1} <span class="unit">âge</span><input name="childAge${index}" type="number" min="0" max="25" value="${Number(ages[index] ?? 10)}">`;
      container.append(label);
    }
    updateCanteenVisibility();
    enhanceLabels(container);
  }
  function updateCanteenVisibility() {
    const canteenWrap = document.querySelector("#canteen-wrap");
    const hasMinor = [...document.querySelectorAll("#children-ages input")].some(input => Number(input.value) < 18);
    canteenWrap.classList.toggle("hidden", !hasMinor);
  }
  function collectChildAges() {
    return [...document.querySelectorAll("#children-ages input")].map(input => Number(input.value || 0));
  }
  function collectData() {
    const names = ["relationship","age1","age2","canteenChildren","status1","income1","bonus1","status2","income2","bonus2","apl","familyBenefits","rsaAah","rentalIncome","livretA","financialNet","financialGains","lifeInsurance","lifeForeignPct","lifeAge","per","professionalAssets","propertyCount","propertyValue","inheritance","lifetimeDonations","donorParents","heirs"];
    const data = {};
    names.forEach(name => data[name] = ["relationship","status1","status2","lifeAge"].includes(name) ? textValue(name) : numberValue(name));
    data.childrenAges = collectChildAges();
    data.childrenUnder14 = data.childrenAges.filter(age => age < 14).length;
    data.childrenOver14 = data.childrenAges.filter(age => age >= 14).length;
    data.childrenCount = data.childrenAges.length;
    data.passoire = checked("passoire");
    data.vacant = checked("vacant");
    data.top20 = checked("top20");
    data.dutreil = checked("dutreil");
    return data;
  }
  function collectParams() {
    return {
      irScenario: document.querySelector("#irScenario").value,
      childCredit: Number(document.querySelector("#childCredit").value),
      livretInflation: Number(document.querySelector("#livretInflation").value),
      isfThreshold: Number(document.querySelector("#isfThreshold").value),
      isfRevenue: Number(document.querySelector("#isfRevenue").value),
      successionThreshold: document.querySelector("#successionThreshold").value
    };
  }
  function euro(n) {
    return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n || 0);
  }
  function signed(n) {
    const abs = euro(Math.abs(n));
    return `${n >= 0 ? "+" : "−"}${abs}`;
  }
  function goTo(step) {
    current = Math.max(1,Math.min(5,step));
    panels.forEach(p => p.classList.toggle("active",Number(p.dataset.panel)===current));
    steps.forEach(s => {
      const n=Number(s.dataset.step);
      s.classList.toggle("active",n===current);
      s.classList.toggle("done",n<current);
    });
    const progress = document.querySelector(".step-track i");
    if (progress) progress.style.width = `${((current - 1) / 4) * 100}%`;
    document.querySelector("#prev").disabled=current===1;
    document.querySelector("#next").textContent=current===5?"Recalculer":"Suivant";
    if(current===5) render();
  }
  function render() {
    const data=collectData(), params=collectParams();
    lastResult=Calculator.calculate(data,params);
    const r=lastResult;
    const relationshipLabel = {single:"Célibataire",married:"Marié ou pacsé",cohabiting:"Concubinage"}[data.relationship] || "Célibataire";
    const childAges = data.childrenAges || [];
    const printMeta = document.querySelector("#print-meta");
    printMeta.innerHTML = `
      <div><b>PROFIL</b><span>${relationshipLabel} · ${euro((data.income1 + data.income2) * 12)} de revenus/an · ${childAges.length} enfant${childAges.length>1?"s":""}</span></div>
      <div><b>HYPOTHÈSES</b><span>${params.irScenario==="a"?"Barème 2026 individualisé":"Projection 14 tranches 2022"} · Crédit enfant ${euro(params.childCredit)} · Livret A ${String(params.livretInflation).replace(".",",")} %</span></div>
      <div><b>PATRIMOINE</b><span>${euro(data.propertyValue)} immobilier · ${euro(data.financialNet)} financier · ${euro(data.inheritance)} d’héritage envisagé</span></div>`;
    const annual=document.querySelector("#annual-card");
    annual.className=`verdict-card ${r.recurrent>=0?"gain":"loss"}`;
    annual.innerHTML=`<small>Bilan annuel récurrent</small><div class="big-number">${signed(r.recurrent)} / an</div><p>${signed(r.recurrent/12)} / mois</p><p><strong>2026 :</strong> ${euro(r.annualNet2026)}<br><strong>LFI 2027 :</strong> ${euro(r.annualNet2027)}</p>`;
    const patr=document.querySelector("#patrimonial-card");
    patr.className=`verdict-card ${r.patrimonial>=0?"gain":"loss"}`;
    patr.innerHTML=`<small>Bilan patrimonial & successoral ponctuel</small><div class="big-number">${signed(r.patrimonial)}</div><p><strong>Succession 2026 :</strong> ${euro(r.taxInheritance2026)}<br><strong>LFI 2027 :</strong> ${euro(r.taxInheritance2027)}<br><strong>Réquisition immobilière :</strong> ${euro(r.estateLoss)}</p>`;
    renderAlerts(r.alerts);
    renderTable(r.table);
    renderChart(r.recurrent);
  }
  function renderAlerts(alerts) {
    document.querySelector("#alerts").innerHTML=alerts.map(a=>`<span class="badge ${a.type==="danger"?"danger":a.type==="info"?"info":""}">${a.text}</span>`).join("");
  }
  function renderTable(rows) {
    document.querySelector("#comparison-table tbody").innerHTML=rows.map(row=>`<tr><td>${row[0]}</td><td>${euro(row[1])}</td><td>${euro(row[2])}</td><td style="color:${row[3]>=0?"var(--green)":"var(--red)"}">${signed(row[3])}</td></tr>`).join("");
  }
  function renderChart() {
    const rows = lastResult.table.slice(0, 2).map(row => ({
      label: row[0].startsWith("Revenus") ? "Revenus / aides" : "Impôts annuels",
      current: row[1],
      future: row[2]
    }));
    const max = Math.max(...rows.flatMap(row => [row.current, row.future]), 1);
    const w=760, h=250, left=180, bar=28, gap=78, usable=w-left-30;
    const bars = rows.map((row, i) => {
      const y=42+i*gap, cw=row.current/max*usable, fw=row.future/max*usable;
      return `<text x="0" y="${y+20}" font-size="13" font-weight="800" fill="#141218">${row.label}</text><rect x="${left}" y="${y}" width="${cw}" height="${bar}" fill="#24113D"/><rect x="${left}" y="${y+bar+8}" width="${fw}" height="${bar}" fill="#E62E2D"/><text x="${left+cw+8}" y="${y+20}" font-size="12" fill="#24113D">${euro(row.current)}</text><text x="${left+fw+8}" y="${y+bar+28}" font-size="12" fill="#C81E1D">${euro(row.future)}</text>`;
    }).join("");
    document.querySelector("#chart").innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Comparaison des revenus et impôts"><text x="${left}" y="18" font-size="11" font-weight="800" fill="#524D5C">RÉGIME 2026</text><text x="${left+130}" y="18" font-size="11" font-weight="800" fill="#E62E2D">PROGRAMME LFI 2027</text>${bars}<rect x="${left}" y="${h-24}" width="12" height="12" fill="#24113D"/><text x="${left+18}" y="${h-14}" font-size="11" fill="#524D5C">2026</text><rect x="${left+80}" y="${h-24}" width="12" height="12" fill="#E62E2D"/><text x="${left+98}" y="${h-14}" font-size="11" fill="#524D5C">2027</text></svg>`;
  }

  const profiles={
    smic:{relationship:"single",age1:30,childrenAges:[],canteenChildren:0,status1:"Salarié du privé",income1:1667,income2:0,status2:"Étudiant ou sans revenu",livretA:10000,inheritance:140000,propertyCount:0},
    couple:{relationship:"married",age1:38,age2:36,childrenAges:[8,11],canteenChildren:2,status1:"Salarié du privé",income1:4500,status2:"Salarié du privé",income2:1500,per:5000,propertyCount:1,propertyValue:250000},
    retired:{relationship:"single",age1:68,childrenAges:[],status1:"Retraité",income1:4000,livretA:0,financialNet:400000,financialGains:20000,propertyCount:8,propertyValue:1600000,inheritance:0,top20:true}
  };
  function applyObject(obj) {
    if (obj.childrenAges) {
      form.elements.childrenCount.value = obj.childrenAges.length;
      renderChildrenFields(obj.childrenAges);
    }
    Object.entries(obj).forEach(([key,value])=>{
      const el=form.elements[key];
      if(!el) return;
      if(el.type==="checkbox") el.checked=Boolean(value);
      else el.value=value;
    });
    if (obj.childrenAges) renderChildrenFields(obj.childrenAges);
  }
  let profileIndex=0;
  document.querySelector("#load-example").addEventListener("click",()=>{
    const keys=Object.keys(profiles);
    applyObject(profiles[keys[profileIndex]]);
    profileIndex=(profileIndex+1)%keys.length;
    updateCoupleVisibility();
    goTo(1);
  });
  document.querySelectorAll(".quick-profile").forEach(button => button.addEventListener("click", () => {
    applyObject(profiles[button.dataset.profile]);
    updateCoupleVisibility();
    goTo(1);
  }));
  function updateCoupleVisibility(){
    const couple=textValue("relationship")==="married"||textValue("relationship")==="cohabiting";
    document.querySelectorAll(".couple-only").forEach(el=>el.classList.toggle("hidden",!couple));
  }
  form.addEventListener("change", event=>{
    updateCoupleVisibility();
    if (event.target.matches("#children-ages input")) updateCanteenVisibility();
    if(current===5) render();
  });
  form.addEventListener("input", event=>{
    if (event.target.name === "childrenCount") renderChildrenFields(collectChildAges());
    if (event.target.matches("#children-ages input")) updateCanteenVisibility();
    if(current===5) render();
  });
  steps.forEach(s=>s.addEventListener("click",()=>goTo(Number(s.dataset.step))));
  document.querySelector("#prev").addEventListener("click",()=>goTo(current-1));
  document.querySelector("#next").addEventListener("click",()=>{render();goTo(current===5?5:current+1)});
  document.querySelector("#print").addEventListener("click",()=>{
    render();
    window.print();
  });

  document.querySelectorAll("[data-dialog]").forEach(button => {
    button.addEventListener("click", () => {
      const dialog = document.getElementById(button.dataset.dialog);
      if (dialog && typeof dialog.showModal === "function") dialog.showModal();
    });
  });
  document.querySelectorAll(".legal-dialog").forEach(dialog => {
    dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => {
      const rect = dialog.getBoundingClientRect();
      const outside = event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom;
      if (outside) dialog.close();
    });
  });

  function encodeState(){
    const json=JSON.stringify({data:collectData(),params:collectParams()});
    return btoa(unescape(encodeURIComponent(json)));
  }
  function decodeState(){
    const encoded=new URLSearchParams(location.search).get("s");
    if(!encoded)return false;
    try{
      const state=JSON.parse(decodeURIComponent(escape(atob(encoded))));
      applyObject(state.data||{});
      const p=state.params||{};
      for(const [id,key] of [["irScenario","irScenario"],["childCredit","childCredit"],["livretInflation","livretInflation"],["isfThreshold","isfThreshold"],["isfRevenue","isfRevenue"],["successionThreshold","successionThreshold"]]){
        if(p[key]!=null) document.querySelector("#"+id).value=p[key];
      }
      syncRangeOutputs();
      return true;
    }catch(e){return false}
  }
  async function copyText(text){
    try{await navigator.clipboard.writeText(text)}catch(e){
      const area=document.createElement("textarea");area.value=text;document.body.append(area);area.select();document.execCommand("copy");area.remove();
    }
  }
  document.querySelector("#share").addEventListener("click",()=>{
    const url=new URL(location.href);url.search="";url.searchParams.set("s",encodeState());
    history.replaceState(null,"",url);
    copyText(url.href);
  });
  document.querySelector("#copy-summary").addEventListener("click",()=>{
    if(!lastResult) render();
    const r=lastResult;
    copyText(`Comparatif 2026 / LFI 2027\nBilan annuel : ${signed(r.recurrent)} / an (${signed(r.recurrent/12)} / mois)\nBilan patrimonial : ${signed(r.patrimonial)}\nSuccession 2026 : ${euro(r.taxInheritance2026)} — LFI 2027 : ${euro(r.taxInheritance2027)}\nSimulation pédagogique à partir du document fourni.`);
  });
  function syncRangeOutputs(){
      document.querySelector("#childCreditOut").textContent=Number(document.querySelector("#childCredit").value).toLocaleString("fr-FR")+" €";
      document.querySelector("#livretInflationOut").textContent=Number(document.querySelector("#livretInflation").value).toLocaleString("fr-FR",{minimumFractionDigits:1})+" %";
  }
  document.querySelector("#childCredit").addEventListener("input",()=>{syncRangeOutputs();if(current===5)render()});
  document.querySelector("#livretInflation").addEventListener("input",()=>{syncRangeOutputs();if(current===5)render()});
  ["irScenario","isfThreshold","isfRevenue","successionThreshold"].forEach(id=>document.querySelector("#"+id).addEventListener("change",render));

  decodeState();
  renderChildrenFields();
  enhanceLabels();
  updateCoupleVisibility();
  syncRangeOutputs();
  goTo(1);
})();
