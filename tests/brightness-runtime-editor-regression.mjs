import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const here=path.dirname(fileURLToPath(import.meta.url));
const src=fs.readFileSync(path.join(here,'..','dist','annunciator-grid-card.js'),'utf8');
const window=new Window({url:'http://localhost:8123/lovelace/brightness-regression'});
Object.assign(globalThis,{window,document:window.document,customElements:window.customElements,HTMLElement:window.HTMLElement,CustomEvent:window.CustomEvent,Event:window.Event,KeyboardEvent:window.KeyboardEvent,localStorage:window.localStorage,CSS:window.CSS,history:window.history});
window.ResizeObserver=class{observe(){}disconnect(){}};window.requestAnimationFrame=(callback)=>{callback(0);return 1};window.cancelAnimationFrame=()=>{};window.console=console;window.__ANNUNCIATOR_TEST_MODE__=true;window.eval(src);

let checks=0;
const ok=(value,message)=>{checks++;if(!value)throw new Error(message)};
const eq=(actual,expected,message)=>{checks++;if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)};
const sleep=(ms=0)=>new Promise((resolve)=>setTimeout(resolve,ms));
const baseConfig={type:'custom:annunciator-grid-card',config_version:3,columns:4,rows:1,show_ack_all:false,show_clear_ack:false,header_controls:{acknowledge:{enabled:false},silence:{enabled:false},reset:{enabled:false},lamp_test:{enabled:false},clear_acknowledged:{enabled:false}},entities:[]};
const baseHass={states:{},callService:async()=>{},language:'en'};
const makeCard=async(config,hass)=>{const card=document.createElement('annunciator-grid-card');card._applyResponsivePanel=()=>{};document.body.append(card);card.setConfig({...baseConfig,...config});card.hass={...baseHass,...hass};await card._runtimeRenderQueue;await card._renderDynamic();return card};
const setHass=async(card,hass)=>{card.hass={...baseHass,...hass};await card._runtimeRenderQueue};
const cellAt=(card,index)=>card.shadowRoot.querySelector(`#grid > .cell[data-original-index="${index}"]`);
const percent=(cell)=>Number(cell?.dataset?.brightnessPercent);

// Mounted runtime precedence: ordinary OFF/ON, active/ACKed alarm, INOP, and transitions.
const runtimeStates={
  'binary_sensor.off':{state:'off',attributes:{}},'binary_sensor.on':{state:'on',attributes:{}},
  'binary_sensor.alarm':{state:'on',attributes:{}},'binary_sensor.inop':{state:'unavailable',attributes:{}},
};
const runtimeCard=await makeCard({panel_id:'brightness-runtime',lamp_brightness:{profile:'custom',dim_level:35,off:20,on:61,alert:87},entities:[
  {uid:'off',ack_slot:1,entity:'binary_sensor.off',lamp_type:'status',alert_style:'none',ack_rearm:'auto'},
  {uid:'on',ack_slot:2,entity:'binary_sensor.on',lamp_type:'status',alert_style:'none'},
  {uid:'alarm',ack_slot:3,entity:'binary_sensor.alarm',lamp_type:'alarm',severity:'alarm',alert_style:'blink',alert_when:'on',ack_rearm:'auto'},
  {uid:'inop',ack_slot:4,entity:'binary_sensor.inop',lamp_type:'status'},
]},{states:runtimeStates});
eq([cellAt(runtimeCard,0).dataset.brightnessState,percent(cellAt(runtimeCard,0)),cellAt(runtimeCard,1).dataset.brightnessState,percent(cellAt(runtimeCard,1)),cellAt(runtimeCard,2).dataset.brightnessState,percent(cellAt(runtimeCard,2))],['off',20,'on',61,'alert',87],'mounted lamps apply OFF, ON, and alert levels from one canonical profile');
ok(cellAt(runtimeCard,0).classList.contains('brightness-dim')&&cellAt(runtimeCard,0).style.getPropertyValue('--annun-lamp-brightness')==='0.20','mounted OFF dimming uses an opacity variable and dim class');
ok(cellAt(runtimeCard,2).classList.contains('blink')&&cellAt(runtimeCard,2).classList.contains('brightness-dim'),'alert animation and selected alert opacity coexist');
ok(cellAt(runtimeCard,3).classList.contains('unavailable')&&!cellAt(runtimeCard,3).classList.contains('brightness-dim')&&!cellAt(runtimeCard,3).style.getPropertyValue('--annun-lamp-brightness'),'INOP remains full and carries no stale brightness attenuation');

