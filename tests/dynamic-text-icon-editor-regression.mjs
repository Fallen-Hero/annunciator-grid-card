import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const here=path.dirname(fileURLToPath(import.meta.url));
const src=fs.readFileSync(path.join(here,'..','dist','annunciator-grid-card.js'),'utf8');
const window=new Window({url:'http://localhost:8123/lovelace/dynamic-text-editor'});
Object.assign(globalThis,{window,document:window.document,customElements:window.customElements,HTMLElement:window.HTMLElement,CustomEvent:window.CustomEvent,Event:window.Event,KeyboardEvent:window.KeyboardEvent,localStorage:window.localStorage,CSS:window.CSS,history:window.history});
window.ResizeObserver=class{observe(){}disconnect(){}};window.requestAnimationFrame=(callback)=>{callback(0);return 1};window.cancelAnimationFrame=()=>{};window.console=console;window.__ANNUNCIATOR_TEST_MODE__=true;window.eval(src);

let checks=0;
const ok=(value,message)=>{checks++;if(!value)throw new Error(message)};
const eq=(actual,expected,message)=>{checks++;if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)};
const baseConfig={type:'custom:annunciator-grid-card',config_version:3,columns:1,rows:1,show_ack_all:false,show_clear_ack:false,header_controls:{acknowledge:{enabled:false},silence:{enabled:false},reset:{enabled:false},lamp_test:{enabled:false},clear_acknowledged:{enabled:false}},entities:[]};
const hass={states:{'binary_sensor.test':{state:'off',attributes:{friendly_name:'Test lamp',icon:'mdi:alarm-light'}}},callService:async()=>{},language:'en'};
const field=(root,label)=>[...root.querySelectorAll('.field')].find((entry)=>entry.querySelector(':scope > .label')?.textContent===label);
const colorRow=(root,label)=>[...root.querySelectorAll('.colorRow')].find((entry)=>entry.querySelector(':scope > .label')?.textContent===label);
const selectValues=(form)=>form?.schema?.[0]?.selector?.select?.options?.map((option)=>option.value)||[];
const choose=(form,value)=>form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{v:value}}}));
const input=(root,label,value)=>{const control=field(root,label)?.querySelector('input[type="text"]');if(!control)throw new Error(`Missing text field ${label}`);control.value=value;control.dispatchEvent(new Event('input',{bubbles:true}));return control};
const colorInput=(root,label,value)=>{const control=colorRow(root,label)?.querySelector('input[type="text"]');if(!control)throw new Error(`Missing color field ${label}`);control.value=value;control.dispatchEvent(new Event('input',{bubbles:true}));return control};
const makeCard=async(config,states=hass.states)=>{const card=document.createElement('annunciator-grid-card');card._applyResponsivePanel=()=>{};document.body.append(card);card.setConfig({...baseConfig,...config});card.hass={...hass,states};await card._runtimeRenderQueue;await card._renderDynamic();return card};
const cell=(card)=>card.shadowRoot.querySelector('#grid > .cell');

const editor=document.createElement('annunciator-grid-card-editor');document.body.append(editor);editor.hass=hass;
let events=0;editor.addEventListener('config-changed',()=>events++);
editor.setConfig({...baseConfig,panel_id:'dynamic-editor',next_ack_slot:2,entities:[{uid:'a',ack_slot:1,entity:'binary_sensor.test',primary_mode:'custom',primary_text:'TEST',secondary_mode:'state',tertiary_mode:'none',content_mode:'text'}]});
await Promise.resolve();events=0;
editor._selectedLamp=0;editor._editorMode='advanced';editor._page='display';editor._renderEditor();
let body=editor.shadowRoot.querySelector('#editor');
const primarySelect=field(body,'Primary')?.querySelector('ha-form');
eq(selectValues(primarySelect),['custom','name','state','state_labels','dynamic'],'Primary dropdown exposes simple labels and advanced dynamic rules after the legacy choices');
eq(selectValues(field(body,'Secondary')?.querySelector('ha-form')),['none','custom','state','state_labels','dynamic','entity_id','last_changed','last_updated'],'Secondary dropdown exposes new modes without removing legacy choices');
eq(selectValues(field(body,'Tertiary')?.querySelector('ha-form')),['none','custom','state','state_labels','dynamic','entity_id','last_changed','last_updated'],'Tertiary dropdown matches Secondary ordering');

