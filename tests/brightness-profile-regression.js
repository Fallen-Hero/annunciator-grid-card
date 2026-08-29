'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let checks = 0;
const ok = (value, message) => { checks += 1; if (!value) throw new Error(message); };
const eq = (actual, expected, message) => {
  checks += 1;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

function load(file) {
  class HTMLElement {}
  const registry = new Map();
  const document = { createElement: (name) => ({ nodeName:name, style:{setProperty(){},removeProperty(){}}, classList:{add(){},remove(){},toggle(){}}, setAttribute(){}, removeAttribute(){}, append(){}, addEventListener(){} }) };
  const sandbox = {
    console, setTimeout, clearTimeout, queueMicrotask, HTMLElement, document,
    window:{__ANNUNCIATOR_TEST_MODE__:true,customCards:[]},
    customElements:{get:(name)=>registry.get(name),define:(name,ctor)=>registry.set(name,ctor)},
    CustomEvent:class{},Event:class{},ResizeObserver:undefined,
    requestAnimationFrame:(callback)=>{callback();return 1},cancelAnimationFrame(){},
    localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},CSS:{escape:String},
    Math,Date,Number,String,Boolean,Array,Object,Set,Map,JSON,RegExp,
  };
  sandbox.window.window=sandbox.window;sandbox.window.document=document;sandbox.window.customElements=sandbox.customElements;
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync(file,'utf8'),sandbox,{filename:path.basename(file)});
  return sandbox.window.__ANNUNCIATOR_TEST_API__;
}

const current=load(path.join(__dirname,'..','dist','annunciator-grid-card.js'));
const baseline=load(path.join(__dirname,'fixtures','annunciator-grid-card-v1.0.2.js'));
const required=[
  'normalizeLampBrightnessProfile','normalizeLampBrightnessLevel','lampBrightnessLevelsForProfile',
  'normalizeLampBrightnessConfig','normalizePanelLampBrightness','normalizePerLampBrightness',
  'lampBrightnessAttentionActive','resolveLampBrightness',
];
const missing=required.filter((name)=>typeof current?.[name]!=='function');
if(missing.length)throw new Error(`Missing __ANNUNCIATOR_TEST_API__ brightness exports: ${missing.join(', ')}`);
if(!Array.isArray(current.LAMP_BRIGHTNESS_PROFILE_SPECS)||!Array.isArray(current.LAMP_BRIGHTNESS_PROFILE_OPTIONS))throw new Error('Missing __ANNUNCIATOR_TEST_API__ brightness metadata exports: LAMP_BRIGHTNESS_PROFILE_SPECS, LAMP_BRIGHTNESS_PROFILE_OPTIONS');

const profileOrder=['normal','dim_off','dim_on','dim_non_alert','dim_all','custom'];
eq(current.LAMP_BRIGHTNESS_PROFILE_SPECS.map((spec)=>spec.key),profileOrder,'brightness profile metadata preserves canonical order');
eq(current.LAMP_BRIGHTNESS_PROFILE_OPTIONS.map((option)=>option[0]),profileOrder,'brightness profile options preserve canonical order');
ok(new Set(current.LAMP_BRIGHTNESS_PROFILE_SPECS.map((spec)=>spec.key)).size===profileOrder.length,'brightness profile keys are unique');
ok(new Set(current.LAMP_BRIGHTNESS_PROFILE_SPECS.map((spec)=>spec.label)).size===profileOrder.length,'brightness profile labels are unique');
ok(current.LAMP_BRIGHTNESS_PROFILE_SPECS.every((spec)=>typeof spec.label==='string'&&spec.label.trim()),'brightness profile labels are nonempty');

