'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const src=fs.readFileSync(path.join(__dirname,'..','dist','annunciator-grid-card.js'),'utf8');
let checks=0;const fail=m=>{throw new Error(m)};const ok=(v,m)=>{checks++;if(!v)fail(m)};const eq=(a,b,m)=>{checks++;if(a!==b)fail(`${m}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`)};
class HTMLElement{};const reg=new Map();const local=new Map();
const sandbox={console,setTimeout,clearTimeout,queueMicrotask,HTMLElement,window:{__ANNUNCIATOR_TEST_MODE__:true,customCards:[]},document:{createElement:n=>({nodeName:n,style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},append(){},addEventListener(){}})},customElements:{get:n=>reg.get(n),define:(n,c)=>reg.set(n,c)},CustomEvent:class{},ResizeObserver:undefined,requestAnimationFrame:cb=>{cb();return 1},cancelAnimationFrame(){},localStorage:{getItem:k=>local.has(k)?local.get(k):null,setItem:(k,v)=>local.set(k,String(v)),removeItem:k=>local.delete(k)},navigator:{},CSS:{escape:String},Math,Date,Number,String,Boolean,Array,Object,Set,Map,JSON,RegExp};sandbox.window.window=sandbox.window;sandbox.window.document=sandbox.document;sandbox.window.customElements=sandbox.customElements;vm.createContext(sandbox);vm.runInContext(src,sandbox);const A=sandbox.window.__ANNUNCIATOR_TEST_API__;

// Resolver compatibility matrix.
const oracle=c=>{
 const own=k=>Object.prototype.hasOwnProperty.call(c,k);
 if(own('show_ack_all')||own('show_clear_ack')) return {a:own('show_ack_all')?c.show_ack_all!==false:true,c:own('show_clear_ack')?c.show_clear_ack!==false:true,legacy:false};
 if(own('show_reset_ack')||own('reset_ack_action')||own('reset_ack_label')){
   if(c.show_reset_ack===false)return{a:false,c:false,legacy:true};
   const action=String(c.reset_ack_action||'clear').toLowerCase();return{a:action==='ack_all',c:action!=='ack_all',legacy:true};
 }
 return {a:false,c:true,legacy:true};
};
let seed=0xace55eed;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32};
for(let i=0;i<20000;i++){
 const c={};
 if(rnd()<.45)c.show_ack_all=rnd()<.5;
 if(rnd()<.45)c.show_clear_ack=rnd()<.5;
 if(rnd()<.45)c.show_reset_ack=rnd()<.5;
 if(rnd()<.45)c.reset_ack_action=rnd()<.5?'clear':'ack_all';
 if(rnd()<.2)c.reset_ack_label='Legacy';
 const got=A.headerAckButtons(c),want=oracle(c);eq(got.ackAll,want.a,`header matrix ${i} ACK ALL`);eq(got.clearAck,want.c,`header matrix ${i} CLEAR ACK`);eq(got.legacy,want.legacy,`header matrix ${i} legacy`);
}
const stub=A.AnnunciatorGridCard.getStubConfig();eq(stub.show_ack_all,true,'new stub ACK ALL');eq(stub.show_clear_ack,true,'new stub CLEAR ACK');

