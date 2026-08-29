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

function loadCard() {
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
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','dist','annunciator-grid-card.js'),'utf8'),sandbox,{filename:'annunciator-grid-card.js'});
  return sandbox.window.__ANNUNCIATOR_TEST_API__;
}

const api=loadCard();
const required=['normalizeDynamicTextRule','normalizeDynamicTextLine','normalizeDynamicTextConfig','dynamicTextRuleMatches','resolveDynamicTextLine','resolveDisplayLines','evaluateLampState','normalizeLamp','normalizeLampIconColorMode','resolveLampIconColor'];
eq(required.filter((name)=>typeof api?.[name]!=='function'),[],'all dynamic text and icon-color test hooks are exported');
eq(api.DYNAMIC_TEXT_RULE_KINDS,['lamp_on','lamp_off','unavailable','unknown','state_equals','string','numeric','acknowledged','unacknowledged','alarm_active','alarm_inactive'],'dynamic condition order is stable');
eq(api.DYNAMIC_TEXT_RULE_LIMIT,24,'dynamic rules have a defensive per-line limit');
eq(api.LAMP_ICON_COLOR_MODES,['follow','single','state'],'icon color modes are stable');

const state=(value,attributes={})=>({state:String(value),attributes:{friendly_name:'Test lamp',...attributes},last_changed:'2026-08-28T10:00:00Z',last_updated:'2026-08-28T10:01:00Z'});
const evaluate=(lamp,value,options={})=>api.evaluateLampState({entity:'binary_sensor.test',primary_mode:'state_labels',...lamp},value===null?null:state(value),{states:{},...options});

// Simple ON/OFF labels use the final logical state and remain opt-in.
const labels={labels:{on:'ACTIVE',off:'TRIP',unavailable:'OUT OF SERVICE',unknown:'NO DATA'}};
eq(evaluate({dynamic_text:{primary:labels}},'on').display.primary,'ACTIVE','ON label resolves from final logical ON');
eq(evaluate({dynamic_text:{primary:labels}},'off').display.primary,'TRIP','OFF label resolves from final logical OFF');
eq(evaluate({invert:true,dynamic_text:{primary:labels}},'off').display.primary,'ACTIVE','invert is applied before label selection');
eq(evaluate({always_on:true,dynamic_text:{primary:labels}},'off').display.primary,'ACTIVE','always-on is applied before label selection');
eq(evaluate({dynamic_text:{primary:labels}},'off',{lampTest:true}).display.primary,'ACTIVE','Lamp Test has final authority before label selection');
eq(evaluate({dynamic_text:{primary:labels}},'unavailable').display.primary,'OUT OF SERVICE','unavailable label replaces the normal INOP line');
eq(evaluate({dynamic_text:{primary:labels}},'unknown').display.primary,'NO DATA','unknown label is independently configurable');
eq(evaluate({dynamic_text:{primary:labels}},null).display.primary,'OUT OF SERVICE','missing entity uses unavailable label');
ok(evaluate({dynamic_text:{primary:labels}},'unavailable').display.handlesUnavailable,'custom unavailable label hides the redundant global INOP text');

const forced={enable_auto_styles:true,auto_styles:[{kind:'state',state:'off',force_state:'on'}],dynamic_text:{primary:labels}};
eq(evaluate(forced,'off').display.primary,'ACTIVE','rule-forced ON is applied before label selection');
const forcedOff={enable_auto_styles:true,auto_styles:[{kind:'state',state:'on',force_state:'off'}],dynamic_text:{primary:labels}};
eq(evaluate(forcedOff,'on').display.primary,'TRIP','rule-forced OFF is applied before label selection');

const independent=evaluate({primary_mode:'state_labels',secondary_mode:'state_labels',tertiary_mode:'state_labels',dynamic_text:{primary:{labels:{on:'P1'}},secondary:{labels:{on:'S2'}},tertiary:{labels:{on:'T3'}}}},'on');
eq([independent.display.primary,independent.display.secondary,independent.display.tertiary],['P1','S2','T3'],'all three lines resolve independently');

// Ordered dynamic rules: first enabled match wins and fallback remains explicit.
const rules=[
  {enabled:false,kind:'lamp_on',text:'DISABLED'},
  {kind:'state_equals',state:'on',text:'EXACT'},
  {kind:'lamp_on',text:'LATER'},
];
let dynamic=evaluate({primary_mode:'dynamic',dynamic_text:{primary:{fallback:'FALLBACK',rules}}},'on');
eq([dynamic.display.primary,dynamic.display.dynamic.primary.index,dynamic.display.dynamic.primary.kind],['EXACT',1,'state_equals'],'first enabled matching rule wins');
dynamic=evaluate({primary_mode:'dynamic',dynamic_text:{primary:{fallback:'FALLBACK',rules:[{kind:'state_equals',state:'never',text:'NO'}]}}},'on');
eq([dynamic.display.primary,dynamic.display.dynamic.primary.matched],['FALLBACK',false],'fallback is used when no rule matches');

