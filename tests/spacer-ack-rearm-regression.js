'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const src=fs.readFileSync(path.join(__dirname,'..','dist','annunciator-grid-card.js'),'utf8');
let checks=0;const fail=m=>{throw new Error(m)};const ok=(v,m)=>{checks++;if(!v)fail(m)};const eq=(a,b,m)=>{checks++;if(JSON.stringify(a)!==JSON.stringify(b))fail(`${m}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`)};
class HTMLElement{};const registry=new Map();const document={createElement:n=>({nodeName:n,style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},append(){},addEventListener(){}})};
const sandbox={console,setTimeout,clearTimeout,queueMicrotask,HTMLElement,window:{__ANNUNCIATOR_TEST_MODE__:true,customCards:[]},document,customElements:{get:n=>registry.get(n),define:(n,c)=>registry.set(n,c)},CustomEvent:class{},ResizeObserver:undefined,requestAnimationFrame:cb=>{cb();return 1},cancelAnimationFrame(){},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},CSS:{escape:String},Math,Date,Number,String,Boolean,Array,Object,Set,Map,JSON,RegExp,Event:class{}};
sandbox.window.window=sandbox.window;sandbox.window.document=document;sandbox.window.customElements=sandbox.customElements;vm.createContext(sandbox);vm.runInContext(src,sandbox);const A=sandbox.window.__ANNUNCIATOR_TEST_API__;

// Compatibility-safe spacer normalization and resolution.
eq(A.normalizeSpacerAppearance(undefined,false).mode,'default','missing global spacer mode preserves compatibility');
eq(A.normalizeSpacerAppearance(undefined,true).mode,'inherit','missing per-spacer mode inherits panel');
let spacer=A.normalizeSpacerAppearance({mode:'CUSTOM',fill:' #112233 ',frame:' #223344 ',border:' #334455 ',border_width:999},false);
eq([spacer.mode,spacer.fill,spacer.bezel,spacer.border,spacer.border_width],['custom','#112233','#223344','#334455',24],'custom spacer values normalize and frame alias works');
eq(A.normalizeSpacerAppearance({mode:'bad'},false).mode,'default','invalid global spacer mode is compatibility-safe');
eq(A.normalizeSpacerAppearance({mode:'bad'},true).mode,'inherit','invalid local spacer mode is inheritance-safe');
const colors={enabled:true,off:'#eeeeee',off_enabled:true,blank:'#191919',blank_enabled:true};
eq(A.resolveSpacerAppearance({}, {}, colors).mode,'default','legacy spacer resolves to compatibility appearance');
eq(A.resolveSpacerAppearance({}, {spacer_appearance:{mode:'blend'}}, colors),{mode:'blend',fill:'transparent',bezel:'transparent',border:'transparent',borderWidth:0},'global blend resolves as transparent gap');
eq(A.resolveSpacerAppearance({spacer_appearance:{mode:'default'}},{spacer_appearance:{mode:'blend'}},colors).mode,'default','per-spacer compatibility overrides global blend');
eq(A.resolveSpacerAppearance({spacer_appearance:{mode:'custom',fill:'#010203',bezel:'#040506',border:'#070809',border_width:3}},{spacer_appearance:{mode:'blend'}},colors),{mode:'custom',fill:'#010203',bezel:'#040506',border:'#070809',borderWidth:3},'per-spacer custom overrides global blend');
eq(A.resolveSpacerAppearance({spacer_appearance:{mode:'custom'}},{},colors),{mode:'custom',fill:'#eeeeee',bezel:'#191919',border:'rgba(0,0,0,0.55)',borderWidth:2},'custom spacer has global-color compatibility fallbacks');
spacer=A.normalizeSpacerAppearance({mode:'custom',fill_none:true,bezel_none:1,border_none:true},false);
eq([spacer.fill_none,spacer.bezel_none,spacer.border_none],[true,false,true],'spacer None flags require explicit booleans');
eq(A.resolveSpacerAppearance({spacer_appearance:{mode:'custom',fill:'#010203',bezel:'#040506',border:'#070809',border_width:8,fill_none:true,bezel_none:true,border_none:true}},{},colors),{mode:'custom',fill:'transparent',bezel:'transparent',border:'transparent',borderWidth:0},'custom spacer independently removes all three surface layers');
eq(A.resolveSpacerAppearance({spacer_appearance:{mode:'inherit'}},{spacer_appearance:{mode:'custom',fill:'#010203',bezel:'#040506',border:'#070809',border_width:8,bezel_none:true}},colors),{mode:'custom',fill:'#010203',bezel:'transparent',border:'#070809',borderWidth:8},'inherited global spacer keeps independent None flags');
const panelSurface=A.normalizePanelAppearance({background_none:true,border_none:true,frame_none:true,lamp_frame_none:true,lamp_border_none:true});
eq([panelSurface.background_none,panelSurface.border_none,panelSurface.frame_none,panelSurface.lamp_frame_none,panelSurface.lamp_border_none],[true,true,true,true,true],'panel and lamp None switches normalize');
const headerSurface=A.normalizeHeaderAppearance({background_none:true,border_none:true,button_background_none:true,button_border_none:true});
eq([headerSurface.background_none,headerSurface.border_none,headerSurface.button_background_none,headerSurface.button_border_none],[true,true,true,true],'header None switches normalize');