await runtimeCard._toggleAck(runtimeCard._config.entities[2]);await runtimeCard._runtimeRenderQueue;
ok(cellAt(runtimeCard,2).classList.contains('acked'),'active alarm reflects its stored ACK');
eq([cellAt(runtimeCard,2).dataset.brightnessState,percent(cellAt(runtimeCard,2))],['alert',87],'ACK suppresses animation but not active alarm-condition brightness');

await setHass(runtimeCard,{states:{...runtimeStates,'binary_sensor.off':{state:'unavailable',attributes:{}}}});
ok(cellAt(runtimeCard,0).classList.contains('unavailable')&&!cellAt(runtimeCard,0).classList.contains('brightness-dim')&&!cellAt(runtimeCard,0).style.getPropertyValue('--annun-lamp-brightness'),'dim to unavailable transition clears every dim marker');
await setHass(runtimeCard,{states:{...runtimeStates,'binary_sensor.off':{state:'on',attributes:{}},'binary_sensor.alarm':{state:'off',attributes:{}}}});
eq([cellAt(runtimeCard,0).dataset.brightnessState,percent(cellAt(runtimeCard,0)),cellAt(runtimeCard,2).dataset.brightnessState,percent(cellAt(runtimeCard,2))],['on',61,'off',20],'available recovery and cleared auto-rearmed alarm use final logical levels');
ok(!cellAt(runtimeCard,2).classList.contains('acked'),'automatic rearm clears ACK after the alarm condition returns normal');

// Paired halves resolve independently inside one physical cell.
const pairCard=await makeCard({panel_id:'brightness-pair',columns:1,lamp_brightness:{profile:'normal'},entities:[
  {uid:'top',ack_slot:1,entity:'binary_sensor.top',pair_id:'pair',pair_mode:'top',pair_orientation:'vertical',lamp_brightness:{profile:'dim_off',dim_level:24}},
  {uid:'bottom',ack_slot:2,entity:'binary_sensor.bottom',pair_id:'pair',pair_mode:'bottom',pair_orientation:'vertical',lamp_brightness:{profile:'dim_on',dim_level:43}},
]},{states:{'binary_sensor.top':{state:'off',attributes:{}},'binary_sensor.bottom':{state:'on',attributes:{}}}});
const topHalf=pairCard.shadowRoot.querySelector('.pairHalf[data-half="top"]'),bottomHalf=pairCard.shadowRoot.querySelector('.pairHalf[data-half="bottom"]');
eq([topHalf.dataset.brightnessState,percent(topHalf),bottomHalf.dataset.brightnessState,percent(bottomHalf)],['off',24,'on',43],'paired halves apply independent per-lamp brightness profiles');
ok(topHalf.style.getPropertyValue('--annun-lamp-brightness')==='0.24'&&bottomHalf.style.getPropertyValue('--annun-lamp-brightness')==='0.43','paired halves retain separate opacity variables');