eq([current.normalizeLampBrightnessProfile(),current.normalizeLampBrightnessProfile('DIM_OFF'),current.normalizeLampBrightnessProfile('bad')],['normal','dim_off','normal'],'panel profile names normalize safely');
eq([current.normalizeLampBrightnessProfile(undefined,true),current.normalizeLampBrightnessProfile('INHERIT',true),current.normalizeLampBrightnessProfile('bad',true)],['inherit','inherit','normal'],'per-lamp profile supports only explicit inherit plus canonical choices');
eq([
  current.normalizeLampBrightnessLevel(-1),current.normalizeLampBrightnessLevel(10),current.normalizeLampBrightnessLevel(44.6),
  current.normalizeLampBrightnessLevel(100),current.normalizeLampBrightnessLevel(101),current.normalizeLampBrightnessLevel({},73),
],[10,10,45,100,100,73],'canonical brightness percentages round and clamp from 10 through 100');
eq([
  current.normalizeLampBrightnessLevel(null,32),current.normalizeLampBrightnessLevel(undefined,41),current.normalizeLampBrightnessLevel('',52),
  current.normalizeLampBrightnessLevel('   ',63),current.normalizeLampBrightnessLevel(NaN,74),current.normalizeLampBrightnessLevel(Infinity,85),
],[32,41,52,63,74,85],'empty and nonfinite canonical percentages use their supplied defaults instead of clamping to 10');
const coercibleNonNumbers=[false,true,[],[55],{},Symbol('brightness')];
for(const malformed of coercibleNonNumbers){
  const type=typeof malformed==='symbol'?'symbol':Array.isArray(malformed)?`array(${malformed.length})`:typeof malformed;
  eq(current.normalizeLampBrightnessLevel(malformed,73),73,`${type} brightness value falls back instead of being numerically coerced`);
  eq(current.normalizeLampBrightnessConfig({profile:'dim_off',dim_level:malformed}),{profile:'dim_off',dim_level:32,off:32,on:100,alert:100},`${type} shared dim level uses the canonical default`);
  eq(current.normalizeLampBrightnessConfig({profile:'custom',dim_level:malformed,off:malformed,on:malformed,alert:malformed}),{profile:'custom',dim_level:32,off:32,on:100,alert:100},`${type} values use all Custom channel defaults`);
  eq(current.normalizeLampBrightnessConfig({profile:'custom',dim_level:47,off:malformed,on:malformed,alert:malformed}),{profile:'custom',dim_level:47,off:47,on:100,alert:100},`${type} Custom channels retain their field-specific fallbacks`);
}

const profileLevels={
  normal:{off:100,on:100,alert:100},dim_off:{off:37,on:100,alert:100},dim_on:{off:100,on:37,alert:100},
  dim_non_alert:{off:37,on:37,alert:100},dim_all:{off:37,on:37,alert:37},custom:{off:21,on:64,alert:88},
};
for(const profile of profileOrder){
  const input=profile==='custom'?{profile,dim_level:37,off:21,on:64,alert:88}:{profile,dim_level:37};
  const normalized=current.normalizeLampBrightnessConfig(input,false);
  eq(normalized,{profile,dim_level:37,...profileLevels[profile]},`${profile} canonical object normalizes deterministically`);
  eq(current.lampBrightnessLevelsForProfile(profile,37,input),profileLevels[profile],`${profile} pure level expansion matches canonical object`);
}
eq(current.normalizeLampBrightnessConfig({profile:'dim_all',dim_level:100}),{profile:'dim_all',dim_level:100,off:100,on:100,alert:100},'canonical dim level accepts 100 percent');
eq(current.normalizeLampBrightnessConfig({profile:'custom',dim_level:55,off:-1,on:500,alert:'bad'}),{profile:'custom',dim_level:55,off:10,on:100,alert:100},'custom levels independently clamp and fail safe');
eq(current.normalizeLampBrightnessConfig({profile:'custom',dim_level:null,off:null,on:'',alert:NaN}),{profile:'custom',dim_level:32,off:32,on:100,alert:100},'custom null, blank, and nonfinite levels use canonical defaults');
eq(current.normalizeLampBrightnessConfig({profile:'dim_off',dim_level:'   '}),{profile:'dim_off',dim_level:32,off:32,on:100,alert:100},'blank shared dim level uses the canonical 32 percent default');
eq(current.normalizeLampBrightnessConfig({profile:'inherit',dim_level:25,off:25,on:25,alert:25},true),{profile:'inherit'},'per-lamp inherit carries no misleading local levels');
eq(current.normalizeLampBrightnessConfig([],true),{profile:'inherit'},'malformed per-lamp canonical value fails safe to inheritance');
const idempotentBrightness=current.normalizeLampBrightnessConfig({profile:'custom',dim_level:39,off:17,on:68,alert:93});
eq(current.normalizeLampBrightnessConfig(idempotentBrightness),idempotentBrightness,'canonical brightness normalization is idempotent');
const unmutatedBrightness={profile:'custom',dim_level:39,off:17,on:68,alert:93},unmutatedBefore=JSON.stringify(unmutatedBrightness);current.normalizeLampBrightnessConfig(unmutatedBrightness);eq(JSON.stringify(unmutatedBrightness),unmutatedBefore,'canonical brightness normalization does not mutate its input');