choose(primarySelect,'state_labels');
eq(events,1,'changing a display mode emits one immediate configuration event');
eq(editor._config.entities[0].primary_mode,'state_labels','state-label mode is stored on the selected line');
body=editor.shadowRoot.querySelector('#editor');
ok(body.textContent.includes('Primary state labels'),'state-label mode opens one clearly named disclosure');
for(const label of ['ON text','OFF text','Unavailable text','Unknown text'])ok(field(body,label)?.querySelector('input'),'state-label editor includes '+label);
input(body,'ON text','ACTIVE');input(body,'OFF text','TRIP');
eq([editor._config.entities[0].dynamic_text.primary.labels.on,editor._config.entities[0].dynamic_text.primary.labels.off],['ACTIVE','TRIP'],'typing labels mutates only the selected line');

body=editor.shadowRoot.querySelector('#editor');choose(field(body,'Primary').querySelector('ha-form'),'dynamic');
body=editor.shadowRoot.querySelector('#editor');ok(body.textContent.includes('Primary dynamic text')&&body.textContent.includes('First enabled match wins'),'dynamic mode explains its deterministic precedence');
ok(field(body,'Fallback text')?.querySelector('input'),'dynamic mode exposes an explicit fallback');
let add=[...body.querySelectorAll('button')].find((button)=>button.textContent==='+ Add text rule');ok(add&&!add.disabled,'dynamic editor exposes an enabled Add text rule action');
const beforeAddEvents=events;add.click();eq(events,beforeAddEvents+1,'adding a text rule emits exactly one configuration event');
eq(editor._config.entities[0].dynamic_text.primary.rules.length,1,'Add text rule stores one canonical starter rule');
body=editor.shadowRoot.querySelector('#editor');
ok(body.textContent.includes('Rule name')&&body.textContent.includes('Display text'),'rule card exposes concise identity and result fields');
const when=field(body,'When')?.querySelector('ha-form');eq(selectValues(when),['lamp_on','lamp_off','unavailable','unknown','state_equals','string','numeric','acknowledged','unacknowledged','alarm_active','alarm_inactive'],'rule condition dropdown exposes all supported conditions in stable order');
choose(when,'numeric');body=editor.shadowRoot.querySelector('#editor');
ok(field(body,'Comparison')&&field(body,'Threshold'),'numeric text rule exposes its comparison and threshold');
input(body,'Display text','HIGH');eq(editor._config.entities[0].dynamic_text.primary.rules[0].text,'HIGH','rule result text mutates the canonical rule');

// Rule collection actions are bounded, ordered, undoable, and emit once.
editor._dynamicTextRuleDuplicate('primary',0);eq(editor._config.entities[0].dynamic_text.primary.rules.length,2,'duplicate creates a second independent text rule');eq([...editor.shadowRoot.querySelectorAll('#editor details.rule')].filter((details)=>details.open).length,1,'multiple dynamic rules keep only the active card open to limit editor height');
editor._config.entities[0].dynamic_text.primary.rules[0].name='First';editor._config.entities[0].dynamic_text.primary.rules[1].name='Second';
let beforeAction=events;editor._dynamicTextRuleMove('primary',1,-1);eq(events,beforeAction+1,'move emits exactly one configuration event');eq(editor._config.entities[0].dynamic_text.primary.rules.map((rule)=>rule.name),['Second','First'],'move changes ordered first-match precedence');
beforeAction=events;editor._dynamicTextRuleDelete('primary',1);eq(events,beforeAction+1,'delete emits exactly one configuration event');eq(editor._config.entities[0].dynamic_text.primary.rules.length,1,'delete removes only the selected rule');
editor._config.entities[0].dynamic_text.primary.rules=Array.from({length:24},(_,index)=>({enabled:true,name:`R${index}`,kind:'lamp_on',text:`T${index}`,rule:{type:'above',a:0,b:0,inclusive:true}}));editor._renderEditor();body=editor.shadowRoot.querySelector('#editor');add=[...body.querySelectorAll('button')].find((button)=>button.textContent==='+ Add text rule');ok(add.disabled,'Add text rule is disabled at the 24-rule safety limit');