// Derived change alerts observe final rule-resolved ON/OFF rather than the fixed synthetic base state.
const derivedConfig={panel_id:'brightness-derived',columns:2,lamp_brightness:{profile:'normal'},entities:[
  {uid:'derived-on',ack_slot:1,cell_type:'lamp',source_mode:'derived',derived_base_state:'off',enable_auto_styles:true,auto_styles:[{source:'entity',source_entity:'sensor.driver_on',kind:'state',state:'go',force_state:'on'}],blink_on_change:true,blink_on_change_until_ack:true,alert_on_change_style:'blink',lamp_brightness:{profile:'custom',off:22,on:66,alert:91}},
  {uid:'derived-off',ack_slot:2,cell_type:'lamp',source_mode:'derived',derived_base_state:'on',enable_auto_styles:true,auto_styles:[{source:'entity',source_entity:'sensor.driver_off',kind:'state',state:'stop',force_state:'off'}],blink_on_change:true,blink_on_change_until_ack:true,alert_on_change_style:'pulse',lamp_brightness:{profile:'custom',off:23,on:67,alert:92}},
]};
const derivedCard=await makeCard(derivedConfig,{states:{'sensor.driver_on':{state:'idle',attributes:{}},'sensor.driver_off':{state:'run',attributes:{}}}});
eq([percent(cellAt(derivedCard,0)),percent(cellAt(derivedCard,1))],[22,67],'derived lamps begin at their final rule-resolved logical brightness');
await setHass(derivedCard,{states:{'sensor.driver_on':{state:'go',attributes:{}},'sensor.driver_off':{state:'stop',attributes:{}}}});
eq([derivedCard._changeActive['derived-on'],derivedCard._changeActive['derived-off']],[true,true],'rule-forced ON and OFF transitions both start derived change alerts');
eq([cellAt(derivedCard,0).dataset.brightnessState,percent(cellAt(derivedCard,0)),cellAt(derivedCard,1).dataset.brightnessState,percent(cellAt(derivedCard,1))],['alert',91,'alert',92],'derived final-state changes use each lamp alert brightness');
ok(cellAt(derivedCard,0).classList.contains('blinkchg')&&cellAt(derivedCard,0).classList.contains('blink')&&cellAt(derivedCard,1).classList.contains('pulse'),'derived change-alert effect classes use the same final resolved transition');
await derivedCard._toggleAck(derivedCard._config.entities[0]);await derivedCard._runtimeRenderQueue;
eq([derivedCard._changeActive['derived-on'],cellAt(derivedCard,0).dataset.brightnessState,percent(cellAt(derivedCard,0))],[false,'on',66],'ACK ends an until-ACK derived change alert and restores final ON brightness');

// Editing a Derived lamp's base/rules can change its calculated output, but that
// configuration edit is not a Home Assistant source-state transition.
const derivedEditInitial={panel_id:'brightness-derived-edit',columns:1,entities:[
  {uid:'derived-edit',ack_slot:1,cell_type:'lamp',source_mode:'derived',derived_base_state:'off',enable_auto_styles:true,auto_styles:[{source:'entity',source_entity:'sensor.derived_edit_driver',kind:'state',state:'go',force_state:'on'}],blink_on_change:true,blink_on_change_until_ack:true,alert_on_change_style:'blink',lamp_brightness:{profile:'custom',off:24,on:68,alert:93}},
]};
const derivedEditCard=await makeCard(derivedEditInitial,{states:{'sensor.derived_edit_driver':{state:'idle',attributes:{}}}});
eq([derivedEditCard._changeActive['derived-edit'],cellAt(derivedEditCard,0).dataset.brightnessState,percent(cellAt(derivedEditCard,0))],[undefined,'off',24],'Derived edit regression starts from a seeded, inactive OFF state');
const derivedEditUpdated={...derivedEditInitial,entities:[{...derivedEditInitial.entities[0],derived_base_state:'on',auto_styles:[{source:'entity',source_entity:'sensor.derived_edit_driver',kind:'state',state:'stop',force_state:'off'}]}]};
derivedEditCard.setConfig({...baseConfig,...derivedEditUpdated});await derivedEditCard._runtimeRenderQueue;
eq([derivedEditCard._changeActive['derived-edit'],cellAt(derivedEditCard,0).dataset.brightnessState,percent(cellAt(derivedEditCard,0))],[undefined,'on',68],'changing a Derived base/rule reseeds its resolved state without starting a change alert');
await setHass(derivedEditCard,{states:{'sensor.derived_edit_driver':{state:'stop',attributes:{}}}});
eq([derivedEditCard._changeActive['derived-edit'],cellAt(derivedEditCard,0).dataset.brightnessState,percent(cellAt(derivedEditCard,0))],[true,'alert',93],'the next relevant Home Assistant source transition still starts the Derived change alert');

