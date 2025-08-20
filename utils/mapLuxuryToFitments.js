
const { MODELS, EXTRA_COST_FITMENTS } = require('./modelCatalog');

function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'on' || s === 'yes';
  }
  return !!v;
}

/**
 * @param {object} luxuryData - raw object from UI (keys like "Front Glass__Choice", "EXTRA::AC__Checked", etc.)
 * @param {string} modelName  - e.g. "Arrow", "Spider"
 * @returns {{
 *  standardFitments: Array<{key:string,label:string,suggested:string,choice:string,otherValue:string}>,
 *  optionalFitmentsSelected: string[],
 *  extraCostFitments: Array<{key:string,label:string,checked:boolean,company:string}>,
 *  customExtras: Array<{name:string,desc:string}>
 * }}
 */
function mapLuxuryToFitments(luxuryData = {}, modelName) {
  const config = MODELS[modelName] || { standardFitments: [], optionalFitments: [] };

  // 1) Standard fitments
  const standardFitments = (config.standardFitments || []).map((f) => {
    const choice = luxuryData[`${f.key}__Choice`] || 'Suggested';
    const otherValue = luxuryData[`${f.key}__Other`] || '';
    return {
      key: f.key,
      label: f.label,
      suggested: f.suggested || '',
      choice,
      otherValue,
    };
  });

  // 2) Optional fitments selected
  const optionalFitmentsSelected = Array.isArray(luxuryData.optionalFitmentsSelected)
    ? luxuryData.optionalFitmentsSelected.filter(Boolean)
    : [];

  // 3) Extra-cost fitments (keep only checked)
  const extraCostFitments = (EXTRA_COST_FITMENTS || [])
    .map((f) => ({
      key: f.key,
      label: f.label,
      checked: toBool(luxuryData[`${f.key}__Checked`]),
      company: luxuryData[`${f.key}__Company`] || '',
    }))
    .filter((x) => x.checked);

  // 4) Custom extras
  const customExtras = Array.isArray(luxuryData['EXTRA::CUSTOM_LIST'])
    ? luxuryData['EXTRA::CUSTOM_LIST'].map((c) => ({
        name: (c && c.name) || '',
        desc: (c && c.desc) || '',
      }))
    : [];

  return { standardFitments, optionalFitmentsSelected, extraCostFitments, customExtras };
}

module.exports = { mapLuxuryToFitments, toBool };
