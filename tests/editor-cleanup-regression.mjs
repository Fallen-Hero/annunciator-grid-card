import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const here=path.dirname(fileURLToPath(import.meta.url));
const src=fs.readFileSync(path.join(here,'..','dist','annunciator-grid-card.js'),'utf8');
const window=new Window({url:'http://localhost:8123/lovelace/editor-cleanup'});
Object.assign(globalThis,{window,document:window.document,customElements:window.customElements,HTMLElement:window.HTMLElement,CustomEvent:window.CustomEvent,Event:window.Event,KeyboardEvent:window.KeyboardEvent,localStorage:window.localStorage,CSS:window.CSS,history:window.history});
window.ResizeObserver=class{observe(){}disconnect(){}};window.requestAnimationFrame=(cb)=>{cb(0);return 1};window.cancelAnimationFrame=()=>{};window.console=console;window.eval(src);
let checks=0;const ok=(value,message)=>{checks++;if(!value)throw new Error(message)};
const hass={states:{'binary_sensor.a':{state:'on',attributes:{friendly_name:'Alarm A'}},'binary_sensor.b':{state:'off',attributes:{friendly_name:'Alarm B'}},'binary_sensor.rule':{state:'fault',attributes:{}},'sensor.day':{state:'4',attributes:{}}},callService:async()=>{},language:'en'};
const editor=document.createElement('annunciator-grid-card-editor');document.body.append(editor);editor.hass=hass;editor.setConfig({type:'custom:annunciator-grid-card',config_version:3,panel_id:'editor-cleanup',entities:[{uid:'a',ack_slot:1,entity:'binary_sensor.a',group:'Plant',pair_id:'pair',pair_mode:'top',severity:'alarm',alert_style:'blink',enable_auto_styles:true,auto_styles:[{name:'Fault source',enabled:true,source:'entity',source_entity:'binary_sensor.rule',kind:'state',state:'fault',force_state:'on'}]},{uid:'b',ack_slot:2,entity:'binary_sensor.b',group:'Plant',pair_id:'pair',pair_mode:'bottom',severity:'status'}]});

ok(editor._editorMode==='basic'&&editor._page==='basic','editor opens in Quick setup');
let editorText=editor.shadowRoot.querySelector('#editor').textContent;
ok(editorText.includes('Quick setup')&&editorText.includes('Full editor'),'clear Quick setup and Full editor choices render');
ok((editorText.match(/Color behavior/g)||[]).length===1,'Quick setup does not duplicate color behavior');
ok((editorText.match(/Lamp name/g)||[]).length===1,'Quick setup uses one short Lamp name field');
const fullButton=[...editor.shadowRoot.querySelectorAll('#editor .modeButton')].find((button)=>button.textContent==='Full editor');fullButton.click();
ok(editor._editorMode==='advanced'&&editor._page==='setup','Full editor opens the focused Setup page');
ok(editor.shadowRoot.querySelectorAll('#editor .tabs .tab').length===7,'Full editor retains all focused pages');
const quickButton=[...editor.shadowRoot.querySelectorAll('#editor .modeButton')].find((button)=>button.textContent==='Quick setup');quickButton.click();
ok(editor._editorMode==='basic'&&editor._page==='basic','Quick setup returns without changing lamp configuration');

editor._setLampGroup('Aux');
ok(editor._config.entities.every((lamp)=>lamp.group==='Aux'),'changing one valid paired half keeps both group names exact and aligned');
editor._setLampGroup('aux');ok(editor._config.entities.every((lamp)=>lamp.group==='aux'),'group names preserve exact case rather than silently merging');
editor._setLampGroup('Plant');

editor._bulkMode=true;editor._bulkSelection=new Set(['a']);editor._renderList();
ok(editor._bulkExpandedSelection().size===2,'bulk selection expands to the complete paired cell');
const beforeSemantic=editor._config.entities.map((lamp)=>({uid:lamp.uid,entity:lamp.entity,severity:lamp.severity,alert_style:lamp.alert_style,pair_id:lamp.pair_id,pair_mode:lamp.pair_mode,auto_styles:JSON.stringify(lamp.auto_styles||[])}));
editor._bulkApplyPatch({shape:'circle',font_family:'monospace'},'Bulk appearance test');
ok(editor._config.entities.every((lamp)=>lamp.shape==='circle'&&lamp.font_family==='monospace'),'bulk appearance applies once to both paired halves');
ok(JSON.stringify(editor._config.entities.map((lamp)=>({uid:lamp.uid,entity:lamp.entity,severity:lamp.severity,alert_style:lamp.alert_style,pair_id:lamp.pair_id,pair_mode:lamp.pair_mode,auto_styles:JSON.stringify(lamp.auto_styles||[])})))===JSON.stringify(beforeSemantic),'bulk appearance cannot overwrite semantic alarm, rule, source, or pairing fields');
ok(!Object.prototype.hasOwnProperty.call(editor._config,'_bulkMode')&&!Object.prototype.hasOwnProperty.call(editor._config,'bulkSelection'),'bulk mode and selection remain transient editor state');
editor._renderList();ok(editor.shadowRoot.querySelector('#bulkPanel').textContent.includes('Select this page')&&editor.shadowRoot.querySelector('#bulkPanel').textContent.includes('Select all lamps'),'bulk selection makes page versus full-panel scope explicit');