// Lamp Test is computed from the render pass's captured Home Assistant snapshot.
const snapshotOff={states:{'binary_sensor.tested':{state:'off',attributes:{}},'input_boolean.lamp_test':{state:'off',attributes:{}}}};
const snapshotOn={states:{'binary_sensor.tested':{state:'off',attributes:{}},'input_boolean.lamp_test':{state:'on',attributes:{}}}};
const snapshotCard=await makeCard({panel_id:'brightness-snapshot',columns:1,lamp_test_entity:'input_boolean.lamp_test',lamp_test_mode:'full',lamp_brightness:{profile:'dim_off',dim_level:27},entities:[{uid:'tested',ack_slot:1,entity:'binary_sensor.tested',lamp_type:'status'}]},snapshotOff);
eq([cellAt(snapshotCard,0).dataset.brightnessState,percent(cellAt(snapshotCard,0))],['off',27],'lamp starts dimmed before snapshot race');
let releaseSnapshot;const originalGetAckMap=snapshotCard._getAckMap.bind(snapshotCard);snapshotCard._getAckMap=()=>new Promise((resolve)=>{releaseSnapshot=resolve});snapshotCard._hass={...baseHass,...snapshotOff};const capturedPass=snapshotCard._renderDynamic();for(let attempt=0;attempt<40&&!releaseSnapshot;attempt++)await sleep(1);ok(typeof releaseSnapshot==='function','snapshot regression successfully blocks one render after capture');snapshotCard._hass={...baseHass,...snapshotOn};releaseSnapshot({});await capturedPass;
eq([cellAt(snapshotCard,0).dataset.brightnessState,percent(cellAt(snapshotCard,0))],['off',27],'blocked render uses captured lamp-test OFF state instead of newer live card state');
snapshotCard._getAckMap=originalGetAckMap;await snapshotCard._renderDynamic();eq([cellAt(snapshotCard,0).dataset.brightnessState,percent(cellAt(snapshotCard,0))],['test',100],'next render uses the newer lamp-test snapshot at full brightness');

// Every material/effect combination keeps animation classes and canonical alert opacity.
const styles=['modern','retro'],lenses=['plastic','glass','frosted','smoked'],effects=['blink','pulse','wave','throb','heartbeat','flash'];
const effectEntities=[];const effectStates={};let effectIndex=0;
for(const style of styles)for(const lens of lenses)for(const effect of effects){const uid=`fx-${effectIndex}`,entity=`binary_sensor.fx_${effectIndex}`;effectEntities.push({uid,ack_slot:effectIndex+1,entity,lamp_type:'alarm',severity:'alarm',alert_style:effect,alert_when:'on',lamp_style:style,lens_type:lens,translucent_illumination:effectIndex%2===0,lamp_brightness:{profile:'dim_all',dim_level:40}});effectStates[entity]={state:'on',attributes:{}};effectIndex++}
const effectsCard=await makeCard({panel_id:'brightness-effects',columns:8,entities:effectEntities},{states:effectStates});
effectEntities.forEach((lamp,index)=>{const cell=cellAt(effectsCard,index);ok(cell?.classList.contains(lamp.alert_style)&&cell.classList.contains(lamp.lamp_style)&&cell.classList.contains(`lens-${lamp.lens_type}`),`effect/material classes coexist ${index}`);eq([cell.dataset.brightnessState,percent(cell),cell.style.getPropertyValue('--annun-lamp-brightness')],['alert',40,'0.40'],`effect/material alert opacity ${index}`);if(lamp.translucent_illumination)ok(cell.classList.contains('translucent-illumination'),`translucent alert retains illumination class ${index}`)});
const brightnessCss=src.slice(src.indexOf('/* Optional state-based lamp brightness'),src.indexOf('/* === Header appearance overrides'));
ok(brightnessCss.includes('opacity:var(--annun-lamp-brightness')&&!brightnessCss.includes('filter:brightness'),'brightness profiles use opacity and do not compete with material/effect filters');
ok(/@media \(prefers-reduced-motion:\s*reduce\)/.test(brightnessCss)&&brightnessCss.includes('transition:none'),'reduced-motion disables brightness transitions');