const missingPanel=current.normalizePanelLampBrightness({});
eq([missingPanel.profile,missingPanel.off,missingPanel.on,missingPanel.alert],['normal',100,100,100],'missing panel brightness remains full v1.0.2 behavior');
const legacyPanel=current.normalizePanelLampBrightness({inactive_lamp_default:'dim',inactive_lamp_brightness:46});
eq([legacyPanel.profile,legacyPanel.dim_level,legacyPanel.off,legacyPanel.on,legacyPanel.alert],['dim_off',46,46,100,100],'legacy panel inactive dimming maps exactly to dim_off');
eq(current.normalizePanelLampBrightness({inactive_lamp_default:'dim',inactive_lamp_brightness:18,lamp_brightness:{profile:'normal',dim_level:66}}),{profile:'normal',dim_level:66,off:100,on:100,alert:100},'explicit canonical panel object wins over conflicting legacy fields');
eq(current.normalizePanelLampBrightness({inactive_lamp_default:'normal',lamp_brightness:{profile:'custom',dim_level:45,off:25,on:50,alert:75}}),{profile:'custom',dim_level:45,off:25,on:50,alert:75},'canonical custom panel levels remain independent');
for(const malformed of [null,7,'dim_all',[],false,{}, {profile:''},{profile:'bad'}])eq(current.normalizePanelLampBrightness({inactive_lamp_default:'dim',inactive_lamp_brightness:28,lamp_brightness:malformed}),{profile:'dim_off',dim_level:28,off:28,on:100,alert:100},'malformed or profile-less canonical panel value cannot defeat legacy dimming');
eq(current.normalizePanelLampBrightness({inactive_lamp_default:'dim',inactive_lamp_brightness:100}),{profile:'dim_off',dim_level:90,off:90,on:100,alert:100},'legacy inactive brightness keeps its historical 90 percent maximum');