// Existing lamps stay explicitly manual; new inheritance uses the panel default.
eq(A.normalizeLamp({entity:'binary_sensor.legacy'}).ack_rearm,'manual','missing legacy lamp rearm remains manual');
eq(A.normalizeLamp({entity:'binary_sensor.bad',ack_rearm:'bad'}).ack_rearm,'manual','invalid lamp rearm fails safe to manual');
eq(A.resolveAckRearm({ack_rearm:'inherit'},{ack_rearm_default:'auto'}),'auto','lamp inherits automatic panel default');
eq(A.resolveAckRearm({ack_rearm:'inherit'},{ack_rearm_default:'manual'}),'manual','lamp inherits manual panel default');
eq(A.resolveAckRearm({ack_rearm:'manual'},{ack_rearm_default:'auto'}),'manual','lamp manual override wins');
eq(A.resolveAckRearm({ack_rearm:'auto'},{ack_rearm_default:'manual'}),'auto','lamp automatic override wins');
eq(A.normalizeAckRearmDefault('bad'),'manual','malformed panel default fails safe to manual');
eq(A.migrateConfigV2({config_version:2}).ack_rearm_default,'auto','migrated panel has automatic default for future inherited lamps');

const state=s=>({state:s,attributes:{friendly_name:'Alarm'}});
const resolved=(lamp,value)=>A.evaluateLampState(lamp,state(value),{states:{}});
const base={entity:'binary_sensor.alarm',ack_rearm:'auto',alert_style:'blink',alert_when:'on'};
ok(!A.shouldAutoRearm(base,resolved(base,'on'),true,{}),'automatic ON alert remains acknowledged while active');
ok(A.shouldAutoRearm(base,resolved(base,'off'),true,{}),'automatic ON alert rearms after normal');
const steady={...base,alert_style:'none'};
ok(!A.shouldAutoRearm(steady,resolved(steady,'on'),true,{}),'steady/no-effect lamp does not rearm while its condition is active');
ok(A.shouldAutoRearm(steady,resolved(steady,'off'),true,{}),'steady/no-effect lamp rearms after its condition is normal');
const offAlarm={...base,alert_when:'off'};
ok(!A.shouldAutoRearm(offAlarm,resolved(offAlarm,'off'),true,{}),'OFF-state alert remains acknowledged while active');
ok(A.shouldAutoRearm(offAlarm,resolved(offAlarm,'on'),true,{}),'OFF-state alert rearms after normal');
const both={...base,alert_when:'both'};
ok(!A.shouldAutoRearm(both,resolved(both,'on'),true,{}),'both-state alert has no automatic normal state ON');
ok(!A.shouldAutoRearm(both,resolved(both,'off'),true,{}),'both-state alert has no automatic normal state OFF');
ok(!A.shouldAutoRearm({...base,ack_rearm:'manual'},resolved(base,'off'),true,{ack_rearm_default:'auto'}),'manual override never auto clears');
ok(!A.shouldAutoRearm({...base,ack_rearm:'inherit'},resolved(base,'off'),true,{ack_rearm_default:'manual'}),'inherited manual default never auto clears');
ok(A.shouldAutoRearm({...base,ack_rearm:'inherit'},resolved(base,'off'),true,{ack_rearm_default:'auto'}),'inherited automatic default clears after normal');
ok(!A.shouldAutoRearm(base,resolved(base,'off'),false,{}),'unacknowledged lamp has nothing to clear');
ok(!A.shouldAutoRearm(base,A.evaluateLampState(base,state('unavailable'),{states:{}}),true,{}),'unavailable source never clears a stored ACK');