// Editor: panel, quick, full, custom levels, preview, bulk pairing, and undo.
const editor=document.createElement('annunciator-grid-card-editor');document.body.append(editor);editor.hass={...baseHass,states:{'binary_sensor.a':{state:'off',attributes:{friendly_name:'A'}},'binary_sensor.b':{state:'on',attributes:{friendly_name:'B'}}}};editor.setConfig({...baseConfig,panel_id:'brightness-editor',lamp_brightness:{profile:'normal',dim_level:32,off:100,on:100,alert:100},entities:[
  {uid:'a',ack_slot:1,entity:'binary_sensor.a',pair_id:'edit-pair',pair_mode:'top',lamp_brightness:{profile:'inherit'},severity:'status'},
  {uid:'b',ack_slot:2,entity:'binary_sensor.b',pair_id:'edit-pair',pair_mode:'bottom',lamp_brightness:{profile:'inherit'},severity:'alarm'},
]});
const field=(root,label)=>[...root.querySelectorAll('.field')].find((entry)=>entry.querySelector(':scope > .label')?.textContent===label);
const selectValues=(form)=>form?.schema?.[0]?.selector?.select?.options?.map((option)=>option.value)||[];
const selectLabels=(form)=>form?.schema?.[0]?.selector?.select?.options?.map((option)=>option.label)||[];
const choose=(form,value)=>form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{v:value}}}));
const typeNumber=(root,label,value)=>{const input=field(root,label)?.querySelector('input[type="number"]');if(!input)throw new Error(`Missing numeric editor field: ${label}`);input.value=String(value);input.dispatchEvent(new Event('input',{bubbles:true}));return input};
const previewText=(root)=>[...root.querySelectorAll('.brightnessSample')].map((sample)=>sample.textContent.trim());

// Loading the legacy aliases in the visual editor must resolve to Dim OFF without
// requiring an edit or silently replacing the legacy intent with Normal.
const legacyEditor=document.createElement('annunciator-grid-card-editor');document.body.append(legacyEditor);legacyEditor.hass=baseHass;let legacyConfigEvents=0;legacyEditor.addEventListener('config-changed',()=>legacyConfigEvents++);legacyEditor.setConfig({...baseConfig,panel_id:'brightness-legacy-editor',panel_sizing:'auto_fit',lamp_test_mode:'steady',ack_rearm_default:'auto',spacer_appearance:{},next_ack_slot:1,inactive_lamp_default:'dim',inactive_lamp_brightness:29});await Promise.resolve();
eq(legacyEditor._config.lamp_brightness,{profile:'dim_off',dim_level:29,off:29,on:100,alert:100},'legacy panel dim aliases resolve to canonical Dim OFF inside the visual editor');legacyEditor._panelPage='appearance';legacyEditor._renderPanel();const legacyPanelBody=legacyEditor.shadowRoot.querySelector('#panelBody');ok(field(legacyPanelBody,'Dim level')?.querySelector('input')?.value==='29','legacy Dim OFF opens the canonical editor with its historical level visible');eq(legacyConfigEvents,0,'opening a complete legacy brightness config does not emit a configuration rewrite');