editor._selectedLamp=0;editor._page='appearance';editor._editorMode='advanced';editor._renderEditor();editor._lampAppearancePresetDraft='Operator blue';editor._saveLampAppearancePreset();
ok(editor._config.lamp_appearance_presets.length===1,'per-lamp appearance preset saves in the card configuration');
const preset=editor._config.lamp_appearance_presets[0];ok(!('severity' in preset.values)&&!('alert_style' in preset.values)&&!('auto_styles' in preset.values)&&!('entity' in preset.values),'lamp appearance preset excludes semantic fields');
const semanticBefore={entity:editor._config.entities[0].entity,severity:editor._config.entities[0].severity,alert_style:editor._config.entities[0].alert_style,rules:JSON.stringify(editor._config.entities[0].auto_styles)};editor._config.entities[0]={...editor._config.entities[0],shape:'rectangle',font_family:'serif'};editor._applySelectedLampAppearancePreset();
ok(editor._config.entities[0].shape==='circle'&&editor._config.entities[0].font_family==='monospace','saved lamp appearance reapplies visual fields');
ok(editor._config.entities[0].entity===semanticBefore.entity&&editor._config.entities[0].severity===semanticBefore.severity&&editor._config.entities[0].alert_style===semanticBefore.alert_style&&JSON.stringify(editor._config.entities[0].auto_styles)===semanticBefore.rules,'saved lamp appearance preserves alarm semantics and rules');

editor._page='rules';editor._renderEditor();editorText=editor.shadowRoot.querySelector('#editor').textContent;
ok(editorText.includes('Live rule trace')&&editorText.includes('Winner:')&&editorText.includes('Fault source'),'live rule trace shows the current first-match winner');
const configBeforeRefresh=JSON.stringify(editor._config),refresh=[...editor.shadowRoot.querySelectorAll('#editor button')].find((button)=>button.textContent==='Refresh trace');refresh.click();ok(JSON.stringify(editor._config)===configBeforeRefresh,'Refresh trace never mutates configuration');
editor._config.entities[0]={...editor._config.entities[0],auto_styles:[{name:'Missing source',enabled:true,source:'entity',source_entity:'',kind:'state',state:'on'}]};editor._renderEditor();ok(editor.shadowRoot.querySelector('#editor').textContent.includes('Missing source entity'),'trace explains malformed missing-source rules');

editor._config={...editor._config,header_tallies:{history_source:'entities',alarms_day:true,alarms_day_entity:'sensor.day'}};editor._panelPage='acknowledgement';editor._renderPanel();const panelText=editor.shadowRoot.querySelector('#panelBody').textContent;
const sourceForm=[...editor.shadowRoot.querySelectorAll('#panelBody ha-form')].find((form)=>form.schema?.[0]?.selector?.select?.options?.some((option)=>option.value==='entities'));
ok(!!sourceForm&&panelText.includes('Value entity'),'shared historical source exposes its source choice and one entity field per enabled tally');
ok(!panelText.includes('Clear saved alarm totals'),'shared historical source hides the browser-local reset action');
editor._config={...editor._config,header_controls:{...editor._config.header_controls,silence:{enabled:true,label:'SILENCE'}},alarm_output:{mode:'script',script:'script.start',silence_script:''}};editor._panelPage='alarm_output';editor._renderPanel();const scriptText=editor.shadowRoot.querySelector('#panelBody').textContent;
ok(scriptText.includes('Start script')&&scriptText.includes('Silence script'),'Script mode exposes separate start and reversible silence selectors');
ok(scriptText.includes('SILENCE is enabled, but Script mode has no Silence script'),'Script mode warns when the visible SILENCE control has no stop path');

const emptyEditor=document.createElement('annunciator-grid-card-editor');document.body.append(emptyEditor);emptyEditor.hass=hass;emptyEditor.setConfig({type:'custom:annunciator-grid-card',config_version:3,panel_id:'new-pair',entities:[]});emptyEditor._addPairedLamp();
ok(emptyEditor._config.entities.length===2&&emptyEditor._config.entities.every((lamp)=>lamp.cell_type==='lamp'&&!window.__ANNUNCIATOR_TEST_API__?.isSpacerItem?.(lamp)),'Add paired lamp creates two lamp drafts, never spacers');
ok(emptyEditor._config.entities[0].pair_id===emptyEditor._config.entities[1].pair_id&&emptyEditor._config.entities[0].pair_mode==='top'&&emptyEditor._config.entities[1].pair_mode==='bottom','Add paired lamp creates one canonical automatic pair ID');

console.log(`Editor cleanup regression PASS (${checks} checks)`);window.close();
