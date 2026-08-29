'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'dist', 'annunciator-grid-card.js'), 'utf8');
let checks = 0;
const ok = (value, message) => { checks++; if (!value) throw new Error(message); };
const eq = (actual, expected, message) => { checks++; if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); };
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
vm.createContext(sandbox);vm.runInContext(src,sandbox,{filename:'annunciator-grid-card.js'});
const A=sandbox.window.__ANNUNCIATOR_TEST_API__;

let migrated=A.migrateConfigV2({config_version:2,show_ack_all:true,show_clear_ack:false,entities:[{entity:'binary_sensor.a'}]});
eq(migrated.config_version,3,'schema upgraded');
eq(migrated.header_controls.acknowledge.enabled,true,'legacy ACK maps to acknowledge');
eq(migrated.header_controls.clear_acknowledged.enabled,false,'legacy clear visibility maps');
eq(migrated.header_controls.silence.enabled,false,'new silence remains opt-in');
eq(migrated.header_controls.reset.enabled,false,'new reset remains opt-in');
eq(migrated.header_controls.lamp_test.enabled,false,'new lamp test remains opt-in');
eq(migrated.header_tallies,{active:false,alarm:false,unacknowledged:false,total:false,unavailable:false,alarms_day:false,alarms_week:false,alarms_month:false,alarms_year:false,alarms_day_label:'ALARM DAY',alarms_week_label:'ALARM WEEK',alarms_month_label:'ALARM MONTH',alarms_year_label:'ALARM YEAR',history_source:'local',alarms_day_entity:'',alarms_week_entity:'',alarms_month_entity:'',alarms_year_entity:''},'live and historical tallies remain opt-in with stable local defaults');
const customTallies=A.normalizeHeaderV3({header_tallies:{alarms_day:true,alarms_day_label:' Daily faults ',alarms_week_label:'<Weekly>\u0000'}}).tallies;
eq([customTallies.alarms_day,customTallies.alarms_day_label,customTallies.alarms_week_label],[true,'Daily faults','Weekly'],'historical tally labels normalize and sanitize');
eq(migrated.alarm_output.mode,'none','alarm output remains opt-in');
eq(migrated.alarm_output.media_metadata,{},'legacy alarm output gets safe empty media metadata');
eq(migrated.header_appearance,{},'legacy header appearance remains completely opt-in');
eq(migrated.panel_appearance,{},'legacy panel appearance remains completely opt-in');
eq(migrated.spacer_appearance,{},'legacy spacer appearance remains compatibility default');
eq(migrated.ack_rearm_default,'auto','panel ACK rearm default is automatic for future inherited lamps');
eq(migrated.inactive_lamp_default,undefined,'legacy config does not opt into inactive dimming');
eq(migrated.appearance_presets,undefined,'legacy config does not create an appearance library');
eq(A.normalizePanelAppearance({frame_enabled:true,frame:'#123456'}).lamp_frame_mode,'follow_panel','existing frame override keeps coupled compatibility behavior');
eq(A.normalizePanelAppearance({lamp_frame_mode:'THEME'}).lamp_frame_mode,'theme','independent theme bezel mode normalized');
eq(A.normalizePanelAppearance({lamp_frame_mode:'custom',lamp_frame:' #abcdef '}).lamp_frame,'#abcdef','custom lamp frame color trimmed');
eq(A.normalizePanelAppearance({lamp_frame_mode:'bogus'}).lamp_frame_mode,'follow_panel','invalid lamp frame mode is safe');
eq([A.normalizePanelAppearance({radius_enabled:true,radius:999,frame_radius_enabled:true,frame_radius:-4}).radius,A.normalizePanelAppearance({radius_enabled:true,radius:999,frame_radius_enabled:true,frame_radius:-4}).frame_radius],[120,0],'panel and frame radii normalize and clamp');
eq([A.normalizePanelAppearance({radius_enabled:'true',frame_radius_enabled:1}).radius_enabled,A.normalizePanelAppearance({radius_enabled:'true',frame_radius_enabled:1}).frame_radius_enabled],[false,false],'malformed panel radius switches remain opt-in');
eq([A.normalizePanelAppearance({background_none:true,border_none:true,frame_none:true,lamp_frame_none:true,lamp_border_none:true}).background_none,A.normalizePanelAppearance({background_none:true,border_none:true,frame_none:true,lamp_frame_none:true,lamp_border_none:true}).border_none,A.normalizePanelAppearance({background_none:true,border_none:true,frame_none:true,lamp_frame_none:true,lamp_border_none:true}).frame_none,A.normalizePanelAppearance({background_none:true,border_none:true,frame_none:true,lamp_frame_none:true,lamp_border_none:true}).lamp_frame_none,A.normalizePanelAppearance({background_none:true,border_none:true,frame_none:true,lamp_frame_none:true,lamp_border_none:true}).lamp_border_none],[true,true,true,true,true],'explicit panel surface None values retained');
eq(A.normalizePanelAppearance({background_none:'true',lamp_frame_none:1}).background_none,false,'malformed truthy panel None value does not enable');
eq(A.normalizeSpacerAppearance({mode:'BLEND'}).mode,'blend','global spacer blend normalized');
eq(A.normalizeSpacerAppearance({mode:'CUSTOM',fill:' #112233 ',bezel:' #223344 ',border:' #334455 ',border_width:99}).border_width,24,'spacer border width clamped');
eq(A.normalizeSpacerAppearance({mode:'bad'},true).mode,'inherit','invalid per-spacer mode safely inherits');
eq([A.normalizeSpacerAppearance({mode:'custom',fill_none:true,bezel_none:true,border_none:true}).fill_none,A.normalizeSpacerAppearance({mode:'custom',fill_none:true,bezel_none:true,border_none:true}).bezel_none,A.normalizeSpacerAppearance({mode:'custom',fill_none:true,bezel_none:true,border_none:true}).border_none],[true,true,true],'explicit spacer surface None values retained');