editor._panelPage='appearance';editor._renderPanel();let panelBody=editor.shadowRoot.querySelector('#panelBody');
ok(panelBody.textContent.includes('Lamp lighting')&&panelBody.textContent.includes('Brightness profile')&&!panelBody.textContent.includes('Inactive lamps'),'panel Appearance uses the canonical Lamp lighting editor without duplicate legacy controls');
let panelBrightnessSelect=field(panelBody,'Brightness profile')?.querySelector('ha-form');eq(selectValues(panelBrightnessSelect),['normal','dim_off','dim_on','dim_non_alert','dim_all','custom'],'panel brightness dropdown exposes all profiles in canonical order');
choose(panelBrightnessSelect,'dim_all');eq(editor._config.lamp_brightness,{profile:'dim_all',dim_level:32,off:32,on:32,alert:32},'panel profile mutation stores one canonical object');ok(editor._undoState?.config?.lamp_brightness?.profile==='normal','panel brightness profile mutation creates an undo snapshot');editor._undo();eq(editor._config.lamp_brightness.profile,'normal','editor undo restores the prior panel brightness profile');

editor._panelPage='appearance';editor._renderPanel();panelBody=editor.shadowRoot.querySelector('#panelBody');panelBrightnessSelect=field(panelBody,'Brightness profile')?.querySelector('ha-form');choose(panelBrightnessSelect,'custom');panelBody=editor.shadowRoot.querySelector('#panelBody');
ok(['OFF brightness','ON brightness','Alert brightness'].every((label)=>field(panelBody,label)?.querySelector('input[type="number"]')),'custom panel brightness exposes three concise numeric fields');
ok([...panelBody.querySelectorAll('.brightnessSample')].map((sample)=>sample.textContent).join('|').includes('OFF')&&panelBody.textContent.includes('OFF · ON · ALERT preview'),'panel editor renders a non-mutating three-state preview');
const offInput=field(panelBody,'OFF brightness').querySelector('input');offInput.value='26';offInput.dispatchEvent(new Event('input',{bubbles:true}));eq(editor._config.lamp_brightness.off,26,'custom panel OFF level updates canonically while typing');ok(editor._undoState,'custom level edit creates one recoverable undo snapshot');offInput.dispatchEvent(new Event('blur'));await Promise.resolve();editor._undo();eq(editor._config.lamp_brightness.profile,'custom','custom-level undo restores the pre-edit custom profile');

editor._panelPage='appearance';editor._renderPanel();panelBody=editor.shadowRoot.querySelector('#panelBody');
typeNumber(panelBody,'OFF brightness',25);
eq(editor._config.lamp_brightness,{profile:'custom',dim_level:32,off:25,on:100,alert:100},'first panel custom edit preserves untouched fields');
typeNumber(panelBody,'ON brightness',70);
eq(editor._config.lamp_brightness,{profile:'custom',dim_level:32,off:25,on:70,alert:100},'second panel custom edit preserves the earlier OFF value');
typeNumber(panelBody,'Alert brightness',85);
eq(editor._config.lamp_brightness,{profile:'custom',dim_level:32,off:25,on:70,alert:85},'sequential panel custom edits preserve every prior value');
eq(previewText(panelBody),['OFF 25%','ON 70%','ALERT 85%'],'panel passive preview updates in place after sequential custom edits');