const cases=[
  [{kind:'lamp_on',text:'ON'},'on',{},'ON'],
  [{kind:'lamp_off',text:'OFF'},'off',{},'OFF'],
  [{kind:'state_equals',state:'FAULT',text:'FAULTED'},'FAULT',{},'FAULTED'],
  [{kind:'string',match:'contains',value:'AULT',text:'CONTAINS'},'FAULT',{},'CONTAINS'],
  [{kind:'string',match:'starts_with',value:'FA',text:'START'},'FAULT',{},'START'],
  [{kind:'string',match:'ends_with',value:'LT',text:'END'},'FAULT',{},'END'],
  [{kind:'string',match:'equals',value:'FAULT',text:'EQUAL'},'FAULT',{},'EQUAL'],
  [{kind:'acknowledged',text:'ACKED'},'on',{acked:true},'ACKED'],
  [{kind:'unacknowledged',text:'UNACKED'},'on',{acked:false},'UNACKED'],
];
for(const [rule,value,options,expected] of cases){
  const result=evaluate({primary_mode:'dynamic',dynamic_text:{primary:{fallback:'MISS',rules:[rule]}}},value,options);
  eq(result.display.primary,expected,`${rule.kind}/${rule.match||''} condition resolves safely`);
}

for(const [threshold,value,expected] of [
  [{type:'above',a:10,inclusive:true},10,'MATCH'],[{type:'above',a:10,inclusive:false},10,'MISS'],
  [{type:'below',a:10,inclusive:true},10,'MATCH'],[{type:'below',a:10,inclusive:false},10,'MISS'],
  [{type:'between',a:10,b:20,inclusive:true},20,'MATCH'],[{type:'between',a:10,b:20,inclusive:false},20,'MISS'],
  [{type:'equal',a:10},10,'MATCH'],
]){
  const result=api.evaluateLampState({entity:'sensor.number',primary_mode:'dynamic',value_format:{scale:2,offset:2},dynamic_text:{primary:{fallback:'MISS',rules:[{kind:'numeric',text:'MATCH',rule:threshold}]}}},state((Number(value)-2)/2),{states:{}});
  eq(result.display.primary,expected,`${threshold.type}/${threshold.inclusive!==false?'inclusive':'exclusive'} uses transformed numeric value`);
}

const alarmLamp={entity:'binary_sensor.alarm',primary_mode:'dynamic',alert_style:'blink',alert_when:'on',dynamic_text:{primary:{fallback:'QUIET',rules:[{kind:'alarm_active',text:'ALARM'}]}}};
eq(api.evaluateLampState(alarmLamp,state('on'),{acked:false,states:{}}).display.primary,'ALARM','alarm-active text follows the configured main alarm condition');
eq(api.evaluateLampState(alarmLamp,state('on'),{acked:true,states:{}}).display.primary,'ALARM','acknowledgement silences animation but does not erase the active alarm condition label');
eq(api.evaluateLampState(alarmLamp,state('off'),{acked:false,states:{}}).display.primary,'QUIET','alarm-inactive condition falls through when alarm is normal');
const inactiveAlarm={...alarmLamp,dynamic_text:{primary:{fallback:'MISS',rules:[{kind:'alarm_inactive',text:'NORMAL'}]}}};
eq(api.evaluateLampState(inactiveAlarm,state('off'),{states:{}}).display.primary,'NORMAL','alarm-inactive condition matches normal alarm state');

for(const [value,kind,expected] of [['unavailable','unavailable','U'],['unknown','unknown','?']]){
  const result=evaluate({primary_mode:'dynamic',dynamic_text:{primary:{fallback:'F',rules:[{kind,text:expected}]}}},value);
  eq([result.display.primary,result.display.handlesUnavailable],[expected,true],`${kind} dynamic rule replaces global INOP safely`);
}
const unavailableFallback=evaluate({primary_mode:'dynamic',dynamic_text:{primary:{fallback:'F',rules:[{kind:'lamp_on',text:'ON'}]}}},'unavailable');
eq([unavailableFallback.display.primary,unavailableFallback.display.handlesUnavailable],['F',false],'dynamic fallback does not accidentally hide the global INOP indicator');

// Templates and all legacy display modes retain their established precedence.
const templated=evaluate({use_templates:true,label_template:'{{name}} TEMPLATE',legend_template:'{{state}} RAW',primary_mode:'dynamic',secondary_mode:'state_labels',dynamic_text:{primary:{rules:[{kind:'lamp_on',text:'WRONG'}]},secondary:labels}},'on');
eq([templated.display.primary,templated.display.secondary],['Test lamp TEMPLATE','on RAW'],'templates remain authoritative over dynamic display controls');
const legacy=api.evaluateLampState({entity:'sensor.a',name_override:'CUSTOM',label_source:'custom',primary_mode:'name',secondary_mode:'state',tertiary_mode:'entity_id'},state('12',{unit_of_measurement:'V'}),{states:{}});
eq([legacy.display.primary,legacy.display.secondary,legacy.display.tertiary],['CUSTOM','12 V','sensor.a'],'existing display modes remain unchanged when new modes are not selected');
ok(!Object.prototype.hasOwnProperty.call(api.normalizeLamp({entity:'binary_sensor.old'}),'dynamic_text'),'old lamps are not rewritten with unused dynamic-text settings');