const inherited=current.normalizePerLampBrightness({}, {lamp_brightness:{profile:'dim_on',dim_level:42}});
eq(inherited,{profile:'dim_on',dim_level:42,off:100,on:42,alert:100,local_profile:'inherit',source:'panel'},'missing per-lamp setting inherits the canonical panel object');
eq(current.normalizePerLampBrightness({inactive_lamp_mode:'dim'},{lamp_brightness:{profile:'normal',dim_level:58}}),{profile:'dim_off',dim_level:58,off:58,on:100,alert:100,local_profile:'dim_off',source:'lamp'},'legacy per-lamp dim maps to dim_off using the panel dim level');
eq(current.normalizePerLampBrightness({inactive_lamp_mode:'normal'},{lamp_brightness:{profile:'dim_all',dim_level:22}}),{profile:'normal',dim_level:22,off:100,on:100,alert:100,local_profile:'normal',source:'lamp'},'legacy per-lamp normal overrides panel dimming');
eq(current.normalizePerLampBrightness({inactive_lamp_mode:'dim',lamp_brightness:{profile:'normal',dim_level:19}},{lamp_brightness:{profile:'dim_all',dim_level:22}}),{profile:'normal',dim_level:19,off:100,on:100,alert:100,local_profile:'normal',source:'lamp'},'explicit canonical lamp object wins over conflicting legacy mode');
eq(current.normalizePerLampBrightness({inactive_lamp_mode:'dim',lamp_brightness:{profile:'inherit'}},{lamp_brightness:{profile:'dim_non_alert',dim_level:31}}),{profile:'dim_non_alert',dim_level:31,off:31,on:31,alert:100,local_profile:'inherit',source:'panel'},'explicit canonical inheritance wins over conflicting legacy lamp dimming');
eq(current.normalizePerLampBrightness({lamp_brightness:{profile:'custom',dim_level:30,off:20}},{lamp_brightness:{profile:'custom',dim_level:70,off:40,on:60,alert:80}}),{profile:'custom',dim_level:30,off:20,on:100,alert:100,local_profile:'custom',source:'lamp'},'partial local custom levels use canonical local defaults instead of inheriting unrelated panel states');
eq(current.normalizePerLampBrightness({lamp_brightness:{profile:'custom',dim_level:20}},{lamp_brightness:{profile:'normal',dim_level:70}}),{profile:'custom',dim_level:20,off:20,on:100,alert:100,local_profile:'custom',source:'lamp'},'raw partial custom normalization matches canonical custom defaults regardless of call order');
for(const malformed of [null,7,'dim_all',[],false,{}, {profile:''},{profile:'bad'}])eq(current.normalizePerLampBrightness({inactive_lamp_mode:'dim',lamp_brightness:malformed},{lamp_brightness:{profile:'normal',dim_level:36}}),{profile:'dim_off',dim_level:36,off:36,on:100,alert:100,local_profile:'dim_off',source:'lamp'},'malformed or profile-less canonical lamp value cannot defeat legacy per-lamp dimming');

const levelFor=(profile,isOn,attention=false,extra={})=>current.resolveLampBrightness({lamp_brightness:{profile,dim_level:37,...(profile==='custom'?{off:21,on:64,alert:88}:{}),...extra}},{},{available:true,isOn,severity:'status',alert:{}},{attentionActive:attention});
for(const profile of profileOrder){
  eq(levelFor(profile,false).percent,profileLevels[profile].off,`${profile} resolves logical OFF level`);
  eq(levelFor(profile,true).percent,profileLevels[profile].on,`${profile} resolves logical ON level`);
  eq(levelFor(profile,false,true).percent,profileLevels[profile].alert,`${profile} resolves alert level independently of logical state`);
}
const customOff=levelFor('custom',false),customOn=levelFor('custom',true),customAlert=levelFor('custom',true,true);
eq([customOff.state,customOff.opacity,customOff.dimmed,customOn.state,customOn.opacity,customAlert.state,customAlert.opacity],['off',0.21,true,'on',0.64,'alert',0.88],'runtime result exposes stable state, percentage-derived opacity, and dim flag');
eq(current.resolveLampBrightness({lamp_brightness:{profile:'dim_all',dim_level:20}},{},{available:false,isOn:false,alert:{active:true}},{lampTest:false}).percent,100,'INOP always uses full brightness');
eq(current.resolveLampBrightness({lamp_brightness:{profile:'dim_all',dim_level:20}},{},{available:true,isOn:false,alert:{active:true}},{lampTest:true}).percent,100,'Lamp Test always uses full brightness');
eq(current.resolveLampBrightness({lamp_brightness:{profile:'custom',off:20,on:60,alert:87}},{},{available:true,isOn:false,alert:{active:true}},{attentionActive:false}).percent,20,'explicit no-attention override resolves the logical state');
eq(current.resolveLampBrightness({lamp_brightness:{profile:'custom',off:20,on:60,alert:87}},{},{available:true,isOn:false,alert:{}},{attentionActive:true}).percent,87,'explicit attention override resolves the alert state');