const headerAppearance=A.normalizeHeaderAppearance({background_enabled:true,background:' #112233 ',border_enabled:true,border:'#abcdef',border_width:99,title_color_enabled:true,title_color:'#fedcba',font_family:'MONOSPACE',font_weight:'700',title_font_size_enabled:true,title_font_size:999,tally_font_size:-4,button_radius_enabled:true,button_radius:99});
eq(headerAppearance.background,'#112233','header background trimmed');
eq(headerAppearance.background_enabled,true,'header background enabled');
eq(headerAppearance.border_width,12,'header border width clamped');
eq(headerAppearance.font_family,'monospace','header font family normalized');
eq(headerAppearance.font_weight,'700','header font weight normalized');
eq(headerAppearance.title_font_size,72,'title font size clamped');
eq(headerAppearance.tally_font_size,8,'tally font size clamped');
eq(headerAppearance.button_radius,40,'button radius clamped');
eq([A.normalizeHeaderAppearance({radius_enabled:true,radius:999}).radius_enabled,A.normalizeHeaderAppearance({radius_enabled:true,radius:999}).radius],[true,80],'header radius normalizes and clamps');
eq([A.normalizeHeaderAppearance({background_none:true,border_none:true,button_background_none:true,button_border_none:true}).background_none,A.normalizeHeaderAppearance({background_none:true,border_none:true,button_background_none:true,button_border_none:true}).border_none,A.normalizeHeaderAppearance({background_none:true,border_none:true,button_background_none:true,button_border_none:true}).button_background_none,A.normalizeHeaderAppearance({background_none:true,border_none:true,button_background_none:true,button_border_none:true}).button_border_none],[true,true,true,true],'explicit header surface None values retained');
eq(A.normalizeHeaderAppearance({font_family:'bogus',font_weight:'123'}).font_family,'inherit','invalid header font is safe');
eq(A.normalizeHeaderAppearance({font_family:'bogus',font_weight:'123'}).font_weight,'inherit','invalid header weight is safe');
eq(A.normalizeHeaderAppearance({font_family:'custom',font_custom:' "Header Face", sans-serif;{} '}).font_custom,'"Header Face", sans-serif','custom header font is normalized safely');
const fontMigration=A.migrateConfigV2({lamp_font_family:'CUSTOM',lamp_font_custom:' "Panel Face", serif; ',entities:[]});eq([fontMigration.lamp_font_family,fontMigration.lamp_font_custom],['custom','"Panel Face", serif'],'panel lamp font migration is safe');
const selectedMedia=A.normalizeAlarmOutput({mode:'media_player',media_player:' media_player.hall ',media_content_id:'media-source://media_source/local/FGD Alarm.mp3',media_content_type:'audio/mpeg',media_metadata:{title:'FGD Alarm.mp3',thumbnail:'/api/media_player_proxy/test'}});
eq(selectedMedia.media_player,'media_player.hall','selected media player normalized');
eq(selectedMedia.media_metadata.title,'FGD Alarm.mp3','media-browser metadata retained');
eq(A.normalizeAlarmOutput({mode:'media_player',media_metadata:['bad']}).media_metadata,{},'malformed media metadata repaired');

