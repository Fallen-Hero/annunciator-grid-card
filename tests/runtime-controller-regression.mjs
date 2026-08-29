import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const here=path.dirname(fileURLToPath(import.meta.url));
const src=fs.readFileSync(path.join(here,'..','dist','annunciator-grid-card.js'),'utf8');
const window=new Window({url:'http://localhost:8123/lovelace/runtime-controller'});
Object.assign(globalThis,{window,document:window.document,customElements:window.customElements,HTMLElement:window.HTMLElement,CustomEvent:window.CustomEvent,Event:window.Event,localStorage:window.localStorage,CSS:window.CSS,history:window.history});
window.ResizeObserver=class{observe(){}disconnect(){}};
window.requestAnimationFrame=(callback)=>{callback(0);return 1};
window.cancelAnimationFrame=()=>{};
window.console=console;
window.__ANNUNCIATOR_TEST_MODE__=true;
window.eval(src);

let checks=0;
const ok=(value,message)=>{checks++;if(!value)throw new Error(message)};
const sleep=(ms=0)=>new Promise((resolve)=>setTimeout(resolve,ms));
const makeCard=(config,hass)=>{const card=document.createElement('annunciator-grid-card');card._applyResponsivePanel=()=>{};document.body.append(card);card.setConfig(config);card.hass=hass;return card};
const baseConfig={type:'custom:annunciator-grid-card',config_version:3,columns:1,entities:[]};
const baseHass={states:{},callService:async()=>{},language:'en'};

// Home Assistant entity-backed historical totals are shared, read-only values.
const historyReads=[];
const originalGet=window.Storage.prototype.getItem,originalSet=window.Storage.prototype.setItem;
window.Storage.prototype.getItem=function(key){if(String(key).startsWith('annun_alarm_history::'))historyReads.push(['get',key]);return originalGet.call(this,key)};
window.Storage.prototype.setItem=function(key,value){if(String(key).startsWith('annun_alarm_history::'))historyReads.push(['set',key]);return originalSet.call(this,key,value)};
const entityHistoryCard=makeCard({...baseConfig,panel_id:'shared-history',header_tallies:{history_source:'entities',alarms_day:true,alarms_day_label:'TODAY',alarms_day_entity:'sensor.alarm_day',alarms_week:true,alarms_week_entity:'sensor.alarm_week',alarms_month:true,alarms_month_entity:'sensor.alarm_month',alarms_year:true,alarms_year_entity:'sensor.alarm_year'}},{...baseHass,states:{'sensor.alarm_day':{state:'12',attributes:{}},'sensor.alarm_week':{state:'unknown',attributes:{}},'sensor.alarm_month':{state:'-3',attributes:{}},'sensor.alarm_year':{state:'44.5',attributes:{}}}});
await entityHistoryCard._renderDynamic();
const entityTallies=entityHistoryCard.shadowRoot.querySelector('#headerTallies').textContent;
ok(entityTallies.includes('TODAY 12'),'entity day tally renders the shared numeric sensor');
ok(entityTallies.includes('ALARM WEEK —')&&entityTallies.includes('ALARM MONTH —'),'unknown and negative entity totals render an em dash');
ok(entityTallies.includes('ALARM YEAR 44.5'),'finite nonnegative entity value is preserved');
ok(window.__ANNUNCIATOR_TEST_API__.formatHeaderTallyValue('   ')==='—'&&window.__ANNUNCIATOR_TEST_API__.historicalTallyEntityValues({alarms_day_entity:'sensor.blank'},{'sensor.blank':{state:'   '}}).alarms_day===null,'whitespace-only entity totals render an em dash rather than a false zero');
ok(historyReads.length===0,'entity-backed history performs no local history reads or writes');
ok(entityHistoryCard._alarmHistoryTimer===null||entityHistoryCard._alarmHistoryTimer===undefined,'entity-backed history schedules no local expiry timer');

// Serialized alarm output: a clear or silence arriving during a pending start must
// reconcile after start, using the exact output specification that started it.
const calls=[];let releaseStart;
const raceHass={states:{},callService:async(domain,service,data)=>{calls.push([domain,service,data]);if(service==='play_media'&&!releaseStart)await new Promise((resolve)=>{releaseStart=resolve})}};
const outputCard=makeCard({...baseConfig,panel_id:'output-race',alarm_output:{mode:'media_player',media_player:'media_player.old',media_content_id:'alarm.mp3'}},raceHass);
await outputCard._runtimeRenderQueue;await outputCard._alarmOutputQueue;
calls.length=0;const starting=outputCard._requestAlarmOutput(['A']);for(let attempt=0;attempt<20&&!calls.length;attempt++)await sleep(1);const clearing=outputCard._requestAlarmOutput([]);ok(calls[0]?.[1]==='play_media','pending alarm starts playback');releaseStart();await Promise.all([starting,clearing]);
ok(calls.map((entry)=>entry[1]).join(',')==='play_media,media_stop','clear during pending start finishes with one ordered stop');
ok(outputCard._alarmOutputApplied?.sounding===false,'clear race finishes stopped');

calls.length=0;releaseStart=()=>{};outputCard._config.alarm_output={mode:'media_player',media_player:'media_player.old',media_content_id:'alarm.mp3'};await outputCard._requestAlarmOutput(['A']);
outputCard._config.alarm_output={mode:'media_player',media_player:'media_player.new',media_content_id:'alarm.mp3'};await outputCard._requestAlarmOutput(['A']);
ok(calls.length===3&&calls[0][1]==='play_media'&&calls[0][2].entity_id==='media_player.old'&&calls[1][1]==='media_stop'&&calls[1][2].entity_id==='media_player.old'&&calls[2][1]==='play_media'&&calls[2][2].entity_id==='media_player.new','active output target change stops the captured old player before starting the new player');