const evalAndBrightness=(item,state,evalOptions={},brightnessOptions={})=>{
  const normalized=current.normalizeLamp(item),resolved=current.evaluateLampState(normalized,state,{states:{},...evalOptions});
  return {resolved,brightness:current.resolveLampBrightness(normalized,{},resolved,brightnessOptions)};
};
for(const when of ['on','off','both']){
  const state=when==='off'?'off':'on',item={entity:'binary_sensor.a',lamp_type:'alarm',severity:'alarm',alert_style:'blink',alert_when:when,lamp_brightness:{profile:'custom',off:22,on:55,alert:83}};
  const active=evalAndBrightness(item,{state,attributes:{}},{acked:false});
  const acked=evalAndBrightness(item,{state,attributes:{}},{acked:true});
  eq([active.resolved.alert.mainActive,active.brightness.state,active.brightness.percent],[true,'alert',83],`${when} unacknowledged alarm uses alert level`);
  eq([acked.resolved.alert.mainActive,acked.resolved.alert.mainConditionMatched,acked.brightness.state,acked.brightness.percent],[false,true,'alert',83],`${when} acknowledged alarm remains at alert level`);
}
const normalAfterAlarm=evalAndBrightness({entity:'binary_sensor.a',lamp_type:'alarm',severity:'alarm',alert_style:'blink',alert_when:'on',lamp_brightness:{profile:'custom',off:24,on:62,alert:86}},{state:'off',attributes:{}},{acked:true});
eq([normalAfterAlarm.resolved.alert.mainConditionMatched,normalAfterAlarm.brightness.state,normalAfterAlarm.brightness.percent],[false,'off',24],'cleared alarm returns to logical OFF brightness');

for(const [lampType,severity,expectedState] of [['status','status','on'],['status','warn','on'],['alarm','status','alert'],['status','alarm','alert'],['status','trip','alert']]){
  const result=evalAndBrightness({entity:'binary_sensor.a',lamp_type:lampType,severity,alert_style:'none',alert_when:'on',lamp_brightness:{profile:'custom',off:20,on:60,alert:90}},{state:'on',attributes:{}},{acked:true});
  eq(result.brightness.state,expectedState,`${lampType}/${severity} safety classification chooses ${expectedState} level without requiring an animation`);
}

const changed=evalAndBrightness({entity:'binary_sensor.a',lamp_type:'status',alert_style:'none',blink_on_change:true,alert_on_change_style:'blink',lamp_brightness:{profile:'custom',off:20,on:60,alert:84}},{state:'off',attributes:{}},{changeActive:true,changeAcked:false,acked:true});
eq([changed.resolved.alert.changeActive,changed.brightness.state,changed.brightness.percent],[true,'alert',84],'active change alert uses alert level even when the main channel is acknowledged');
const changeCleared=evalAndBrightness({entity:'binary_sensor.a',blink_on_change:true,lamp_brightness:{profile:'custom',off:20,on:60,alert:84}},{state:'off',attributes:{}},{changeActive:false,changeAcked:true});
eq([changeCleared.resolved.alert.changeActive,changeCleared.brightness.state,changeCleared.brightness.percent],[false,'off',20],'acknowledged/cleared change event returns to logical state brightness');

const forceOn=evalAndBrightness({cell_type:'lamp',source_mode:'derived',derived_base_state:'off',enable_auto_styles:true,auto_styles:[{kind:'state',state:'go',force_state:'on'}],lamp_brightness:{profile:'custom',off:23,on:67,alert:89}},{state:'go',attributes:{}},{states:{}});
eq([forceOn.resolved.isOn,forceOn.brightness.state,forceOn.brightness.percent],[true,'on',67],'rule-forced derived ON uses final logical ON brightness');
const forceOff=evalAndBrightness({cell_type:'lamp',source_mode:'derived',derived_base_state:'on',enable_auto_styles:true,auto_styles:[{kind:'state',state:'stop',force_state:'off'}],lamp_brightness:{profile:'custom',off:23,on:67,alert:89}},{state:'stop',attributes:{}},{states:{}});
eq([forceOff.resolved.isOn,forceOff.brightness.state,forceOff.brightness.percent],[false,'off',23],'rule-forced derived OFF uses final logical OFF brightness');
const inverted=evalAndBrightness({entity:'binary_sensor.a',invert:true,lamp_brightness:{profile:'custom',off:23,on:67,alert:89}},{state:'off',attributes:{}});
eq([inverted.resolved.isOn,inverted.brightness.percent],[true,67],'inverted lamp uses final resolved ON brightness');
const alwaysOn=evalAndBrightness({entity:'sensor.a',always_on:true,lamp_brightness:{profile:'custom',off:23,on:67,alert:89}},{state:'0',attributes:{}});
eq([alwaysOn.resolved.isOn,alwaysOn.brightness.percent],[true,67],'always-on lamp uses final resolved ON brightness');