const st=s=>({state:s,attributes:{friendly_name:'X'}});
function makeCard(cfg,states){
 const c=new A.AnnunciatorGridCard();
 c._config={panel_id:'p',panel_mode:'operator',ack_store:{type:'local'},pair_ack_lock:false,entities:[],...cfg};
 c._hass={states:states||{},callService:async()=>{}};c._changeActive={};c._ackMap={};c._getAckMap=async()=>({...c._ackMap});c._setAckMap=async m=>{c._ackMap={...m};c._writes=(c._writes||0)+1};c._renderDynamic=()=>{};c._isOn=id=>['on','true','1'].includes(String(c._hass.states?.[id]?.state));return c;
}
(async()=>{
 let lamps=[
  {uid:'a',ack_slot:1,entity:'binary_sensor.a',alert_style:'blink',alert_when:'on'},
  {uid:'b',ack_slot:2,entity:'binary_sensor.b',alert_style:'blink',alert_when:'on'},
  {uid:'c',ack_slot:3,entity:'binary_sensor.c',alert_style:'none',alert_when:'on'},
  {uid:'d',ack_slot:4,entity:'binary_sensor.d',alert_style:'pulse',alert_when:'off'},
 ];
 let c=makeCard({entities:lamps},{'binary_sensor.a':st('on'),'binary_sensor.b':st('off'),'binary_sensor.c':st('on'),'binary_sensor.d':st('off')});
 await c._ackAll();let ack=new A.AckManager('p',c._ackMap);ok(ack.isAcked(lamps[0],'main'),'ACK ALL active ON alert');ok(!ack.isAcked(lamps[1],'main'),'ACK ALL leaves inactive ON alert');ok(!ack.isAcked(lamps[2],'main'),'ACK ALL leaves steady/no-effect lamp');ok(ack.isAcked(lamps[3],'main'),'ACK ALL handles OFF-state alert');
 // Change channel.
 const ch={uid:'ch',ack_slot:5,entity:'sensor.ch',alert_style:'none',blink_on_change:true,blink_on_change_until_ack:true};c=makeCard({entities:[ch]},{'sensor.ch':st('42')});c._changeActive.ch=true;await c._ackAll();ack=new A.AckManager('p',c._ackMap);ok(ack.isAcked(ch,'change'),'ACK ALL change channel');eq(c._changeActive.ch,false,'ACK ALL dismisses active change state');
 // Clear all current-panel state.
 await c._clearAcks();eq(Object.keys(c._ackMap).length,0,'CLEAR ACK empties local panel map');
 // Lamp Test blocks mutations.
 c=makeCard({entities:[lamps[0]],lamp_test_entity:'input_boolean.test'},{'binary_sensor.a':st('on'),'input_boolean.test':st('on')});await c._ackAll();eq(c._writes||0,0,'Lamp Test blocks ACK ALL');await c._clearAcks();eq(c._writes||0,0,'Lamp Test blocks CLEAR ACK');
 // Presentation blocks mutations.
 c=makeCard({entities:[lamps[0]],panel_mode:'presentation'},{'binary_sensor.a':st('on')});await c._ackAll();eq(c._writes||0,0,'Presentation blocks ACK ALL');await c._clearAcks();eq(c._writes||0,0,'Presentation blocks CLEAR ACK');
 // Pair lock links active acknowledgement to partner.
 const p1={uid:'p1',ack_slot:11,entity:'binary_sensor.p1',pair_id:'pair',pair_mode:'top',alert_style:'blink',alert_when:'on'};
 const p2={uid:'p2',ack_slot:12,entity:'binary_sensor.p2',pair_id:'pair',pair_mode:'bottom',alert_style:'blink',alert_when:'on'};
 c=makeCard({entities:[p1,p2],pair_ack_lock:true},{'binary_sensor.p1':st('on'),'binary_sensor.p2':st('off')});await c._ackAll();ack=new A.AckManager('p',c._ackMap);ok(ack.isAcked(p1,'main'),'pair active half ACKed');ok(ack.isAcked(p2,'main'),'pair lock ACKs partner');
 // Header sizing: ACK-only header in operator; none in presentation; title always reserves header.
 let m=A.computePanelMetrics({columns:1,cell_height:100,outer_frame:0,entities:[{entity:'x'}],show_ack_all:false,show_clear_ack:false});eq(m.heightPx,100,'no controls no header');
 m=A.computePanelMetrics({columns:1,cell_height:100,outer_frame:0,entities:[{entity:'x'}],show_ack_all:true,show_clear_ack:false});eq(m.heightPx,148,'ACK ALL reserves header');
 m=A.computePanelMetrics({columns:1,cell_height:100,outer_frame:0,entities:[{entity:'x'}],panel_mode:'presentation',show_ack_all:true,show_clear_ack:true});eq(m.heightPx,100,'presentation ACK controls do not reserve header');
 m=A.computePanelMetrics({columns:1,cell_height:100,outer_frame:0,entities:[{entity:'x'}],panel_mode:'presentation',show_ack_all:true,show_clear_ack:true,title:'Panel'});eq(m.heightPx,148,'title reserves presentation header');
 console.log(`Header ACK regression PASS (${checks} checks)`);
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
