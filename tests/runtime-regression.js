'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'dist', 'annunciator-grid-card.js'), 'utf8');
let checks = 0;
const fail = (m) => { throw new Error(m); };
const ok = (v,m) => { checks++; if(!v) fail(m); };
const eq = (a,b,m) => { checks++; if(a!==b) fail(`${m}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
class HTMLElement {}
const registry = new Map();
const sandbox = {
  console, setTimeout, clearTimeout, queueMicrotask, HTMLElement,
  window:{__ANNUNCIATOR_TEST_MODE__:true,customCards:[]},
  document:{createElement:(name)=>({nodeName:name,style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},append(){},addEventListener(){}})},
  customElements:{get:n=>registry.get(n),define:(n,c)=>registry.set(n,c)}, CustomEvent:class{},
  ResizeObserver:undefined, requestAnimationFrame:(cb)=>{cb();return 1}, cancelAnimationFrame(){},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}}, navigator:{}, CSS:{escape:s=>String(s)},
  Math,Date,Number,String,Boolean,Array,Object,Set,Map,JSON,RegExp
};
sandbox.window.window=sandbox.window;sandbox.window.document=sandbox.document;sandbox.window.customElements=sandbox.customElements;
vm.createContext(sandbox); vm.runInContext(src,sandbox,{filename:'annunciator-grid-card.js'});
const A=sandbox.window.__ANNUNCIATOR_TEST_API__; ok(A,'test API exported');
const G={enabled:true,on:'#00aa00',on_enabled:true,off:'#eeeeee',off_enabled:true,status:'#11bb11',status_enabled:true,warn:'#ffff00',warn_enabled:true,alarm:'#ff9900',alarm_enabled:true,trip:'#ff0000',trip_enabled:true,unavailable:'#999999',unavailable_enabled:true,on_text:'#111111',on_text_enabled:true,off_text:'#222222',off_text_enabled:true,frame_enabled:false,panel_enabled:false};
const state=(s)=>({state:s,attributes:{friendly_name:'X'}});
const visual=(l,s='on',extra={})=>{const r=A.evaluateLampState(l,state(s),{states:{},...extra});return {r,v:A.resolveLampColors(l,r,G)}};
let x=visual({entity:'x',color_behavior:'standard',severity:'trip'});eq(x.v.onColor,'#00aa00','Standard ignores severity');
x=visual({entity:'x',color_behavior:'severity',severity:'trip'});eq(x.v.onColor,'#ff0000','Severity uses TRIP');
x=visual({entity:'x',color_behavior:'custom',colors:{on:'#123456',off:'#654321'}});eq(x.v.onColor,'#123456','Custom ON');eq(x.v.offColor,'#654321','Custom OFF');
x=visual({entity:'x',color_behavior:'legacy',severity:'alarm',use_color_override:true,colors:{on:'#010203',on_window:'#abcdef',off:'#fedcba'}});eq(x.v.onWindowColor,'#abcdef','Legacy ON Window priority');
let r=A.evaluateLampState({entity:'x',enable_auto_styles:true,auto_styles:[{kind:'state',state:'on',force_state:'off',color:'#aabbcc'}]},state('on'),{states:{x:state('on')}});ok(!r.isOn,'Force OFF');eq(A.resolveLampColors({entity:'x',enable_auto_styles:true,auto_styles:[{kind:'state',state:'on',force_state:'off',color:'#aabbcc'}]},r,G).onColor,'#aabbcc','Rule color priority');
r=A.evaluateLampState({entity:'x',enable_auto_styles:true,auto_styles:[{source:'entity',source_entity:'y',kind:'state',state:'on',force_state:'off'}]},state('on'),{states:{x:state('on'),y:state('on')}});ok(!r.isOn,'Cross-entity Force OFF');
r=A.evaluateLampState({entity:'x',enable_auto_styles:true,auto_styles:[{source:'entity',source_entity:'',kind:'state',state:'on',force_state:'off'}]},state('on'),{states:{x:state('on')}});ok(r.isOn,'Incomplete external rule safe');
eq(A.interactionTargetEntity({entity:'light.a',tap_target:'entity',tap_entity:'switch.b'},'tap'),'switch.b','alternate target');eq(A.interactionTargetEntity({entity:'light.a',tap_target:'entity',tap_entity:''},'tap'),'','incomplete target safe no-op');

let hb=A.headerAckButtons({});eq(hb.ackAll,false,'minimal legacy config keeps ACK ALL hidden');eq(hb.clearAck,true,'minimal legacy config keeps default CLEAR ACK');ok(hb.legacy,'minimal config treated as legacy for compatibility');
hb=A.headerAckButtons({show_reset_ack:true,reset_ack_action:'clear'});eq(hb.ackAll,false,'legacy clear keeps ACK ALL hidden');eq(hb.clearAck,true,'legacy clear remains visible');ok(hb.legacy,'legacy header detected');
hb=A.headerAckButtons({show_reset_ack:true,reset_ack_action:'ack_all'});eq(hb.ackAll,true,'legacy ACK ALL remains visible');eq(hb.clearAck,false,'legacy ACK ALL keeps clear hidden');
hb=A.headerAckButtons({show_reset_ack:false});eq(hb.ackAll,false,'legacy hidden ACK ALL');eq(hb.clearAck,false,'legacy hidden clear');
hb=A.headerAckButtons({show_ack_all:true,show_clear_ack:true,show_reset_ack:false});eq(hb.ackAll,true,'new ACK ALL overrides legacy hidden');eq(hb.clearAck,true,'new CLEAR ACK overrides legacy hidden');ok(!hb.legacy,'new header mode detected');
const stub=A.AnnunciatorGridCard.getStubConfig();eq(stub.show_ack_all,true,'stub shows ACK ALL');eq(stub.show_clear_ack,true,'stub shows CLEAR ACK');
let met=A.computePanelMetrics({columns:1,cell_height:100,outer_frame:0,entities:[{entity:'x'}],panel_mode:'presentation',show_ack_all:true,show_clear_ack:true});eq(met.heightPx,100,'presentation has no ACK-only header height');
met=A.computePanelMetrics({columns:1,cell_height:100,outer_frame:0,entities:[{entity:'x'}],show_ack_all:true,show_clear_ack:false});eq(met.heightPx,148,'operator ACK header height included');
const lamps=[{uid:'u1',ack_slot:1,entity:'a'},{uid:'u2',ack_slot:34,entity:'b'}];const map={'p::u1':1,'p::u2::chg':2};const enc=A.encodeCompactAckState(map,lamps,'p','');const dec=A.decodeCompactAckState(enc,lamps,'p');ok(!!dec['p::u1'],'ACK main codec');ok(!!dec['p::u2::chg'],'ACK change codec');
let seed=0x51f15e;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/0x100000000};const modes=['standard','severity','custom','legacy'],sevs=['status','warn','alarm','trip'],states=['on','off','unknown','unavailable','42'];
for(let i=0;i<10000;i++){
 const l={entity:'sensor.fuzz',color_behavior:modes[(rnd()*4)|0],severity:sevs[(rnd()*4)|0],use_color_override:rnd()<.4,colors:{on:rnd()<.3?'#123456':'',off:rnd()<.3?'#654321':'',on_window:rnd()<.2?'#abcdef':''},value_format:{decimals:(rnd()*1000)|0}};
 let res; try {res=A.evaluateLampState(l,state(states[(rnd()*states.length)|0]),{states:{}});} catch(e){fail(`fuzz evaluate threw ${i}: ${e}`)}
 let c; try {c=A.resolveLampColors(l,res,G);} catch(e){fail(`fuzz colors threw ${i}: ${e}`)}
 ok(typeof c.onColor==='string'&&typeof c.offColor==='string',`fuzz colors ${i}`);
 const out=A.formatValueDisplay('12.3456',12.3456,'',l.value_format);ok(typeof out==='string'&&!out.includes('NaN')&&!out.includes('Infinity'),`fuzz decimals ${i}`);
}
console.log(`Runtime regression PASS (${checks} checks)`);