calls.length=0;await outputCard._silenceAlarmOutput();await outputCard._requestAlarmOutput(['A']);ok(calls.length===1&&calls[0][1]==='media_stop','same alarm remains silent after SILENCE');await outputCard._requestAlarmOutput(['A','B']);ok(calls.at(-1)?.[1]==='play_media','newly arriving alarm re-sounds after SILENCE');
outputCard._config.alarm_output={mode:'none'};await outputCard._requestAlarmOutput(['A','B']);ok(calls.at(-1)?.[1]==='media_stop','changing active output to None stops the previously applied player');

const scriptCalls=[];const scriptCard=makeCard({...baseConfig,panel_id:'script-output',alarm_output:{mode:'script',script:'script.start_horn',silence_script:'script.stop_horn'}},{...baseHass,callService:async(...args)=>scriptCalls.push(args)});await scriptCard._runtimeRenderQueue;await scriptCard._alarmOutputQueue;scriptCalls.length=0;await scriptCard._requestAlarmOutput(['A']);await scriptCard._silenceAlarmOutput();
ok(scriptCalls.length===2&&scriptCalls[0][2].entity_id==='script.start_horn'&&scriptCalls[1][2].entity_id==='script.stop_horn','Script mode uses the explicit Silence script instead of script.turn_off');

// Operator ACK mutations share one queue, so rapid different-lamp ACKs cannot lose
// the first read-modify-write result.
const ackStates={'binary_sensor.a':{state:'on',attributes:{}},'binary_sensor.b':{state:'on',attributes:{}}};
const ackCard=makeCard({...baseConfig,panel_id:'ack-race',entities:[{uid:'a',ack_slot:1,entity:'binary_sensor.a',lamp_type:'alarm',severity:'alarm',alert_style:'blink'},{uid:'b',ack_slot:2,entity:'binary_sensor.b',lamp_type:'alarm',severity:'alarm',alert_style:'blink'}]},{...baseHass,states:ackStates});
await ackCard._renderDynamic();await Promise.all([ackCard._toggleAck(ackCard._config.entities[0]),ackCard._toggleAck(ackCard._config.entities[1])]);
const ackMap=JSON.parse(localStorage.getItem('annun_ack_map::ack-race'));
ok(!!ackMap['ack-race::a']&&!!ackMap['ack-race::b'],'concurrent ACKs preserve both lamps');

let activeWrites=0,maxWrites=0;const helperHass={states:{...ackStates,'input_text.acks':{state:'',attributes:{max:255}}},callService:async(domain,service)=>{if(domain==='input_text'&&service==='set_value'){activeWrites++;maxWrites=Math.max(maxWrites,activeWrites);await sleep(4);activeWrites--}}};
const helperCard=makeCard({...baseConfig,panel_id:'helper-race',ack_store:{type:'input_text',entity:'input_text.acks'},entities:[{uid:'a',ack_slot:1,entity:'binary_sensor.a',lamp_type:'alarm',severity:'alarm',alert_style:'blink'},{uid:'b',ack_slot:2,entity:'binary_sensor.b',lamp_type:'alarm',severity:'alarm',alert_style:'blink'}]},helperHass);
await helperCard._renderDynamic();await Promise.all([helperCard._toggleAck(helperCard._config.entities[0]),helperCard._toggleAck(helperCard._config.entities[1])]);
ok(maxWrites===1,'persistent helper ACK writes are serialized');
ok(helperCard._ackShadow?.map?.['helper-race::a']&&helperCard._ackShadow?.map?.['helper-race::b'],'optimistic helper shadow contains every queued ACK');

// A blocked render from an old configuration cannot mutate a replacement grid.
const staleCard=makeCard({...baseConfig,panel_id:'old-config',entities:[{uid:'old',ack_slot:1,entity:'binary_sensor.old'}]},{...baseHass,states:{'binary_sensor.old':{state:'on',attributes:{}}}});
await staleCard._runtimeRenderQueue;let releaseAck,blockOnce=true;staleCard._getAckMap=()=>{if(!blockOnce)return Promise.resolve({});blockOnce=false;return new Promise((resolve)=>{releaseAck=()=>resolve({})})};const stalePass=staleCard._renderDynamic();await sleep();staleCard.setConfig({...baseConfig,panel_id:'new-config',entities:[{uid:'new',ack_slot:1,entity:'binary_sensor.new'}]});staleCard._hass={...baseHass,states:{'binary_sensor.new':{state:'off',attributes:{}}}};releaseAck();await stalePass;await staleCard._renderDynamic();
ok(staleCard._derived?.[0]?.lamp?.uid==='new','stale blocked render cannot replace the new grid identity');
ok(staleCard.shadowRoot.querySelector('.cell')?.classList.contains('off'),'new configuration retains its final state after stale pass release');

// Reconnect reconciles an expired finite change alert instead of leaving it active.
const timerCard=makeCard({...baseConfig,panel_id:'timer-reconnect',entities:[{uid:'timer',ack_slot:1,entity:'binary_sensor.timer',blink_on_change:true,blink_on_change_seconds:1}]},{...baseHass,states:{'binary_sensor.timer':{state:'off',attributes:{}}}});await timerCard._renderDynamic();timerCard._changeActive.timer=true;timerCard._changeLastTs.timer=Date.now()-2000;timerCard.remove();document.body.append(timerCard);ok(timerCard._changeActive.timer===false,'reconnect clears an already expired finite change alert');

window.Storage.prototype.getItem=originalGet;window.Storage.prototype.setItem=originalSet;
console.log(`Runtime controller regression PASS (${checks} checks)`);
window.close();
