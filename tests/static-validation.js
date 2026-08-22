const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'dist', 'annunciator-grid-card.js');
const src = fs.readFileSync(file, 'utf8');
const failures = [];
const check = (name, cond) => { if (!cond) failures.push(name); };
check('CARD_VERSION is 1.0.1', /const CARD_VERSION = ["']1\.0\.1["']/.test(src));
check('CONFIG_VERSION is 2', /const CONFIG_VERSION = 2;/.test(src));
check('runtime custom element registered once', (src.match(/customElements\.define\("annunciator-grid-card"/g) || []).length === 1);
check('editor custom element registered once', (src.match(/customElements\.define\("annunciator-grid-card-editor"/g) || []).length === 1);
check('custom card picker registration present', src.includes('window.customCards.push'));
check('no release-candidate marker', !/Release Candidate|2\.3\.0-rc\.5/.test(src));
check('no obsolete bLabel regression', !src.includes('bLabel'));
check('HACS filename matches card filename', path.basename(file) === 'annunciator-grid-card.js');
check('getCardSize present', src.includes('getCardSize()'));
check('getGridOptions present', src.includes('getGridOptions()'));
check('visual editor present', src.includes('static getConfigElement()'));
check('compact/adaptive ACK codec present', src.includes('slotSetToAdaptive'));
check('schema migration present', src.includes('migrateConfigV2'));
check('config validation present', src.includes('validateAndRepairConfig'));
check('pair canonicalization present', src.includes('canonicalizePairOrdering'));
if (failures.length) {
  console.error('Static validation FAILED:');
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}
console.log('Static validation PASS');
console.log('Annunciator Grid Card v1.0.1 / config schema v2');