const migratedMissing=current.migrateConfigV2({config_version:2,entities:[{entity:'binary_sensor.old'}]});
ok(!Object.prototype.hasOwnProperty.call(migratedMissing,'lamp_brightness'),'legacy migration does not write a canonical panel object when no brightness setting existed');
ok(!Object.prototype.hasOwnProperty.call(current.normalizeLamp(migratedMissing.entities[0]),'lamp_brightness'),'legacy lamp normalization does not write a canonical object when none existed');
eq(current.normalizePanelLampBrightness(migratedMissing).profile,'normal','legacy config with no dimming remains full brightness');
const migratedLegacy=current.migrateConfigV2({config_version:2,inactive_lamp_default:'dim',inactive_lamp_brightness:41,entities:[{entity:'binary_sensor.old',inactive_lamp_mode:'dim'}]});
eq([current.normalizePanelLampBrightness(migratedLegacy).profile,current.normalizePerLampBrightness(current.normalizeLamp(migratedLegacy.entities[0]),migratedLegacy).profile],['dim_off','dim_off'],'legacy panel and lamp dim settings remain exact dim_off aliases');
for(const malformed of [null,7,'dim_all',[],false,{}, {profile:''},{profile:'bad'}]){
  const malformedMigration=current.migrateConfigV2({config_version:2,inactive_lamp_default:'dim',inactive_lamp_brightness:29,lamp_brightness:malformed,entities:[{entity:'binary_sensor.old',inactive_lamp_mode:'dim',lamp_brightness:malformed}]});
  ok(!Object.prototype.hasOwnProperty.call(malformedMigration,'lamp_brightness'),'migration removes an invalid canonical panel object');
  ok(!Object.prototype.hasOwnProperty.call(current.normalizeLamp(malformedMigration.entities[0]),'lamp_brightness'),'lamp normalization removes an invalid canonical per-lamp object after migration');
  eq(current.normalizePanelLampBrightness(malformedMigration).profile,'dim_off','migration ignores malformed canonical panel values instead of defeating legacy behavior');
  eq(current.normalizePerLampBrightness(current.normalizeLamp(malformedMigration.entities[0]),malformedMigration).profile,'dim_off','lamp normalization ignores malformed canonical values instead of defeating legacy behavior');
}
const migratedCanonical=current.migrateConfigV2({config_version:3,inactive_lamp_default:'dim',lamp_brightness:{profile:'custom',dim_level:44,off:19,on:71,alert:96},entities:[{entity:'binary_sensor.a',inactive_lamp_mode:'dim',lamp_brightness:{profile:'dim_on',dim_level:52}}]});
eq(migratedCanonical.lamp_brightness,{profile:'custom',dim_level:44,off:19,on:71,alert:96},'migration normalizes canonical panel brightness');
eq(current.normalizeLamp(migratedCanonical.entities[0]).lamp_brightness,{profile:'dim_on',dim_level:52,off:100,on:52,alert:100},'lamp normalization preserves canonical per-lamp override');

