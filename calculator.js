(function (global) {
  "strict";

  const EUR = n => Math.max(0, Number(n) || 0);
  const round = n => Math.round((n + Number.EPSILON) * 100) / 100;

  function progressiveTax(income, bracketSet) {
    income = EUR(income);
    let tax = 0, previous = 0;
    for (const bracket of bracketSet) {
      if (income <= previous) break;
      const taxable = Math.min(income, bracket.max) - previous;
      if (taxable > 0) tax += taxable * bracket.rate;
      previous = bracket.max;
      if (bracket.max === Infinity) break;
    }
    return tax;
  }

  const TAX2026 = [
    { max: 11600, rate: 0 }, { max: 29579, rate: .11 },
    { max: 84577, rate: .30 }, { max: 181917, rate: .41 },
    { max: Infinity, rate: .45 }
  ];
  const TAX2022 = [
    { max: 10292, rate: .01 }, { max: 15438, rate: .05 },
    { max: 20584, rate: .10 }, { max: 27789, rate: .15 },
    { max: 30876, rate: .20 }, { max: 33964, rate: .25 },
    { max: 38081, rate: .30 }, { max: 44256, rate: .35 },
    { max: 61752, rate: .40 }, { max: 102921, rate: .45 },
    { max: 144089, rate: .50 }, { max: 267594, rate: .55 },
    { max: 411683, rate: .60 }, { max: Infinity, rate: .90 }
  ];

  function parts2026(data) {
    const married = data.relationship === "married";
    const base = married ? 2 : 1;
    const childCount = EUR(data.childrenUnder14) + EUR(data.childrenOver14);
    let extra = 0;
    if (childCount === 1) extra = .5;
    else if (childCount >= 2) extra = 1 + (childCount - 2);
    return { base, parts: base + extra };
  }

  function decote(tax, married) {
    const threshold = married ? 3277 : 1982;
    if (tax >= threshold) return 0;
    const base = married ? 1483 : 897;
    return Math.max(0, base - .4525 * tax);
  }

  function ir2026Foyer(rni, data) {
    rni = EUR(rni);
    const { base, parts } = parts2026(data);
    if (base === 1) {
      const gross = parts * progressiveTax(rni / parts, TAX2026);
      return Math.max(0, gross - decote(gross, false));
    }
    const grossCeiled = base * progressiveTax(rni / base, TAX2026) - 1807 * 2 * (parts - base);
    const gross = parts * progressiveTax(rni / parts, TAX2026);
    const brute = Math.max(gross, grossCeiled);
    return Math.max(0, brute - decote(brute, true));
  }

  function tmi2026(rni) {
    if (rni <= 11600) return 0;
    if (rni <= 29579) return .11;
    if (rni <= 84577) return .30;
    if (rni <= 181917) return .41;
    return .45;
  }

  function ir2027Individual(incomes, gains, data, params) {
    const credit = EUR(params.childCredit) * (EUR(data.childrenUnder14) + EUR(data.childrenOver14));
    let tax = 0;
    const set = params.irScenario === "b" ? TAX2022 : TAX2026;
    const dividedGains = EUR(gains) / Math.max(1, incomes.filter(v => v > 0).length);
    for (const income of incomes) {
      if (income <= 0) continue;
      tax += progressiveTax(EUR(income) + dividedGains, set);
    }
    tax = Math.max(0, tax - credit);
    if (params.irScenario !== "b") {
      const married = data.relationship === "married";
      tax = Math.max(0, tax - decote(tax, married));
    }
    return tax;
  }

  function ifi2026(propertyValue) {
    if (propertyValue <= 1300000) return 0;
    let tax = 0, previous = 800000;
    const ranges = [
      [1300000, .005], [2500000, .007], [5000000, .01], [10000000, .0125], [Infinity, .015]
    ];
    for (const [max, rate] of ranges) {
      if (propertyValue <= previous) break;
      tax += (Math.min(propertyValue, max) - previous) * rate;
      previous = max;
    }
    return tax;
  }

  function succession2026(inheritance, data) {
    inheritance = EUR(inheritance);
    const available = EUR(data.donorParents) * 100000;
    const taxable = Math.max(0, inheritance - available);
    const brackets = [
      [8072,.05],[12197,.10],[159932,.15],[552324,.20],[902838,.30],[1805677,.40],[Infinity,.45]
    ];
    return progressiveTax(taxable, brackets.map(([max,rate]) => ({max,rate})));
  }

  function isfClimate(data, params) {
    const threshold = EUR(params.isfThreshold);
    const base = EUR(data.propertyValue) + EUR(data.financialNet) - EUR(data.professionalAssets);
    if (base <= threshold) return { tax: 0, base };
    // Transparent broad proxy calibrated to the requested 2017/10 Md euro sensitivity.
    const excess = base - threshold;
    let rate = .004;
    if (excess > 10000000) rate = .018;
    else if (excess > 3000000) rate = .012;
    else if (excess > 1000000) rate = .007;
    if (EUR(params.isfRevenue) === 10) rate *= 1.15;
    if (data.passoire) rate *= 1.08;
    return { tax: excess * rate, base };
  }

  function calculate(data, params = {}) {
    params = Object.assign({ irScenario:"a", childCredit:2600, livretInflation:3, isfThreshold:1300000, isfRevenue:10, successionThreshold:"heir" }, params);
    data = Object.assign({
      relationship:"single", age1:35, age2:35, childrenUnder14:0, childrenOver14:0, canteenChildren:0,
      status1:"Salarié du privé", status1Status:undefined, income1:1500, income2:0, status2:"Salarié du privé",
      bonus1:0, bonus2:0, apl:0, familyBenefits:0, rsaAah:0, rentalIncome:0,
      livretA:0, financialNet:0, financialGains:0, lifeInsurance:0, lifeForeignPct:0, lifeAge:"under8", per:0, professionalAssets:0,
      propertyCount:0, propertyValue:0, passoire:false, vacant:false, top20:false, inheritance:0, lifetimeDonations:0, donorParents:1, heirs:1, dutreil:false
    }, data);

    const annual1 = EUR(data.income1) * 12;
    const annual2 = EUR(data.income2) * 12;
    const rni2026 = annual1 * .90 + annual2 * .90 + EUR(data.rentalIncome);
    const tax2026 = ir2026Foyer(rni2026, data);
    const p2026 = parts2026(data);
    const householdTmi = tmi2026(rni2026 / p2026.parts);
    const gains2026 = EUR(data.financialGains);
    const capitalTax2026 = gains2026 * .314;
    const livretGain2026 = Math.min(EUR(data.livretA),22950) * .017;
    const perTmi = tmi2026(rni2026 / p2026.parts);
    const perEconomy2026 = EUR(data.per) * perTmi;

    let salary1 = EUR(data.income1) > 0 && EUR(data.income1) < 1700 && data.status1 !== "Retraité" ? 1700 : EUR(data.income1);
    let salary2 = EUR(data.income2);
    if (salary2 > 0 && salary2 < 1700 && data.status2 !== "Retraité") salary2 = 1700;
    if (data.status1 === "Fonctionnaire") salary1 = EUR(data.income1) * 1.10;
    if (data.status2 === "Fonctionnaire") salary2 = EUR(data.income2) * 1.10;
    if (data.status1 === "Retraité") salary1 = Math.max(EUR(data.income1) * 1.10, 1700);
    if (data.status2 === "Retraité") salary2 = Math.max(EUR(data.income2) * 1.10, 1700);
    if (["Bénéficiaire AAH ou RSA","Étudiant ou sans revenu"].includes(data.status1)) {
      if (data.status1 === "Bénéficiaire AAH ou RSA") salary1 = Math.max(EUR(data.income1),1700);
    }
    if (["Bénéficiaire AAH ou RSA","Étudiant ou sans revenu"].includes(data.status2)) {
      if (data.status2 === "Bénéficiaire AAH ou RSA") salary2 = Math.max(EUR(data.income2),1700);
    }
    const income2027Annual = salary1 * 12 + salary2 * 12;
    const income2026Annual = annual1 + annual2;

    const apl2027 = EUR(data.apl) * 1.10;
    const family2027 = EUR(data.familyBenefits) * 1.10;
    const rsa2027 = EUR(data.rsaAah) * (["Bénéficiaire AAH ou RSA"].includes(data.status1) ? 1700 / Math.max(EUR(data.rsaAah),1) : 1);
    const social2027 = (apl2027 + family2027 + EUR(rsa2027)) * 12;

    const children = EUR(data.childrenUnder14) + EUR(data.childrenOver14);
    let autonomyThreshold = 1337;
    if (data.relationship !== "single" && children === 2 && EUR(data.childrenUnder14) === 2) autonomyThreshold = 2807;
    else if (data.relationship !== "single" && children === 2 && EUR(data.childrenUnder14) < 2) autonomyThreshold = 3075;
    const guaranteedMonthly = data.relationship === "single" ? autonomyThreshold : autonomyThreshold;
    const totalResourcesMonthly = salary1 + salary2 + EUR(data.apl) + EUR(data.familyBenefits) + EUR(data.rsaAah);
    const autonomyMonthly = Math.max(0, guaranteedMonthly - totalResourcesMonthly);

    const livretGain2027 = Math.min(EUR(data.livretA),30000) * EUR(params.livretInflation) / 100;
    const canteen2027 = EUR(data.canteenChildren) * 600;
    const gains2027 = gains2026 * (householdTmi + .186);

    const incomes2027 = [
      ((salary1 + EUR(data.bonus1)/12) * 12) * .90,
      ((salary2 + EUR(data.bonus2)/12) * 12) * .90
    ].filter(v => v > 0);
    const tax2027 = ir2027Individual(incomes2027, 0, data, params);
    const lifeTax2026 = EUR(data.lifeInsurance) * (data.lifeAge === "under8" ? .30 : .247);
    const lifeForeignLoss2027 = EUR(data.lifeInsurance) * EUR(data.lifeForeignPct) / 100 * (data.lifeAge === "under8" ? .30 : .247);
    const isf = isfClimate(data, params);
    const ifi2026Amount = ifi2026(EUR(data.propertyValue));
    const ifiIsfDelta = isf.tax - ifi2026Amount;
    const zucman = EUR(data.financialNet) + EUR(data.propertyValue) > 100000000
      ? (EUR(data.financialNet) + EUR(data.propertyValue) - EUR(data.professionalAssets)) * .02 : 0;

    const taxInheritance2026 = succession2026(EUR(data.inheritance), data);
    let taxInheritance2027;
    if (EUR(data.inheritance) < 150000) taxInheritance2027 = 0;
    else if (EUR(data.inheritance) + EUR(data.lifetimeDonations) > 12000000) taxInheritance2027 = EUR(data.inheritance) - 12000000;
    else {
      const added = EUR(data.inheritance) + EUR(data.lifetimeDonations);
      const taxable = params.successionThreshold === "heir"
        ? Math.max(0, EUR(data.inheritance) - 150000 * EUR(data.heirs))
        : Math.max(0, EUR(data.inheritance) - 150000);
      taxInheritance2027 = taxable * (.20 + Math.min(.25, taxable / 12000000 * .25));
    }
    if (EUR(data.inheritance) + EUR(data.lifetimeDonations) > 12000000) taxInheritance2027 = Math.max(taxInheritance2027, EUR(data.inheritance) - 12000000);
    const estateLoss = EUR(data.propertyCount) > 5 ? EUR(data.propertyValue) * (EUR(data.propertyCount) - 5) / EUR(data.propertyCount) : 0;

    const tax2026Total = tax2026 + capitalTax2026 + lifeTax2026 - perEconomy2026 + ifi2026Amount;
    const tax2027Total = tax2027 + gains2027 + lifeForeignLoss2027 + isf.tax + zucman;
    const incomeAndAid2026 = income2026Annual + (EUR(data.apl)+EUR(data.familyBenefits)+EUR(data.rsaAah))*12 + livretGain2026;
    const incomeAndAid2027 = income2027Annual + social2027 + autonomyMonthly*12 + livretGain2027 + canteen2027;
    const annualNet2026 = incomeAndAid2026 - tax2026Total;
    const annualNet2027 = incomeAndAid2027 - tax2027Total;
    const recurrent = annualNet2027 - annualNet2026;
    const patrimonial2027 = -estateLoss - Math.max(0,taxInheritance2027-taxInheritance2026);
    const patrimonial = taxInheritance2026 - taxInheritance2027 - estateLoss;

    const aids2026 = (EUR(data.apl)+EUR(data.familyBenefits)+EUR(data.rsaAah))*12;
    const aids2027 = social2027 + autonomyMonthly*12;
    const capitalNet2026 = livretGain2026 - capitalTax2026 - lifeTax2026 + perEconomy2026;
    const capitalNet2027 = livretGain2027 + canteen2027 - gains2027 - lifeForeignLoss2027;
    const wealthCost2026 = ifi2026Amount;
    const wealthCost2027 = isf.tax + zucman;
    const successionCost2026 = taxInheritance2026 + estateLoss;
    const successionCost2027 = taxInheritance2027 + estateLoss;
    const table = [
      ["Revenus & salaires", income2026Annual, income2027Annual, income2027Annual-income2026Annual],
      ["Retraites & aides sociales", aids2026, aids2027, aids2027-aids2026],
      ["Impôt sur le revenu", tax2026, tax2027, -(tax2027-tax2026)],
      ["Épargne & fiscalité du capital", capitalNet2026, capitalNet2027, capitalNet2027-capitalNet2026],
      ["IFI / ISF climatique & Zucman", wealthCost2026, wealthCost2027, -(wealthCost2027-wealthCost2026)],
      ["Droits de succession & immobilier", successionCost2026, successionCost2027, 0]
    ];

    return {
      recurrent, monthly: recurrent/12, patrimonial, patrimonial2027,
      annualNet2026, annualNet2027, tax2026, tax2027,
      income2026Annual, income2027Annual, livretGain2026, livretGain2027,
      tax2026Total, tax2027Total,
      taxInheritance2026, taxInheritance2027, estateLoss, ifi2026: ifi2026Amount, isf,
      zucchini: zucman, table,
      alerts: buildAlerts(data, rni2026, params)
    };
  }

  function buildAlerts(data, rni2026, params) {
    const alerts=[];
    if ((EUR(data.income1)+EUR(data.income2))*12 > 48000) alerts.push({type:"info", text:"Revenus supérieurs à 4 000 €/mois : la grille à 14 tranches reste à confirmer."});
    if (EUR(data.propertyValue)>1300000) alerts.push({type:"danger", text:"Patrimoine immobilier > 1,3 M€ : assujettissement IFI/ISF potentiel."});
    if (EUR(data.propertyValue)+EUR(data.financialNet)>100000000) alerts.push({type:"danger", text:"Taxe Zucman : plancher potentiel de 2 % du patrimoine net."});
    if (EUR(data.inheritance)>=150000) alerts.push({type:"warning", text:"Héritage à partir de 150 k€ : barème successoral supérieur encore inconnu."});
    if (EUR(data.inheritance)+EUR(data.lifetimeDonations)>12000000) alerts.push({type:"danger", text:"Plafond à vie de 12 M€ dépassé : confiscation potentielle de l'excédent."});
    if (EUR(data.propertyCount)>5) alerts.push({type:"danger", text:`${EUR(data.propertyCount)-5} logement(s) excédant le plafond de 5 transmissibles.`});
    if (data.passoire) alerts.push({type:"warning", text:"Passoire thermique louée : risque d'interdiction de location."});
    if (data.vacant) alerts.push({type:"warning", text:"Logement vacant : risque de réquisition après les dispositifs programmés."});
    if (data.top20) alerts.push({type:"info", text:"Foyer potentiellement soumis à la taxe d'habitation progressive."});
    return alerts;
  }

  global.Calculator = { calculate, ir2026Foyer, succession2026, parts2026, ifi2026, isfClimate };
})(window);