editor._selectedLamp=0;editor._editorMode='basic';editor._page='basic';editor._renderEditor();let editorBody=editor.shadowRoot.querySelector('#editor');
ok(field(editorBody,'Brightness')&&!editorBody.textContent.includes('Inactive lamp'),'Quick setup has one concise canonical Brightness control');
let lampBrightnessSelect=field(editorBody,'Brightness').querySelector('ha-form');ok(selectValues(lampBrightnessSelect)[0]==='inherit'&&selectValues(lampBrightnessSelect).includes('dim_non_alert'),'per-lamp brightness includes Panel default plus every profile');eq(selectLabels(lampBrightnessSelect)[0],'Panel default','brightness inheritance uses the concise Panel default label without profile or percentage details');choose(lampBrightnessSelect,'dim_on');editorBody=editor.shadowRoot.querySelector('#editor');eq(editor._config.entities[0].lamp_brightness,{profile:'dim_on',dim_level:32,off:100,on:32,alert:100},'Quick setup stores a canonical per-lamp override');ok(field(editorBody,'Dim level')&&field(editorBody,'OFF · ON · ALERT preview'),'Quick setup keeps the dim percentage and reference preview visible after changing profiles');ok(editor._undoState,'per-lamp brightness profile creates an undo snapshot');editor._undo();eq(editor._config.entities[0].lamp_brightness,{profile:'inherit'},'per-lamp brightness undo restores panel inheritance');

editor._editorMode='basic';editor._page='basic';editor._renderEditor();editorBody=editor.shadowRoot.querySelector('#editor');lampBrightnessSelect=field(editorBody,'Brightness').querySelector('ha-form');choose(lampBrightnessSelect,'custom');editorBody=editor.shadowRoot.querySelector('#editor');ok(['OFF brightness','ON brightness','Alert brightness'].every((label)=>field(editorBody,label))&&field(editorBody,'OFF · ON · ALERT preview'),'Quick setup exposes all Custom percentages and keeps the reference preview visible');lampBrightnessSelect=field(editorBody,'Brightness').querySelector('ha-form');choose(lampBrightnessSelect,'inherit');

editor._selectedLamp=0;editor._editorMode='advanced';editor._page='appearance';editor._renderEditor();editorBody=editor.shadowRoot.querySelector('#editor');
ok(editorBody.textContent.includes('Lens & light')&&editorBody.textContent.includes('OFF · ON · ALERT preview'),'Full editor groups complete brightness controls with lens and lighting');
lampBrightnessSelect=field(editorBody,'Brightness').querySelector('ha-form');choose(lampBrightnessSelect,'custom');editorBody=editor.shadowRoot.querySelector('#editor');ok(['OFF brightness','ON brightness','Alert brightness'].every((label)=>field(editorBody,label)),'per-lamp Custom profile exposes all independent levels');
typeNumber(editorBody,'OFF brightness',23);
eq(editor._config.entities[0].lamp_brightness,{profile:'custom',dim_level:32,off:23,on:70,alert:85},'first per-lamp custom edit preserves inherited starting levels');
typeNumber(editorBody,'ON brightness',67);
eq(editor._config.entities[0].lamp_brightness,{profile:'custom',dim_level:32,off:23,on:67,alert:85},'second per-lamp custom edit preserves the earlier OFF value');
typeNumber(editorBody,'Alert brightness',92);
eq(editor._config.entities[0].lamp_brightness,{profile:'custom',dim_level:32,off:23,on:67,alert:92},'sequential per-lamp custom edits preserve every prior value');
eq(previewText(editorBody),['OFF 23%','ON 67%','ALERT 92%'],'per-lamp passive preview updates in place after sequential custom edits');

