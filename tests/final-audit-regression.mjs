import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.join(here,'..');
const src=fs.readFileSync(path.join(root,'dist','annunciator-grid-card.js'),'utf8');
const window=new Window({url:'http://localhost:8123/lovelace/final-audit'});
class TrackingResizeObserver{
  static instances=[];
  constructor(callback){this.callback=callback;this.observed=[];this.disconnected=false;TrackingResizeObserver.instances.push(this)}
  observe(target){this.observed.push(target)}
  disconnect(){this.disconnected=true}
}
Object.assign(globalThis,{window,document:window.document,customElements:window.customElements,HTMLElement:window.HTMLElement,CustomEvent:window.CustomEvent,Event:window.Event,KeyboardEvent:window.KeyboardEvent,localStorage:window.localStorage,CSS:window.CSS,history:window.history,ResizeObserver:TrackingResizeObserver});
window.ResizeObserver=TrackingResizeObserver;window.requestAnimationFrame=(callback)=>{callback(0);return 1};window.cancelAnimationFrame=()=>{};window.console=console;window.__ANNUNCIATOR_TEST_MODE__=true;window.eval(src);

let checks=0;
const ok=(value,message)=>{checks++;if(!value)throw new Error(message)};
const eq=(actual,expected,message)=>{checks++;if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)};
const api=window.__ANNUNCIATOR_TEST_API__;
const base={type:'custom:annunciator-grid-card',config_version:3,panel_id:'final-audit',show_ack_all:false,show_clear_ack:false,header_controls:{acknowledge:{enabled:false},silence:{enabled:false},reset:{enabled:false},lamp_test:{enabled:false},clear_acknowledged:{enabled:false}},header_tallies:{},columns:7,cell_width:100,cell_height:100,cell_gap:10,outer_frame:0,entities:[]};
const hass={states:{'binary_sensor.a':{state:'on',attributes:{friendly_name:'A'}},'binary_sensor.b':{state:'off',attributes:{friendly_name:'B'}}},callService:async()=>{},language:'en'};

// Auto Fit must retain the physical width requested by a span instead of
// shrinking the planner to the number of configuration entries.
const spanning={...base,entities:[{uid:'span',ack_slot:1,entity:'binary_sensor.a',column_span:3,row_span:2}]};
eq(api.computeOccupiedColumns(spanning),3,'one three-column lamp reserves three occupied columns');
const spanningMetrics=api.computePanelMetrics(spanning);
eq([spanningMetrics.renderColumns,spanningMetrics.lampRows,spanningMetrics.heightPx],[3,2,210],'span-aware metrics include row span and one inter-row gap');
const collision=api.planGridLayout([{uid:'a',entity:'binary_sensor.a',column_span:2,row_span:2},{uid:'b',entity:'binary_sensor.b',column_span:2},{uid:'c',entity:'binary_sensor.a',column_span:3}],4);
eq(collision.placements.map(({row,col,rowSpan,columnSpan})=>[row,col,rowSpan,columnSpan]),[[0,0,2,2],[0,2,1,2],[2,0,1,3]],'mixed spans pack without collisions or truncation');
const pairedSpans={...base,columns:6,entities:[{uid:'pt',ack_slot:1,entity:'binary_sensor.a',pair_id:'p',pair_mode:'top',column_span:2},{uid:'pb',ack_slot:2,entity:'binary_sensor.b',pair_id:'p',pair_mode:'bottom',column_span:4}]};
eq(api.computeOccupiedColumns(pairedSpans),4,'paired cell uses the larger half span');
const grouped={...base,columns:2,cell_height:80,cell_gap:8,show_group_headers:true,entities:[{uid:'ga',ack_slot:1,entity:'binary_sensor.a',group:'First'},{uid:'gb',ack_slot:2,entity:'binary_sensor.b',group:'First'},{uid:'gc',ack_slot:3,entity:'binary_sensor.a',group:'Second'}]};
const groupedMetrics=api.computePanelMetrics(grouped);eq([groupedMetrics.lampRows,groupedMetrics.groupRows,groupedMetrics.heightPx],[2,2,272],'group metrics use two lamp rows and compact 44px structural headers');