const stubA=current.AnnunciatorGridCard.getStubConfig(),stubB=current.AnnunciatorGridCard.getStubConfig();
eq(stubA.lamp_brightness,{profile:'normal',dim_level:32,off:100,on:100,alert:100},'new-card defaults use an explicit canonical full-brightness object');
stubA.lamp_brightness.profile='dim_all';eq(stubB.lamp_brightness.profile,'normal','new-card brightness defaults are independent objects');
const newLampA=current.createNewLamp({uid:'a',ackSlot:1}),newLampB=current.createNewLamp({uid:'b',ackSlot:2});
eq(newLampA.lamp_brightness,{profile:'inherit'},'new lamps explicitly inherit the panel brightness profile');newLampA.lamp_brightness.profile='dim_all';eq(newLampB.lamp_brightness.profile,'inherit','new-lamp brightness objects are independent');
const newDerived=current.createNewLamp({uid:'derived',ackSlot:3,kind:'derived'}),newPair=current.createNewPairMembers({topUid:'top',bottomUid:'bottom',topAckSlot:4,bottomAckSlot:5,pairId:'pair'});
eq(newDerived.lamp_brightness,{profile:'inherit'},'new derived lamps inherit the panel brightness profile');ok(newPair.every((lamp)=>lamp.lamp_brightness.profile==='inherit')&&newPair[0].lamp_brightness!==newPair[1].lamp_brightness,'new pair members have independent inherited brightness objects');
const newSpacer=current.createNewLamp({uid:'space',ackSlot:6,kind:'spacer'});ok(!Object.prototype.hasOwnProperty.call(newSpacer,'lamp_brightness'),'spacers do not carry irrelevant lamp brightness configuration');

const panelPreset=current.captureAppearancePreset({panel_theme:'classic',lamp_brightness:{profile:'custom',dim_level:39,off:18,on:63,alert:91}});
eq(panelPreset.lamp_brightness,{profile:'custom',dim_level:39,off:18,on:63,alert:91},'panel appearance presets capture canonical brightness');
const appliedPanel=current.applyAppearancePreset({entities:[{entity:'binary_sensor.keep'}],lamp_brightness:{profile:'normal'}},{id:'bright',name:'Bright',values:panelPreset});
eq(appliedPanel.lamp_brightness,panelPreset.lamp_brightness,'panel appearance preset reapplies canonical brightness');ok(appliedPanel.lamp_brightness!==panelPreset.lamp_brightness,'applied panel brightness does not share its preset object');
const lampPreset=current.captureLampAppearancePreset({entity:'binary_sensor.keep',severity:'trip',lamp_brightness:{profile:'custom',dim_level:35,off:17,on:69,alert:94}});
eq(lampPreset.lamp_brightness,{profile:'custom',dim_level:35,off:17,on:69,alert:94},'lamp appearance presets capture canonical brightness');
const appliedLamp=current.applyLampAppearancePreset({entity:'binary_sensor.keep',severity:'trip',lamp_brightness:{profile:'normal'}},{id:'bright-lamp',name:'Bright lamp',values:lampPreset});
eq(appliedLamp.lamp_brightness,lampPreset.lamp_brightness,'lamp appearance preset reapplies canonical brightness');ok(appliedLamp.lamp_brightness!==lampPreset.lamp_brightness&&appliedLamp.entity==='binary_sensor.keep'&&appliedLamp.severity==='trip','applied lamp brightness is independent and preserves semantics');
const legacyLampPreset=current.captureLampAppearancePreset({entity:'binary_sensor.legacy',inactive_lamp_mode:'dim'});
ok(!Object.prototype.hasOwnProperty.call(legacyLampPreset,'lamp_brightness')&&legacyLampPreset.inactive_lamp_mode==='dim','legacy-only lamp appearance preset retains its alias without baking a canonical level');
const legacyPresetApplied=current.applyLampAppearancePreset({entity:'binary_sensor.keep',severity:'trip',inactive_lamp_mode:'normal',lamp_brightness:{profile:'normal'}},{id:'legacy-dim',name:'Legacy dim',values:legacyLampPreset});
ok(!Object.prototype.hasOwnProperty.call(legacyPresetApplied,'lamp_brightness')&&legacyPresetApplied.inactive_lamp_mode==='dim','applying a legacy-only lamp preset removes a prior canonical override and preserves legacy semantics');
eq(current.normalizePerLampBrightness(legacyPresetApplied,{inactive_lamp_default:'dim',inactive_lamp_brightness:41}),{profile:'dim_off',dim_level:41,off:41,on:100,alert:100,local_profile:'dim_off',source:'lamp'},'legacy-only lamp preset inherits the current panel dim level instead of baking the canonical 32 percent default');

