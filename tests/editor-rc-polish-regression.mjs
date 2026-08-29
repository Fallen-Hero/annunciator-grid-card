import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const here=path.dirname(fileURLToPath(import.meta.url));
const src=fs.readFileSync(path.join(here,'..','dist','annunciator-grid-card.js'),'utf8');
const window=new Window({url:'http://localhost:8123/lovelace/rc-polish'});
Object.assign(globalThis,{window,document:window.document,customElements:window.customElements,HTMLElement:window.HTMLElement,CustomEvent:window.CustomEvent,Event:window.Event,KeyboardEvent:window.KeyboardEvent,localStorage:window.localStorage,CSS:window.CSS,history:window.history});
window.ResizeObserver=class{observe(){}disconnect(){}};window.requestAnimationFrame=(callback)=>{callback(0);return 1};window.cancelAnimationFrame=()=>{};window.console=console;window.__ANNUNCIATOR_TEST_MODE__=true;window.eval(src);

let checks=0;
const ok=(value,message)=>{checks++;if(!value)throw new Error(message)};
const eq=(actual,expected,message)=>{checks++;if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)};
const api=window.__ANNUNCIATOR_TEST_API__;
const field=(root,label)=>[...root.querySelectorAll('.field')].find((entry)=>entry.querySelector(':scope > .label')?.textContent===label);
const choose=(form,value)=>form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{v:value}}}));
const base={type:'custom:annunciator-grid-card',config_version:3,panel_id:'rc-polish',columns:2,rows:2,show_ack_all:false,show_clear_ack:false,entities:[]};
const hass={states:{
  'binary_sensor.target':{state:'off',attributes:{friendly_name:'Target'}},
  'binary_sensor.source':{state:'on',attributes:{friendly_name:'Source'}},
},callService:async()=>{},language:'en'};

// Pure helpers keep display copying tightly allowlisted and semantic identity intact.
const target={uid:'target',ack_slot:1,entity:'binary_sensor.target',name_override:'Keep target name',severity:'alarm',alert_style:'blink',ack_rearm:'manual',pair_id:'pair-a',pair_mode:'top',column_span:2,tap_action:'toggle',primary_mode:'custom',primary_text:'OLD'};
const source={uid:'source',ack_slot:2,entity:'binary_sensor.source',name_override:'Do not copy source name',severity:'status',alert_style:'none',ack_rearm:'auto',participates_in_alarm_output:true,pair_id:'pair-a',pair_mode:'bottom',content_mode:'icon_text',icon:'mdi:alert',icon_size:54,icon_color_mode:'state',icon_color_on:'#00ff00',icon_color_off:'#333333',font_family:'monospace',primary_mode:'dynamic',secondary_mode:'state_labels',tertiary_mode:'custom',tertiary_text:'DETAIL',dynamic_text:{primary:{fallback:'IDLE',rules:[{name:'Active',kind:'lamp_on',text:'ACTIVE'}]}},value_format:{mode:'number',decimals:2,unit:'override',unit_override:'psi'}};
const copied=api.applyLampDisplaySettings(target,source);
eq([copied.content_mode,copied.icon,copied.icon_size,copied.font_family,copied.primary_mode,copied.secondary_mode,copied.tertiary_text],['icon_text','mdi:alert',54,'monospace','dynamic','state_labels','DETAIL'],'display copy transfers every visible display family');
eq([copied.uid,copied.ack_slot,copied.entity,copied.name_override,copied.severity,copied.alert_style,copied.ack_rearm,copied.pair_id,copied.pair_mode,copied.column_span,copied.tap_action],['target',1,'binary_sensor.target','Keep target name','alarm','blink','manual','pair-a','top',2,'toggle'],'display copy preserves identity, source, behavior, pairing, span, and action semantics');
ok(copied.dynamic_text.primary.rules[0].text==='ACTIVE'&&copied.value_format.unit_override==='psi','display copy deep-copies dynamic text and value formatting');
source.dynamic_text.primary.rules[0].text='MUTATED';ok(copied.dynamic_text.primary.rules[0].text==='ACTIVE','display copy has no shared nested rule references');