const spanCard=document.createElement('annunciator-grid-card');spanCard._applyResponsivePanel=()=>{};document.body.append(spanCard);spanCard.setConfig(spanning);spanCard.hass=hass;await spanCard._runtimeRenderQueue;await spanCard._renderDynamic();
const spanGrid=spanCard.shadowRoot.querySelector('#grid'),spanCell=spanGrid.querySelector('.cell');
eq([spanGrid.dataset.renderColumns,spanCell.dataset.columnSpan,spanCell.dataset.rowSpan],['3','3','2'],'mounted runtime receives the full configured span footprint');
ok(spanCell.style.gridColumn.includes('span 3')&&spanCell.style.gridRow.includes('span 2'),'mounted grid placement keeps both spans');
const runtimeObserver=TrackingResizeObserver.instances.at(-1);ok(runtimeObserver?.observed.includes(spanCard),'initial runtime connection observes its assigned width');
spanCard.remove();ok(runtimeObserver.disconnected,'runtime disconnection releases its width observer');
document.body.append(spanCard);const runtimeObserver2=TrackingResizeObserver.instances.at(-1);ok(runtimeObserver2!==runtimeObserver&&runtimeObserver2.observed.includes(spanCard),'reattached runtime card installs a fresh width observer');

// The visual editor can be detached/reused by Home Assistant. Reconnection must
// install a fresh width observer after disconnectedCallback cleaned the old one.
const editor=document.createElement('annunciator-grid-card-editor');document.body.append(editor);editor.hass=hass;editor.setConfig({...base,entities:[{uid:'a',ack_slot:1,entity:'binary_sensor.a'}]});
const firstObserver=TrackingResizeObserver.instances.at(-1);ok(firstObserver?.observed.includes(editor),'initial editor connection observes its assigned width');
editor.remove();ok(firstObserver.disconnected,'editor disconnection releases its width observer');
document.body.append(editor);const secondObserver=TrackingResizeObserver.instances.at(-1);ok(secondObserver!==firstObserver&&secondObserver.observed.includes(editor),'reattached editor installs a fresh width observer');

// Advanced actions must use every valid Home Assistant domain, preserve target
// semantics, describe themselves accessibly, and avoid no-op click affordances.
const serviceCalls=[];const actionCard=document.createElement('annunciator-grid-card');actionCard._hass={...hass,callService:async(...args)=>serviceCalls.push(args)};
await actionCard._performConfiguredAction({service:'homeassistant.turn_on',data:{transition:1},target:{entity_id:'light.audit'}});
eq(serviceCalls,[['homeassistant','turn_on',{transition:1},{entity_id:'light.audit'}]],'homeassistant.* services remain valid and target is passed as the fourth callService argument');
eq(await actionCard._performConfiguredAction({service:'invalid'}),false,'invalid advanced actions report that no output started');
eq(await actionCard._startAlarmOutput({mode:'advanced_action',action:{service:'invalid'}}),false,'invalid alarm-output actions never mark the channel as started');
eq([actionCard._interactionDescription('perform_action'),actionCard._interactionDescription('navigate'),actionCard._interactionDescription('url')],['Perform action','Navigate','Open URL'],'advanced actions have accurate accessibility descriptions');
eq([api.safeInteractionUrl('javascript:alert(1)'),api.safeInteractionUrl('data:text/html,x'),api.safeInteractionUrl('https://example.com/test')],['','','https://example.com/test'],'unsafe executable URL schemes are rejected');
eq([api.safeNavigationPath('/lovelace/a'),api.safeNavigationPath('lovelace/b'),api.safeNavigationPath('//evil.example'),api.safeNavigationPath('https://evil.example')],['/lovelace/a','lovelace/b','',''],'navigation accepts local paths and rejects external destinations');
eq([api.validServiceName('homeassistant.turn_on'),api.validServiceName('light.toggle'),api.validServiceName('light'),api.validServiceName('light.toggle.extra')],[true,true,false,false],'service action names require exactly domain.service');
const interactionAudit=api.validateAndRepairConfig({...base,entities:[{uid:'bad',ack_slot:1,source_mode:'derived',tap_action:'perform_action',double_tap_action:'navigate',hold_action:'url',hold_url:'javascript:alert(1)'}]},false);
const interactionIssues=interactionAudit.issues.map((issue)=>issue.message);
ok(interactionIssues.some((message)=>message.includes('no valid domain.service'))&&interactionIssues.filter((message)=>message.includes('missing or unsafe')).length===2,`configuration audit reports every incomplete advanced interaction; got ${JSON.stringify(interactionIssues)} for ${JSON.stringify(interactionAudit.config.entities)}`);
const noOpCard=document.createElement('annunciator-grid-card');noOpCard._applyResponsivePanel=()=>{};document.body.append(noOpCard);noOpCard.setConfig({...base,entities:[{uid:'noop',ack_slot:1,source_mode:'derived',tap_action:'perform_action',double_tap_action:'navigate',hold_action:'url',hold_url:'javascript:alert(1)'}]});noOpCard.hass=hass;await noOpCard._runtimeRenderQueue;await noOpCard._renderDynamic();
ok(!noOpCard.shadowRoot.querySelector('.cell').classList.contains('clickable'),'a lamp with only incomplete/unsafe actions is not presented as clickable');
const workingActionCard=document.createElement('annunciator-grid-card');workingActionCard._applyResponsivePanel=()=>{};document.body.append(workingActionCard);workingActionCard.setConfig({...base,entities:[{uid:'work',ack_slot:1,source_mode:'derived',tap_action:'perform_action',tap_service:'homeassistant.toggle',double_tap_action:'none',hold_action:'none'}]});workingActionCard.hass=hass;await workingActionCard._runtimeRenderQueue;await workingActionCard._renderDynamic();
const workingCell=workingActionCard.shadowRoot.querySelector('.cell');ok(workingCell.classList.contains('clickable')&&workingCell.getAttribute('aria-label').includes('Perform action'),'a complete advanced action remains interactive and is announced correctly');