// Icon colors use a concise mode selector and preserve the old single-color setting.
editor._config.entities[0]={...editor._config.entities[0],content_mode:'icon_text',icon_color_mode:'follow',icon_color_enabled:false};editor._renderEditor();body=editor.shadowRoot.querySelector('#editor');
let iconMode=field(body,'Icon color')?.querySelector('ha-form');eq(selectValues(iconMode),['follow','single','state'],'icon color dropdown offers follow, one custom color, and separate ON/OFF colors');
choose(iconMode,'state');body=editor.shadowRoot.querySelector('#editor');
ok(colorRow(body,'ON icon color')&&colorRow(body,'OFF icon color'),'state icon color mode exposes separate ON and OFF color controls');
colorInput(body,'ON icon color','#00ff00');colorInput(body,'OFF icon color','#444444');
eq([editor._config.entities[0].icon_color_mode,editor._config.entities[0].icon_color_enabled,editor._config.entities[0].icon_color_on,editor._config.entities[0].icon_color_off],['state',true,'#00ff00','#444444'],'editor stores canonical state icon colors and compatibility flag');
choose(field(body,'Icon color').querySelector('ha-form'),'follow');body=editor.shadowRoot.querySelector('#editor');
ok(!colorRow(body,'ON icon color')&&!colorRow(body,'OFF icon color'),'follow mode hides irrelevant color controls');

const legacyEditor=document.createElement('annunciator-grid-card-editor');document.body.append(legacyEditor);legacyEditor.hass=hass;let legacyEvents=0;legacyEditor.addEventListener('config-changed',()=>legacyEvents++);legacyEditor.setConfig({...baseConfig,panel_id:'legacy-icon',next_ack_slot:2,entities:[{uid:'legacy',ack_slot:1,entity:'binary_sensor.test',content_mode:'icon',icon_color_enabled:true,icon_color:'#abcdef'}]});await Promise.resolve();legacyEvents=0;legacyEditor._selectedLamp=0;legacyEditor._editorMode='advanced';legacyEditor._page='display';legacyEditor._renderEditor();const legacyBody=legacyEditor.shadowRoot.querySelector('#editor');
eq(field(legacyBody,'Icon color').querySelector('ha-form').data.v,'single','legacy icon-color switch opens as One custom color');ok(colorRow(legacyBody,'Custom icon color'),'legacy custom color remains editable');eq(legacyEvents,0,'opening a legacy icon-color config does not emit a migration rewrite');

// Mounted rendering follows final state, retains centered text without an icon,
// and supports independently selected icon/text lines.
const runtimeConfig={panel_id:'dynamic-runtime',entities:[{uid:'r',ack_slot:1,entity:'binary_sensor.test',content_mode:'icon_text',icon:'mdi:alarm-light',icon_show_primary:true,icon_show_secondary:false,icon_show_tertiary:true,primary_mode:'state_labels',secondary_mode:'custom',secondary_text:'HIDDEN',tertiary_mode:'state_labels',dynamic_text:{primary:{labels:{on:'ACTIVE',off:'TRIP'}},tertiary:{labels:{on:'RUNNING',off:'STOPPED'}}},icon_color_mode:'state',icon_color_on:'#00ff00',icon_color_off:'#444444'}]};
const runtime=await makeCard(runtimeConfig,{'binary_sensor.test':{state:'off',attributes:{friendly_name:'Test'}}});let mounted=cell(runtime);
eq([mounted.querySelector('.primaryLine').textContent,mounted.querySelector('.secondaryLine').style.display,mounted.querySelector('.tertiaryLine').textContent,mounted.querySelector('.lampIcon').style.color],['TRIP','none','STOPPED','#444444'],'mounted OFF lamp renders selected lines and OFF icon color');
runtime.hass={...hass,states:{'binary_sensor.test':{state:'on',attributes:{friendly_name:'Test'}}}};await runtime._runtimeRenderQueue;mounted=cell(runtime);eq([mounted.querySelector('.primaryLine').textContent,mounted.querySelector('.tertiaryLine').textContent,mounted.querySelector('.lampIcon').style.color],['ACTIVE','RUNNING','#00ff00'],'mounted ON transition updates labels and icon color together');
const textOnly=await makeCard({panel_id:'text-only',entities:[{uid:'t',ack_slot:1,entity:'binary_sensor.test',content_mode:'text',primary_mode:'custom',primary_text:'CENTERED'}]},hass.states);const textCell=cell(textOnly);ok(textCell.querySelector('.lampIcon').hidden&&!textCell.classList.contains('content-icon-text')&&!textCell.classList.contains('content-icon-only'),'text-only lamp has no hidden icon layout offset or icon content class');

console.log(`Dynamic text/icon editor regression PASS (${checks} checks)`);
window.close();