let seed=0xb1262026;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};const pick=(values)=>values[(random()*values.length)|0];
const junkValues=[undefined,null,false,true,-999,999,NaN,Infinity,'bad','DIM_OFF',{},[],()=>{}];
for(let index=0;index<5000;index++){
  const raw={profile:pick([...profileOrder,'inherit','bad',null,{},[]]),dim_level:pick(junkValues),off:pick(junkValues),on:pick(junkValues),alert:pick(junkValues)};
  let panel,local,resolved,migrated;
  try{
    panel=current.normalizePanelLampBrightness({inactive_lamp_default:pick(['normal','dim','bad',null,{}]),inactive_lamp_brightness:pick(junkValues),lamp_brightness:random()>.35?raw:pick([undefined,null,[],7])});
    local=current.normalizePerLampBrightness({inactive_lamp_mode:pick(['inherit','normal','dim','bad',null,{}]),lamp_brightness:random()>.35?raw:pick([undefined,null,[],7])},{lamp_brightness:panel});
    resolved=current.resolveLampBrightness({lamp_brightness:raw},{lamp_brightness:panel},{available:random()>.1,isOn:random()>.5,severity:pick(['status','warn','alarm','trip']),alert:{active:random()>.8,changeActive:random()>.9,mainConditionMatched:random()>.8}},{lampTest:random()>.95});
    migrated=current.migrateConfigV2({lamp_brightness:random()>.4?raw:pick([undefined,null,[],7]),entities:[{entity:'binary_sensor.x',lamp_brightness:random()>.4?raw:pick([undefined,null,[],7])}]});
  }catch(error){throw new Error(`brightness fuzz ${index}: ${error.message}`)}
  for(const value of [panel.off,panel.on,panel.alert,local.off,local.on,local.alert,resolved.percent])ok(Number.isInteger(value)&&value>=10&&value<=100,`brightness fuzz percentage ${index}`);
  ok(profileOrder.includes(panel.profile)&&profileOrder.includes(local.profile),`brightness fuzz profile ${index}`);
  ok(Number.isFinite(resolved.opacity)&&resolved.opacity>=0.1&&resolved.opacity<=1&&resolved.dimmed===(resolved.percent<100),`brightness fuzz runtime output ${index}`);
  ok(migrated.config_version===3,`brightness fuzz migration ${index}`);
}

for(let index=0;index<3000;index++){
  const lamp={entity:'binary_sensor.old',lamp_type:pick(['status','alarm','sensor']),severity:pick(['status','warn','alarm','trip']),eval_mode:pick(['toggle','state_equals','string_match','numeric_threshold']),on_states:'on,true,1,open',state_value:'on',string_match:'contains',string_value:'A',threshold_rule:{type:pick(['above','below','between','equal']),a:10,b:20,inclusive:random()>.5},invert:random()>.8,always_on:random()>.9,alert_style:pick(['none','blink','pulse']),alert_when:pick(['on','off','both'])};
  const state={state:pick(['on','off','12','unavailable','unknown','ABC']),attributes:{friendly_name:'Legacy'}};
  const options={acked:random()>.5,changeActive:random()>.8,changeAcked:random()>.5,states:{'binary_sensor.old':state}};
  const oldResult=baseline.evaluateLampState(lamp,state,options),newResult=current.evaluateLampState(lamp,state,options);
  eq({available:newResult.available,isOn:newResult.isOn,severity:newResult.severity,alert:newResult.alert,display:newResult.display},{available:oldResult.available,isOn:oldResult.isOn,severity:oldResult.severity,alert:oldResult.alert,display:oldResult.display},`v1.0.2 evaluator differential ${index}`);
  eq(current.resolveLampBrightness(lamp,{},newResult).percent,100,`v1.0.2 config remains full brightness ${index}`);
}

console.log(`Brightness profile regression PASS (${checks} checks)`);
