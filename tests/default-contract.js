'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const src=fs.readFileSync(path.join(__dirname,'..','dist','annunciator-grid-card.js'),'utf8');
let checks=0;
const ok=(value,message)=>{checks++;if(!value)throw new Error(message)};
const eq=(actual,expected,message)=>{checks++;if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)};
class HTMLElement{}
const registry=new Map();
const sandbox={console,setTimeout,clearTimeout,queueMicrotask,HTMLElement,window:{__ANNUNCIATOR_TEST_MODE__:true,customCards:[]},document:{createElement:()=>({style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},append(){},addEventListener(){}})},customElements:{get:(name)=>registry.get(name),define:(name,value)=>registry.set(name,value)},CustomEvent:class{},ResizeObserver:undefined,requestAnimationFrame:(cb)=>{cb();return 1},cancelAnimationFrame(){},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},CSS:{escape:String},Math,Date,Number,String,Boolean,Array,Object,Set,Map,JSON,RegExp};
sandbox.window.window=sandbox.window;sandbox.window.document=sandbox.document;sandbox.window.customElements=sandbox.customElements;
vm.createContext(sandbox);vm.runInContext(src,sandbox,{filename:'annunciator-grid-card.js'});
const A=sandbox.window.__ANNUNCIATOR_TEST_API__,Card=A.AnnunciatorGridCard;

const first=Card.getStubConfig(),second=Card.getStubConfig();
first.header_controls.acknowledge.label='CHANGED';first.severity_colors.on='#000000';first.header_tallies.active=true;
ok(second.header_controls.acknowledge.label==='ACKNOWLEDGE','stub header controls are independent');
ok(second.severity_colors.on!=='#000000','stub severity colors are independent');
ok(second.header_tallies.active===false,'stub tally defaults are independent');

const severityA=A.createSeverityColorDefaults(),severityB=A.createSeverityColorDefaults();severityA.on='#111111';
ok(severityB.on!=='#111111','severity default factory returns fresh objects');
const talliesA=A.createHeaderTalliesDefaults(),talliesB=A.createHeaderTalliesDefaults();talliesA.active=true;
ok(talliesB.active===false&&talliesA!==talliesB,'header tally factory returns fresh objects');
const controlsA=A.createHeaderControlsDefaults(),controlsB=A.createHeaderControlsDefaults();controlsA.acknowledge.label='MUTATED';
ok(controlsB.acknowledge.label==='ACKNOWLEDGE'&&controlsA.acknowledge!==controlsB.acknowledge,'header control factory returns fresh nested objects');
ok(A.mergeSeverityColors({frame:'#123456'}).frame_enabled===true,'legacy frame presence enables its compatibility override');
ok(A.mergeSeverityColors({frame:'#123456',frame_enabled:false}).frame_enabled===false,'explicit false frame override remains false');
ok(A.mergeSeverityColors({panel:'#123456'}).panel_enabled===true,'legacy panel presence enables its compatibility override');
ok(A.mergeSeverityColors({panel:'#123456',panel_enabled:false}).panel_enabled===false,'explicit false panel override remains false');