eq(api.lampNavigatorBadges({...source,column_span:2,participates_in_alarm_output:true,shape:'circle'},{paired:true}),['Paired','Span','Dynamic','Audible','Override'],'navigator badges are concise, deterministic, and ordered');
eq(api.lampNavigatorBadges({entity:'binary_sensor.target'}),[],'plain legacy-compatible lamp receives no feature-noise badges');
eq([api.normalizePairShapeMode(),api.normalizePairShapeMode('nonsense'),api.normalizePairShapeMode('split_pill')],['independent','independent','split_pill'],'split-pill pair geometry is explicit and malformed values stay independent');
const malformedPairShapeValues=[undefined,null,false,true,0,1,-1,'','SPLIT_PILL','split pill','nonsense',{},[],['split_pill'],{mode:'split_pill'},Number.NaN,Number.POSITIVE_INFINITY];
for(let index=0;index<2048;index++)ok(['independent','split_pill'].includes(api.normalizePairShapeMode(malformedPairShapeValues[index%malformedPairShapeValues.length])),'pair-shape fuzz always resolves to a safe allowlisted mode');
eq(api.lampNavigatorBadges({...source,pair_shape_mode:'split_pill'},{paired:true}).slice(0,2),['Paired','Split pill'],'split-pill pair mode is visible in the navigator');
ok(api.colorContrastRatio('#000000','#ffffff')===21,'contrast helper returns the WCAG black/white ratio');
ok(api.contrastFinding('Test','#777777','#888888').includes('aim for at least 4.5:1'),'low text contrast produces an actionable warning');
ok(api.contrastFinding('Test','#000000','#ffffff')==='','high contrast remains quiet');
ok(api.lampContrastWarnings({entity:'binary_sensor.target',color_behavior:'custom',colors:{on:'#888888',on_text:'#777777'}}).length===1,'per-lamp custom colors are audited');
ok(api.configContrastWarnings({severity_colors:{on_enabled:true,on:'#888888',on_text_enabled:true,on_text:'#777777'},header_appearance:{background_enabled:true,background:'#888888',title_color_enabled:true,title_color:'#777777'}}).length===2,'global and header custom colors are audited without guessing inherited colors');

const editor=document.createElement('annunciator-grid-card-editor');document.body.append(editor);editor.hass=hass;let events=0;editor.addEventListener('config-changed',()=>events++);
editor.setConfig({...base,next_ack_slot:3,header_appearance:{background_enabled:true,background:'#888888',title_color_enabled:true,title_color:'#777777'},severity_colors:{on_enabled:true,on:'#888888',on_text_enabled:true,on_text:'#777777'},entities:[
  {...target,content_mode:'icon_text',icon_color_mode:'single',icon_color:'#777777',font_family:'custom',font_custom:'monospace',shape:'circle',lamp_style:'retro',lens_type:'glass',lamp_brightness:{profile:'custom',off:20,on:60,alert:90},colors:{on:'#888888',on_text:'#777777'}},
  source,
]});
await Promise.resolve();events=0;

editor._selectedLamp=0;editor._editorMode='advanced';editor._page='display';editor._renderList();editor._renderEditor();
let body=editor.shadowRoot.querySelector('#editor');
ok(body.querySelector('.pageSummary')?.textContent.includes('Current display:'),'Display page has a concise read-only current summary');
ok(body.textContent.includes('Copy display settings')&&field(body,'Source lamp')&&[...body.querySelectorAll('button')].some((button)=>button.textContent==='Copy to this lamp'),'Display page exposes a focused copy action');
ok(editor.shadowRoot.querySelector('#lampList').textContent.includes('Paired')&&editor.shadowRoot.querySelector('#lampList').textContent.includes('Span')&&editor.shadowRoot.querySelector('#lampList').textContent.includes('Dynamic')&&editor.shadowRoot.querySelector('#lampList').textContent.includes('Audible')&&editor.shadowRoot.querySelector('#lampList').textContent.includes('Override'),'navigator renders all unusual-configuration badges on the paired cell');
const dynamicConfig={...editor._config.entities[0],primary_mode:'dynamic',dynamic_text:{primary:{rules:[{kind:'acknowledged',text:'ACK'}]}}};editor._config.entities[0]=dynamicConfig;editor._renderEditor();body=editor.shadowRoot.querySelector('#editor');const when=field(body,'When')?.querySelector('ha-form');
const conditionLabels=when.schema[0].selector.select.options.map((option)=>option.label);ok(conditionLabels.includes('ACK stored')&&conditionLabels.includes('No ACK stored')&&conditionLabels.includes('Main alert active')&&conditionLabels.includes('Main alert inactive'),'dynamic rule conditions use unambiguous ACK and main-alert labels');
ok(field(body,'When').querySelector('.tip')?.textContent.includes('configured visual Alert effect'),'condition help precisely defines Main alert semantics');

editor._config.entities[0]={...target,uid:'target',content_mode:'text',primary_mode:'custom',primary_text:'OLD'};editor._config.entities[1]={...source,uid:'source'};editor._displayCopySourceUid='source';editor._renderEditor();body=editor.shadowRoot.querySelector('#editor');const beforeCopyEvents=events;[...body.querySelectorAll('button')].find((button)=>button.textContent==='Copy to this lamp').click();
eq(editor._config.entities[0].primary_mode,'dynamic','copy action applies source display settings to the selected lamp');
eq([editor._config.entities[0].entity,editor._config.entities[0].severity,editor._config.entities[0].ack_rearm],['binary_sensor.target','alarm','manual'],'copy action preserves selected lamp behavior and entity');
eq(events,beforeCopyEvents+1,'copy action emits exactly one immediate configuration event');
editor._undo();eq(editor._config.entities[0].primary_text,'OLD','display copy is one undoable transaction');