const normalized=A.normalizeLamp({entity:'binary_sensor.a'});
eq(normalized.shape,'inherit','legacy shape inherits exact baseline');
eq(normalized.row_span,1,'legacy row span');
eq(normalized.column_span,1,'legacy column span');
eq(normalized.translucent_illumination,false,'legacy illumination');
eq(normalized.inactive_lamp_mode,'inherit','legacy lamp inherits normal panel illumination');
eq(normalized.participates_in_alarm_output,false,'legacy output participation');
eq(normalized.pair_orientation,'vertical','legacy pair orientation');
eq([normalized.content_mode,normalized.icon,normalized.icon_size,normalized.icon_color_enabled,normalized.icon_color],['text','',40,false,''],'legacy lamp remains text-only with inert icon defaults');
eq([normalized.icon_show_primary,normalized.icon_show_secondary,normalized.icon_show_tertiary],[true,true,true],'legacy icon plus text defaults retain every line');
eq([normalized.font_family,normalized.font_custom],['inherit',''],'legacy lamp inherits the unchanged built-in font');
eq(A.normalizeLamp({entity:'light.kitchen',content_mode:'ICON_TEXT',icon:' mdi:ceiling-light ',icon_size:999,icon_color_enabled:true,icon_color:' #abcdef '}).content_mode,'icon_text','icon plus text mode normalized');
eq([A.normalizeLamp({content_mode:'icon_text',icon_show_primary:false,icon_show_secondary:false,icon_show_tertiary:false}).icon_show_primary,A.normalizeLamp({content_mode:'icon_text',icon_show_primary:false,icon_show_secondary:false,icon_show_tertiary:false}).icon_show_secondary,A.normalizeLamp({content_mode:'icon_text',icon_show_primary:false,icon_show_secondary:false,icon_show_tertiary:false}).icon_show_tertiary],[false,false,false],'icon plus text line choices normalize independently');
eq([A.normalizeLamp({content_mode:'bad',icon:7,icon_size:-20,icon_color_enabled:'true',icon_color:9}).content_mode,A.normalizeLamp({content_mode:'bad',icon:7,icon_size:-20,icon_color_enabled:'true',icon_color:9}).icon,A.normalizeLamp({content_mode:'bad',icon:7,icon_size:-20,icon_color_enabled:'true',icon_color:9}).icon_size,A.normalizeLamp({content_mode:'bad',icon:7,icon_size:-20,icon_color_enabled:'true',icon_color:9}).icon_color_enabled],['text','',12,false],'malformed icon configuration fails safe to text');
eq(A.resolveLampIcon({entity:'light.kitchen',icon:''},{attributes:{icon:'mdi:lamp'}}),'mdi:lamp','entity icon is used when no override is configured');
eq(A.resolveLampIcon({entity:'switch.pump',icon:''},{attributes:{}}),'mdi:toggle-switch','domain icon fallback is deterministic');
eq(A.normalizeCustomFont(' "DIN Condensed"; color:red <bad> '),'"DIN Condensed" color:red bad','custom font input strips CSS delimiters');
eq(A.configuredFontStack('monospace',''),'ui-monospace,"Cascadia Mono","Segoe UI Mono",Consolas,monospace','font preset resolves deterministically');
eq(A.resolveLampFontStack({font_family:'inherit'},{lamp_font_family:'custom',lamp_font_custom:'"Panel Font", sans-serif'}),'"Panel Font", sans-serif','lamp inherits the panel custom font');
eq(A.resolveLampFontStack({font_family:'serif'},{lamp_font_family:'monospace'}),'Georgia,"Times New Roman",serif','per-lamp font overrides panel font');
eq([A.normalizeCellType({entity:'binary_sensor.a'}),A.normalizeCellType({entity:''}),A.normalizeCellType({entity:'',cell_type:'lamp'}),A.normalizeCellType({entity:'binary_sensor.a',cell_type:'spacer'})],['lamp','spacer','lamp','lamp'],'cell type preserves old spacers and explicit unfinished lamps');
eq([A.normalizeLamp({entity:''}).cell_type,A.normalizeLamp({entity:'',cell_type:'lamp'}).cell_type],['spacer','lamp'],'lamp normalization retains explicit blank lamp identity only');
const derivedLamp=A.normalizeLamp({uid:'derived-a',ack_slot:7,cell_type:'lamp',source_mode:'DERIVED',derived_base_state:'bad',name_override:'Rule lamp',enable_auto_styles:true,auto_styles:[{source:'entity',source_entity:'binary_sensor.driver',kind:'state',state:'on',force_state:'on'}]});
eq([derivedLamp.source_mode,derivedLamp.derived_base_state,A.isDerivedLamp(derivedLamp),A.isOperationalLamp(derivedLamp)],['derived','off',true,true],'derived lamp source and safe base state normalize');
const derivedState=A.lampStateObject(derivedLamp,{});eq([derivedState.state,derivedState.attributes.friendly_name],['off','Rule lamp'],'derived lamp receives a stable synthetic base state');
const derivedOn=A.evaluateLampState(derivedLamp,derivedState,{states:{'binary_sensor.driver':{state:'on',attributes:{}}}});ok(derivedOn.available&&derivedOn.isOn&&derivedOn.auto?.__match_source==='binary_sensor.driver','external rule turns an entityless derived lamp on');
const derivedOff=A.evaluateLampState(derivedLamp,derivedState,{states:{'binary_sensor.driver':{state:'off',attributes:{}}}});ok(derivedOff.available&&!derivedOff.isOn&&!derivedOff.auto,'derived lamp falls back to its base state when no rule matches');
const compactDerived=A.encodeCompactAckState({'panel::derived-a':123},[derivedLamp],'panel');ok(compactDerived!=='A3M','derived lamp ACK is included in compact persistence');ok(A.decodeCompactAckState(compactDerived,[derivedLamp],'panel')['panel::derived-a']===true,'derived lamp ACK round-trips through compact persistence');
const historyNow=400*24*60*60*1000,day=24*60*60*1000;
eq(A.alarmHistoryCounts({events:[historyNow-day/24,historyNow-2*day,historyNow-10*day,historyNow-100*day,historyNow-400*day]},historyNow),{alarms_day:1,alarms_week:2,alarms_month:3,alarms_year:4},'rolling alarm history windows count and prune correctly');
const firstHistory=A.alarmHistoryTransition({events:[],activeIds:['alarm-a']},['alarm-a','alarm-b'],historyNow);eq(firstHistory.newlyArrived,['alarm-b'],'only a newly active alarm is counted');eq(firstHistory.counts.alarms_day,1,'new alarm increments every applicable window');const repeatedHistory=A.alarmHistoryTransition(firstHistory,['alarm-a','alarm-b'],historyNow+1000);eq(repeatedHistory.counts.alarms_day,1,'rerender with unchanged active alarms does not inflate history');