// Normalization is bounded, deterministic, non-mutating, and tolerant of hostile data.
const tooMany=Array.from({length:40},(_,index)=>({name:`R${index}`,kind:index%2?'lamp_on':'bad',text:`T${index}`}));
const normalized=api.normalizeDynamicTextLine({labels:{on:'A\u0000B'},fallback:'F\u0007X',rules:tooMany});
eq(normalized.rules.length,24,'normalization caps rules at 24');
eq([normalized.labels.on,normalized.fallback],['AB','FX'],'control characters are removed from display text');
ok(normalized.rules.every((rule)=>api.DYNAMIC_TEXT_RULE_KINDS.includes(rule.kind)),'unknown rule kinds fail safely to a supported condition');
eq(api.normalizeDynamicTextLine(normalized),normalized,'dynamic line normalization is idempotent');
const source={labels:{on:'ORIGINAL'},rules:[{kind:'lamp_on',text:'X'}]},before=JSON.stringify(source);api.normalizeDynamicTextLine(source);eq(JSON.stringify(source),before,'normalization does not mutate its input');
eq(api.normalizeDynamicTextConfig({primary:[],secondary:'bad',tertiary:{fallback:'OK'},extra:{}}),{tertiary:{labels:{on:'ON',off:'OFF',unavailable:'INOP',unknown:'UNKNOWN'},fallback:'OK',rules:[]}},'malformed per-line values are ignored without leaking unknown keys');

const malformed=[undefined,null,false,true,0,1,'text',[],{},()=>{},Symbol('x'),{rules:'bad'},{rules:[null,false,{},Symbol('r')]},{labels:{on:{},off:Symbol('o')}},{rules:[{kind:'numeric',rule:{a:Infinity,b:NaN}}]}];
for(let index=0;index<malformed.length;index+=1){
  let value=malformed[index],threw=false,result;
  try{result=api.normalizeDynamicTextLine(value)}catch{threw=true}
  ok(!threw,`malformed dynamic input ${index} never throws`);
  if(!threw)ok(Array.isArray(result.rules)&&result.rules.length<=24,`malformed dynamic input ${index} returns a bounded rule array`);
}

// Legacy and explicit icon-color behavior.
eq(api.normalizeLampIconColorMode(undefined,false),'follow','missing icon color settings follow lamp text');
eq(api.normalizeLampIconColorMode(undefined,true),'single','legacy override switch migrates to one custom color');
eq(api.normalizeLampIconColorMode('STATE',false),'state','icon color mode is case-normalized');
eq(api.normalizeLampIconColorMode('bad',false),'follow','unknown icon color mode fails safely');
const legacyIcon=api.normalizeLamp({entity:'binary_sensor.a',icon_color_enabled:true,icon_color:'#123456'});
eq([legacyIcon.icon_color_mode,legacyIcon.icon_color_enabled,api.resolveLampIconColor(legacyIcon,{available:true,isOn:false})],['single',true,'#123456'],'legacy single icon override preserves its visual result');
const stateIcon=api.normalizeLamp({entity:'binary_sensor.a',icon_color_mode:'state',icon_color_on:'#00ff00',icon_color_off:'#333333'});
eq([api.resolveLampIconColor(stateIcon,{available:true,isOn:true}),api.resolveLampIconColor(stateIcon,{available:true,isOn:false})],['#00ff00','#333333'],'separate ON/OFF icon colors follow the final logical state');
eq(api.resolveLampIconColor(stateIcon,{available:false,isOn:true}),'','unavailable icon inherits unavailable text color');
eq(api.resolveLampIconColor({icon_color_mode:'follow',icon_color:'#ffffff'},{available:true,isOn:true}),'','follow mode ignores stale custom colors');
eq(api.resolveLampIconColor({icon_color_mode:'state',icon_color_on:'',icon_color_off:''},{available:true,isOn:true}),'','blank state color safely falls back to inherited text color');

const preset=api.captureLampAppearancePreset({entity:'binary_sensor.a',icon_color_mode:'state',icon_color_on:'#0f0',icon_color_off:'#333'});
eq([preset.icon_color_mode,preset.icon_color_on,preset.icon_color_off],['state','#0f0','#333'],'lamp appearance preset captures state icon colors');
const applied=api.applyLampAppearancePreset({entity:'binary_sensor.a',name_override:'Keep me'},{id:'p',name:'P',values:preset});
eq([applied.name_override,applied.icon_color_mode,applied.icon_color_on,applied.icon_color_off],['Keep me','state','#0f0','#333'],'lamp appearance preset restores state icon colors without changing identity');

console.log(`Dynamic text/icon regression PASS (${checks} checks)`);