editor._config.entities[0]={...editor._config.entities[0],content_mode:'icon_text',icon_color_mode:'single',icon_color_enabled:true,font_family:'custom',font_custom:'monospace'};editor._page='display';editor._renderEditor();body=editor.shadowRoot.querySelector('#editor');
let reset=field(body,'Lamp font').querySelector('.controlWithReset button');ok(reset&&!reset.disabled&&reset.textContent==='Use panel default','complex font override has a visible inheritance reset');reset.click();eq([editor._config.entities[0].font_family,editor._config.entities[0].font_custom],['inherit',''],'font reset clears both family and stale custom stack');
body=editor.shadowRoot.querySelector('#editor');reset=field(body,'Icon color').querySelector('.controlWithReset button');reset.click();eq([editor._config.entities[0].icon_color_mode,editor._config.entities[0].icon_color_enabled],['follow',false],'icon reset returns to inherited lamp text color');

editor._config.entities[0]={...editor._config.entities[0],ack_rearm:'manual'};editor._page='behavior';editor._renderEditor();body=editor.shadowRoot.querySelector('#editor');ok(body.querySelector('.pageSummary')?.textContent.includes('Current behavior:'),'Behavior page has a concise read-only current summary');reset=field(body,'ACK rearm').querySelector('.controlWithReset button');reset.click();eq(editor._config.entities[0].ack_rearm,'inherit','ACK reset returns to panel policy');

editor._config.entities[0]={...editor._config.entities[0],color_behavior:'custom',colors:{on:'#888888',on_text:'#777777'},shape:'circle',lamp_style:'retro',lens_type:'glass',lamp_brightness:{profile:'custom',off:20,on:60,alert:90}};editor._page='appearance';editor._renderEditor();body=editor.shadowRoot.querySelector('#editor');ok(body.querySelector('.contrastWarning')?.textContent.includes('ON text'),'lamp Appearance shows low-contrast warning without blocking save');
for(const label of ['Lamp shape','Lamp style','Lens material','Brightness'])ok(field(body,label)?.querySelector('.controlWithReset button'),'Appearance exposes an inheritance reset beside '+label);
const pairShape=field(body,'Pair shape')?.querySelector('ha-form');ok(pairShape&&pairShape.schema[0].selector.select.options.map((option)=>option.value).join(',')==='independent,split_pill','paired lamp Appearance offers Independent lamps and Split pill');const beforePairShapeEvents=events;choose(pairShape,'split_pill');eq(editor._config.entities.map((lamp)=>lamp.pair_shape_mode),['split_pill','split_pill'],'Pair shape change synchronizes both halves');eq(events,beforePairShapeEvents+1,'Pair shape change emits exactly one configuration event');

editor._panelPage='appearance';editor._renderPanel();ok(editor.shadowRoot.querySelector('#panelBody .contrastWarning')?.textContent.includes('Header title'),'panel Appearance reports explicit global/header contrast issues');

const legacy=document.createElement('annunciator-grid-card-editor');document.body.append(legacy);legacy.hass=hass;let legacyEvents=0;legacy.addEventListener('config-changed',()=>legacyEvents++);legacy.setConfig({type:'custom:annunciator-grid-card',config_version:3,panel_id:'legacy-stable',panel_sizing:'auto_fit',lamp_test_mode:'steady',ack_rearm_default:'auto',spacer_appearance:{},next_ack_slot:2,entities:[{uid:'legacy',ack_slot:1,entity:'binary_sensor.target'}]});await Promise.resolve();legacyEvents=0;legacy._selectedLamp=0;legacy._editorMode='advanced';for(const page of ['display','behavior','appearance']){legacy._page=page;legacy._renderEditor()}
eq(legacyEvents,0,'opening every changed editor page does not rewrite an existing v1.0.2-style lamp');
eq(api.lampNavigatorBadges(legacy._config.entities[0]),[],'normalized v1.0.2-style lamp still has no false Override badge');

const makePairCard=async(orientation)=>{const card=document.createElement('annunciator-grid-card');card._applyResponsivePanel=()=>{};document.body.append(card);card.setConfig({...base,panel_id:`split-${orientation}`,entities:[{uid:`${orientation}-top`,ack_slot:1,entity:'binary_sensor.target',pair_id:`${orientation}-pair`,pair_mode:'top',pair_orientation:orientation,pair_shape_mode:'split_pill'},{uid:`${orientation}-bottom`,ack_slot:2,entity:'binary_sensor.source',pair_id:`${orientation}-pair`,pair_mode:'bottom',pair_orientation:orientation,pair_shape_mode:'split_pill'}]});card.hass=hass;await card._runtimeRenderQueue;await card._renderDynamic();return card.shadowRoot.querySelector('#grid>.cell')};
const verticalPair=await makePairCard('vertical'),horizontalPair=await makePairCard('horizontal');
ok(verticalPair.classList.contains('pair-split-pill')&&verticalPair.classList.contains('pair-vertical'),'vertical split pill receives shared capsule and orientation classes');
ok(horizontalPair.classList.contains('pair-split-pill')&&horizontalPair.classList.contains('pair-horizontal'),'horizontal split pill receives shared capsule and orientation classes');
ok([...verticalPair.querySelectorAll('.pairHalf')].every((half)=>half.classList.contains('shape-pill'))&&verticalPair.querySelectorAll('.pairDivider').length===1,'split pill forces only rendered pair geometry while retaining one divider');

console.log(`Editor RC polish regression PASS (${checks} checks)`);window.close();