// Exercise the actual ACK map mutation contract, including independent pair halves.
const pairTop={...base,uid:'pair-top',ack_slot:1,pair_id:'pair',pair_mode:'top',ack_rearm:'inherit'};
const pairBottom={...base,uid:'pair-bottom',ack_slot:2,pair_id:'pair',pair_mode:'bottom',ack_rearm:'manual'};
const ackMap={'panel::pair-top':100,'panel::pair-bottom':100};const ack=new A.AckManager('panel',ackMap);
if(A.shouldAutoRearm(pairTop,resolved(pairTop,'off'),ack.isAcked(pairTop,'main'),{ack_rearm_default:'auto'}))ack.clear(pairTop,'main');
if(A.shouldAutoRearm(pairBottom,resolved(pairBottom,'off'),ack.isAcked(pairBottom,'main'),{ack_rearm_default:'auto'}))ack.clear(pairBottom,'main');
ok(!ack.isAcked(pairTop,'main'),'automatic pair half clears after normal');ok(ack.isAcked(pairBottom,'main'),'manual pair half remains acknowledged');ok(ack.dirty,'automatic clear marks ACK map dirty for persistence');

// Deterministic state-machine fuzz: effect presence must not influence rearm.
let seed=0xa11ce55;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};const modes=['manual','auto','inherit'],defaults=['manual','auto'],whens=['on','off','both'],effects=['none','blink','pulse','wave','throb','heartbeat','flash'],values=['on','off'];
for(let i=0;i<20000;i++){
  const mode=modes[(rnd()*modes.length)|0],panelDefault=defaults[(rnd()*defaults.length)|0],when=whens[(rnd()*whens.length)|0],effect=effects[(rnd()*effects.length)|0],value=values[(rnd()*values.length)|0],acked=rnd()>.25;
  const lamp={entity:'binary_sensor.fuzz',ack_rearm:mode,alert_when:when,alert_style:effect};const out=resolved(lamp,value);const effective=mode==='inherit'?panelDefault:mode;const condition=when==='both'||(when==='on'?out.isOn:!out.isOn);const expected=acked&&effective==='auto'&&!condition;
  eq(A.shouldAutoRearm(lamp,out,acked,{ack_rearm_default:panelDefault}),expected,`ACK rearm state matrix ${i}`);
}
for(let i=0;i<10000;i++){
  const junk=[null,7,'bad',[],{mode:'bad',fill:{},bezel:[],border:3,border_width:(rnd()-.5)*10000}][(rnd()*6)|0];
  let global,local;try{global=A.normalizeSpacerAppearance(junk,false);local=A.normalizeSpacerAppearance(junk,true)}catch(error){fail(`spacer fuzz threw ${i}: ${error.message}`)}
  ok(['default','blend','custom'].includes(global.mode),`global spacer fuzz ${i}`);ok(['inherit','default','blend','custom'].includes(local.mode),`local spacer fuzz ${i}`);ok(global.border_width>=0&&global.border_width<=24,`spacer width fuzz ${i}`);
}
console.log(`Spacer/ACK rearm regression PASS (${checks} checks)`);