const repaired=api.repairMalformedPairs([{uid:'orphan',ack_slot:1,entity:'binary_sensor.a',pair_id:'orphan',pair_mode:'top',pair_shape_mode:'split_pill'}]);
eq([repaired[0].pair_id,repaired[0].pair_mode,repaired[0].pair_shape_mode],['','none','independent'],'safe pair repair removes stale Split pill metadata from an orphan');

// Loading duplicate resources is unsupported, but metadata should not duplicate
// if Home Assistant happens to evaluate the file twice.
window.eval(src);eq(window.customCards.filter((entry)=>entry.type==='annunciator-grid-card').length,1,'duplicate evaluation does not duplicate custom-card picker metadata');
ok(fs.existsSync(path.join(root,'.github','FUNDING.yml'))&&!fs.readdirSync(path.join(root,'.github')).some((name)=>/[└─]/u.test(name)),'repository metadata uses a valid .github/FUNDING.yml path');

// Mount a genuinely large panel, not only the pure layout planner, to catch
// accidental quadratic DOM/render regressions and index loss at release scale.
const largeStates={},largeEntities=[];for(let index=0;index<360;index++){const entity=`binary_sensor.large_${index}`;largeStates[entity]={state:index%3===0?'on':'off',attributes:{friendly_name:`Large ${index}`}};largeEntities.push({uid:`large-${index}`,ack_slot:index+1,entity,column_span:index%29===0?2:1,row_span:index%47===0?2:1})}
const largeCard=document.createElement('annunciator-grid-card');largeCard._applyResponsivePanel=()=>{};document.body.append(largeCard);largeCard.setConfig({...base,panel_id:'large-final-audit',columns:12,panel_sizing:'fixed',cell_width:40,cell_height:32,cell_gap:2,entities:largeEntities});largeCard.hass={...hass,states:largeStates};await largeCard._runtimeRenderQueue;await largeCard._renderDynamic();
const largeCells=[...largeCard.shadowRoot.querySelectorAll('#grid>.cell')];eq(largeCells.length,360,'large-panel runtime mounts every configured physical lamp');eq(new Set(largeCells.map((cell)=>cell.dataset.originalIndex)).size,360,'large-panel runtime preserves every source index exactly once');ok(largeCells.every((cell)=>!cell.classList.contains('spacer')),'large-panel lamps are never silently normalized into spacers');largeCard.remove();

console.log(`Final audit regression PASS (${checks} checks)`);window.close();