eq(A.normalizeInactiveLampDefault('DIM'),'dim','panel dim mode normalized');
eq(A.normalizeInactiveLampDefault('bad'),'normal','invalid panel dim mode is safe');
eq(A.normalizeInactiveLampMode('NORMAL'),'normal','per-lamp normal override normalized');
eq(A.normalizeInactiveLampMode('bad'),'inherit','invalid per-lamp dim mode safely inherits');
eq([A.normalizeInactiveBrightness(-5),A.normalizeInactiveBrightness(47.6),A.normalizeInactiveBrightness(200)],[10,48,90],'dim brightness rounds and clamps');
eq(A.resolveInactiveLampMode({inactive_lamp_mode:'inherit'},{inactive_lamp_default:'dim'}),'dim','lamp inherits panel dim mode');
eq(A.resolveInactiveLampMode({inactive_lamp_mode:'normal'},{inactive_lamp_default:'dim'}),'normal','lamp normal override wins');
const presetSource={panel_theme:'neon',default_lamp_style:'retro',default_lens_type:'glass',inactive_lamp_default:'dim',inactive_lamp_brightness:41,panel_appearance:{background_enabled:true,background:'#112233'},header_appearance:{tally_color_enabled:true,tally_color:'#abcdef'},entities:[{entity:'binary_sensor.safe'}],alarm_output:{mode:'script',script:'script.horn'},columns:9};
const captured=A.captureAppearancePreset(presetSource);eq([captured.panel_theme,captured.default_lamp_style,captured.inactive_lamp_default,captured.inactive_lamp_brightness],['neon','retro','dim',41],'appearance preset captures panel-wide visual choices');ok(captured.entities===undefined&&captured.alarm_output===undefined&&captured.columns===undefined,'appearance preset excludes behavior, entities, and layout');
const normalizedPresets=A.normalizeAppearancePresets([{id:'look',name:' Night ',values:captured},{id:'look',name:'',values:{inactive_lamp_brightness:999}}]);eq(normalizedPresets.length,2,'preset library normalized');ok(normalizedPresets[0].id!==normalizedPresets[1].id,'duplicate preset IDs repaired');eq(normalizedPresets[0].name,'Night','preset name trimmed');eq(normalizedPresets[1].values.inactive_lamp_brightness,90,'preset values normalized');
eq(A.normalizeAppearancePresets(Array.from({length:30},(_,i)=>({id:`p${i}`,name:`Preset ${i}`,values:{}}))).length,24,'preset library enforces portable limit');eq(A.normalizeAppearancePresets([{id:'long',name:'x'.repeat(100),values:{}}])[0].name.length,60,'preset names are length-limited');
const applied=A.applyAppearancePreset({...presetSource,panel_theme:'classic',entities:[{entity:'binary_sensor.keep'}],alarm_output:{mode:'none'},columns:4},normalizedPresets[0]);eq(applied.panel_theme,'neon','preset applies saved appearance');eq(applied.entities,[{entity:'binary_sensor.keep'}],'preset preserves entities');eq(applied.alarm_output,{mode:'none'},'preset preserves alarm behavior');eq(applied.columns,4,'preset preserves layout');