const normal=A.createNewLamp({uid:'normal',ackSlot:1});
ok(normal.cell_type==='lamp'&&normal.color_behavior==='standard'&&normal.ack_rearm==='inherit','new normal lamp uses simple panel-inheriting defaults');
ok(normal.translucent_illumination===false&&normal.shape==='inherit'&&normal.alert_style==='none','new normal lamp does not opt into v1.1 visuals or alerts');
const logic=A.createNewLamp({uid:'logic',ackSlot:2,kind:'derived'});
ok(logic.cell_type==='lamp'&&logic.source_mode==='derived'&&!logic.entity,'new rule-driven lamp remains an entityless lamp');
ok(logic.enable_auto_styles===true&&Array.isArray(logic.auto_styles),'new rule-driven lamp starts with an independent rules array');
const logicTwin=A.createNewLamp({uid:'logic-twin',ackSlot:20,kind:'derived'});logic.auto_styles.push({kind:'state',state:'on'});logic.colors.on='#123456';logic.threshold_rule.a=99;
ok(logicTwin.auto_styles.length===0&&logicTwin.colors.on!=='#123456'&&logicTwin.threshold_rule.a!==99,'new lamp factory returns independent arrays and nested objects');
const spacer=A.createNewLamp({uid:'spacer',ackSlot:3,kind:'spacer'});
ok(A.isSpacerItem(spacer)&&spacer.pair_mode==='none'&&!spacer.pair_id,'new spacer has no pairing metadata');
const pair=A.createNewPairMembers({topUid:'top',bottomUid:'bottom',topAckSlot:4,bottomAckSlot:5,pairId:'pair',orientation:'horizontal'});
ok(pair.length===2&&pair.every((lamp)=>!A.isSpacerItem(lamp)&&lamp.cell_type==='lamp'),'new paired drafts retain lamp identity, never spacers');
ok(pair[0].pair_mode==='top'&&pair[1].pair_mode==='bottom'&&pair.every((lamp)=>lamp.pair_id==='pair'&&lamp.pair_orientation==='horizontal'),'new paired members have one canonical relationship');
pair[0].colors.on='#abcdef';ok(pair[1].colors.on!=='#abcdef','paired member nested defaults are independent');
const renderModel=A.buildRenderItems([{uid:'one',entity:'binary_sensor.one',group:'Plant'},{uid:'top',entity:'binary_sensor.top',group:'Plant',pair_id:'p',pair_mode:'top'},{uid:'bottom',entity:'binary_sensor.bottom',group:'Plant',pair_id:'p',pair_mode:'bottom'},{uid:'orphan',entity:'binary_sensor.orphan',pair_id:'bad',pair_mode:'bottom'}],true);
ok(renderModel.renderItems.map((item)=>item.__type).join(',')==='group_header,lamp,lamp_pair,lamp','render-item builder inserts one group header, one valid pair, and preserves malformed orphan halves');
const pairIndex=A.buildPairEntityIndex(renderModel.renderItems);ok(pairIndex['binary_sensor.top']==='binary_sensor.bottom'&&pairIndex['binary_sensor.bottom']==='binary_sensor.top'&&!pairIndex['binary_sensor.orphan'],'pair entity index includes only canonical complete pairs');

const optionContracts=[
  ['lamp source',A.LAMP_SOURCE_OPTIONS,['entity','derived']],
  ['lamp type',A.LAMP_TYPE_OPTIONS,['alarm','status','sensor','custom']],
  ['color behavior',A.COLOR_BEHAVIOR_OPTIONS,['standard','severity','custom']],
  ['severity',A.SEVERITY_OPTIONS,['status','warn','alarm','trip']],
  ['alert effect',A.ALERT_EFFECT_OPTIONS,['none','blink','pulse','wave','throb','heartbeat','flash']],
  ['lamp shape',A.LAMP_SHAPE_OPTIONS,['inherit','rectangle','round_rectangle','pill','square','circle','indicator_dot']],
];
optionContracts.forEach(([name,table,expected])=>{ok(Array.isArray(table),`${name} options are exported as an array`);const values=table.map((entry)=>entry[0]),labels=table.map((entry)=>entry[1]);eq(values,expected,`${name} options preserve required order`);ok(values.length===new Set(values).size,`${name} option values are unique`);ok(labels.length===new Set(labels).size,`${name} option labels are unique`);ok(table.every((entry)=>Array.isArray(entry)&&entry.length===2&&typeof entry[0]==='string'&&entry[0]&&typeof entry[1]==='string'&&entry[1].trim()),`${name} options contain complete value/label pairs`)});