// Home Assistant form controls can reflect their current value during upgrade or
// after a render. Those notifications are not user changes and must not recurse.
let selectChanges=0;const selectorProbe=editor._select('normal',[['normal','Normal'],['dim_off','Dim when OFF']],()=>selectChanges++);editorBody.append(selectorProbe);choose(selectorProbe,'normal');selectorProbe.dispatchEvent(new CustomEvent('value-changed',{detail:{}}));eq(selectChanges,0,'same-value and incomplete selector notifications are ignored');choose(selectorProbe,'dim_off');eq(selectChanges,1,'one genuine selector transition produces exactly one change');selectorProbe.remove();choose(selectorProbe,'normal');eq(selectChanges,1,'detached stale selector notifications cannot mutate editor state');
let entityChanges=0;const entityProbe=editor._entity('binary_sensor.a',()=>entityChanges++);editorBody.append(entityProbe);choose(entityProbe,'binary_sensor.a');choose(entityProbe,'binary_sensor.b');eq(entityChanges,1,'entity selector ignores reflection but accepts one genuine transition');entityProbe.remove();choose(entityProbe,'binary_sensor.a');eq(entityChanges,1,'detached entity selector cannot mutate editor state');let iconChanges=0;const iconProbe=editor._icon('mdi:alarm',()=>iconChanges++);editorBody.append(iconProbe);choose(iconProbe,'mdi:alarm');choose(iconProbe,'mdi:bell');eq(iconChanges,1,'icon selector ignores reflection but accepts one genuine transition');iconProbe.remove();choose(iconProbe,'mdi:alarm');eq(iconChanges,1,'detached icon selector cannot mutate editor state');

// Native color pickers emit many input events while their palette is dragged.
// The editor must keep the draft current without flooding Home Assistant with a
// full config migration, validation, preview rebuild, and config-changed event.
const colorEditor=document.createElement('annunciator-grid-card-editor');document.body.append(colorEditor);colorEditor.hass=baseHass;colorEditor.setConfig({...baseConfig,panel_id:'color-drag-editor'});let colorConfigEvents=0;colorEditor.addEventListener('config-changed',()=>colorConfigEvents++);const colorRow=colorEditor._color('Drag performance','#000000',(value)=>colorEditor._setNested('severity_colors','on',value));colorEditor.shadowRoot.querySelector('#editor').append(colorRow);const colorPicker=colorRow.querySelector('input[type="color"]');colorPicker.dispatchEvent(new Event('pointerdown',{bubbles:true}));for(let i=1;i<=80;i++){colorPicker.value=`#${i.toString(16).padStart(6,'0')}`;colorPicker.dispatchEvent(new Event('input',{bubbles:true}))}ok(colorConfigEvents<=1,'color dragging is coalesced instead of synchronously dispatching every pointer sample');colorPicker.dispatchEvent(new Event('change',{bubbles:true}));await Promise.resolve();await sleep(20);eq(colorEditor._config.severity_colors.on,'#000050','color dragging preserves the final selected value');ok(colorConfigEvents>=1&&colorConfigEvents<=3,'color drag publishes a bounded number of editor configurations including the final value');eq(colorEditor._nativeEditDepth,0,'color drag closes its native edit transaction cleanly');

const semanticBefore=editor._config.entities.map((lamp)=>({uid:lamp.uid,entity:lamp.entity,severity:lamp.severity,pair_id:lamp.pair_id,pair_mode:lamp.pair_mode}));editor._bulkMode=true;editor._bulkSelection=new Set(['a']);editor._bulkDraft.brightness_profile='dim_non_alert';editor._bulkApplyPatch({lamp_brightness:editor._brightnessForProfile({},'dim_non_alert',true)},'Bulk brightness test');
ok(editor._config.entities.every((lamp)=>lamp.lamp_brightness.profile==='dim_non_alert'),'bulk brightness expands one selected paired half to both members');eq(editor._config.entities.map((lamp)=>({uid:lamp.uid,entity:lamp.entity,severity:lamp.severity,pair_id:lamp.pair_id,pair_mode:lamp.pair_mode})),semanticBefore,'bulk brightness preserves entity, severity, and pair identity');editor._undo();ok(editor._config.entities.every((lamp)=>lamp.lamp_brightness.profile!=='dim_non_alert'),'bulk brightness change is undoable as one operation');

console.log(`Brightness runtime/editor regression PASS (${checks} checks)`);
window.close();