for (const bad of [null,undefined,0,'bad',[],{entities:'bad'},{alarm_output:{mode:'bogus'},ack_rearm_default:{bad:true},inactive_lamp_default:{bad:true},inactive_lamp_brightness:'huge',appearance_presets:[null,7,{id:{bad:true},name:[],values:{panel_appearance:[],inactive_lamp_default:{}}}],spacer_appearance:{mode:{bad:true},fill:[],border_width:'huge'},header_controls:'bad',header_tallies:7,panel_appearance:{lamp_frame_mode:{bad:true},lamp_frame:[]},header_appearance:{background_enabled:true,background:{bad:true},font_family:[],title_font_size:'huge'}}]) {
  let result; try { result=A.migrateConfigV2(bad); } catch (error) { throw new Error(`malformed migration threw: ${error.message}`); }
  ok(result && result.config_version===3,'malformed input repaired');
  ok(result.alarm_output.mode==='none','malformed alarm mode safe');
  ok(result.header_appearance&&typeof result.header_appearance==='object','malformed header appearance safe');
  ok(result.panel_appearance&&typeof result.panel_appearance==='object','malformed panel appearance safe');
  ok(result.spacer_appearance&&typeof result.spacer_appearance==='object','malformed spacer appearance safe');
  ok(['auto','manual'].includes(result.ack_rearm_default),'malformed ACK rearm default safe');
  ok(result.inactive_lamp_default===undefined||['normal','dim'].includes(result.inactive_lamp_default),'malformed inactive mode safe');
  ok(result.appearance_presets===undefined||Array.isArray(result.appearance_presets),'malformed preset library safe');
}
console.log(`Migration v3 PASS (${checks} checks)`);