const metadataContracts=[
  ['lamp editor pages',A.LAMP_EDITOR_PAGE_SPECS,['setup','display','behavior','appearance','interaction','rules','advanced']],
  ['panel editor pages',A.PANEL_EDITOR_PAGE_SPECS,['layout','appearance','acknowledgement','alarm_output','groups','advanced']],
  ['live tallies',A.LIVE_TALLY_SPECS,['active','alarm','unacknowledged','total','unavailable']],
  ['header controls',A.HEADER_CONTROL_SPECS,['acknowledge','silence','reset','lamp_test','clear_acknowledged']],
  ['historical tallies',A.HISTORICAL_TALLY_SPECS,['alarms_day','alarms_week','alarms_month','alarms_year']],
];
metadataContracts.forEach(([name,specs,expected])=>{ok(Array.isArray(specs),`${name} metadata is exported as an array`);const keys=specs.map((spec)=>spec.key),labels=specs.map((spec)=>spec.label);eq(keys,expected,`${name} preserve required order`);ok(keys.length===new Set(keys).size,`${name} keys are unique`);ok(labels.length===new Set(labels).size,`${name} labels are unique`);ok(specs.every((spec)=>spec&&typeof spec.key==='string'&&spec.key&&typeof spec.label==='string'&&spec.label.trim()),`${name} entries have complete keys and labels`)});
ok(A.HEADER_CONTROL_SPECS.every((spec)=>typeof spec.tip==='string'&&spec.tip.trim()),'header control metadata has concise help text for every action');
eq(A.HISTORICAL_TALLY_SPECS.map((spec)=>spec.entityKey),['alarms_day_entity','alarms_week_entity','alarms_month_entity','alarms_year_entity'],'historical tally entity keys follow tally order');
ok(new Set(A.HISTORICAL_TALLY_SPECS.map((spec)=>spec.entityKey)).size===A.HISTORICAL_TALLY_SPECS.length,'historical tally entity keys are unique');
ok(A.HISTORICAL_TALLY_SPECS.every((spec)=>typeof spec.window==='string'&&spec.window.trim()),'historical tally metadata describes every rolling window');

const expectedControlOrder=A.HEADER_CONTROL_SPECS.map((spec)=>spec.key);
eq(Object.keys(A.createHeaderControlsDefaults()),expectedControlOrder,'header control factory order matches centralized metadata');
eq(Object.keys(A.createHeaderTalliesDefaults()),[...A.LIVE_TALLY_SPECS.map((spec)=>spec.key),...A.HISTORICAL_TALLY_SPECS.map((spec)=>spec.key),'history_source'],'header tally factory order matches centralized metadata');
const defaultControls=A.createHeaderControlsDefaults(false,false);
eq(Object.values(defaultControls).map((control)=>control.label),A.HEADER_CONTROL_SPECS.map((spec)=>spec.label),'header control factory labels match centralized metadata');
eq(Object.values(defaultControls).map((control)=>control.enabled),[false,false,false,false,false],'header control visibility arguments do not enable unrelated controls');
const defaultTallies=A.createHeaderTalliesDefaults();
ok([...A.LIVE_TALLY_SPECS,...A.HISTORICAL_TALLY_SPECS].every((spec)=>defaultTallies[spec.key]===false),'every new tally remains opt-in');
ok(defaultTallies.history_source==='local','new historical tallies remain browser-local by default');

const legacy=A.migrateConfigV2({config_version:2,entities:[{entity:'binary_sensor.old'}]});
ok(legacy.header_tallies.history_source==='local','legacy migration remains local without opt-in');
ok(A.normalizeLamp(legacy.entities[0]).color_behavior==='legacy'&&A.normalizeLamp(legacy.entities[0]).ack_rearm==='manual','legacy lamp behavior remains unchanged by new-item factories');
ok(!/recorder\/(statistics|history)|\/api\/history\/period/.test(src),'card source does not couple historical tallies to internal Recorder queries');

for(let i=0;i<2000;i++){
  const value={frame_enabled:i%3===0?false:undefined,panel_enabled:i%5===0?false:undefined,on:i%7===0?null:`#${(i%0xffffff).toString(16).padStart(6,'0')}`};
  const merged=A.mergeSeverityColors(value);ok(merged&&typeof merged==='object'&&merged.enabled===true,`severity merge fuzz ${i}`);
  const created=A.createNewLamp({uid:`f${i}`,ackSlot:i+10,kind:i%7===0?'spacer':i%11===0?'derived':'lamp'});ok(created&&typeof created==='object'&&created.uid===`f${i}`,`new-cell factory fuzz ${i}`);
}

console.log(`Default/metadata contract PASS (${checks} checks)`);
