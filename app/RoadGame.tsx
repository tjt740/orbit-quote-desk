'use client';
import {useEffect,useRef,useState} from 'react';
import {Maximize2,Minimize2,Pause,Play,RotateCcw,Volume2,VolumeX} from 'lucide-react';
import type {RideEngine,RideHud} from './game/world';
import {rivalNames,type Attack} from './game/race';

type Phase='ready'|'playing'|'paused'|'ended';
const initialHud:RideHud={distance:0,speed:0,passed:0,town:false,nextTown:360,stamina:100,bike:100,nitro:100,heat:0,weapon:false,place:7,total:7,length:1200,stage:0,elapsed:0,status:'countdown',countdown:3,recovery:0,notice:'',knockdowns:0,falls:0,police:false,nearest:null,standings:[]};
const notices:Record<string,[string,string]>={miss:['靠近车手再攻击','Get closer to a racer'],chain:['夺得铁链！Space 挥击','Chain taken! Space to swing'],kick:['踢击命中','Kick landed'],hit:['拳击命中','Punch landed'],chain_hit:['铁链命中','Chain landed'],knockdown:['对手倒地，趁机超车！','Rival down. Take the lead!'],counter:['遭到反击','Rival hit you'],collision:['撞车！正在恢复','Collision! Recovering'],bump:['擦碰，稳住车身','Contact. Keep control'],recover:['摔倒了，正在扶起摩托','Getting back on the bike'],back:['重新上路！','Back on the road!'],police:['警骑开始追逐','Police in pursuit'],police_bump:['警骑撞击，快拉开距离','Police contact. Pull away'],escaped:['甩开警骑！','Police escaped'],go:['冲！争取前三名','Go! Finish in the top three'],qualified:['进入前三名！','Top-three finish!'],finished:['比赛结束','Race finished'],busted:['被警骑拦截','Caught by police']};
const clock=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
export default function RoadGame({theme,lang}:{theme:'light'|'dark'|'antd';lang:string}){
 const t=(a:string,b:string)=>lang==='zh'?a:b;
 const host=useRef<HTMLDivElement>(null),canvasHost=useRef<HTMLDivElement>(null),keys=useRef(new Set<string>()),phaseRef=useRef<Phase>('ready'),engine=useRef<RideEngine|null>(null);
 const [phase,setPhase]=useState<Phase>('ready'),[available,setAvailable]=useState(false),[failed,setFailed]=useState(false),[expanded,setExpanded]=useState(false),[sound,setSound]=useState(false),[hud,setHud]=useState(initialHud);
 function change(next:Phase){phaseRef.current=next;setPhase(next);if(next!=='playing')setHud(value=>({...value,speed:0}));}
 function pause(){keys.current.clear();if(phaseRef.current==='playing')change('paused');}
 function start(nextStage=false){if(phaseRef.current==='ready'||phaseRef.current==='ended')engine.current?.reset(nextStage?hud.stage+1:hud.stage);change('playing');host.current?.focus();}
 function attack(kind:Attack){engine.current?.attack(kind);host.current?.focus();}
 useEffect(()=>{
  const element=canvasHost.current;if(!element)return;let alive=true;setAvailable(false);setFailed(false);setSound(false);change('ready');
  import('./game/world').then(({createRide})=>{
   if(!alive)return;
   try{engine.current=createRide(element,theme==='dark',{keys:keys.current,isPlaying:()=>phaseRef.current==='playing',english:lang!=='zh',onHud:setHud,onComplete:()=>change('ended'),onPause:pause});setAvailable(true);}
   catch{setFailed(true);}
  }).catch(()=>{if(alive)setFailed(true);});
  return()=>{alive=false;engine.current?.dispose();engine.current=null;};
 },[theme,lang]);
 const playable=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','Shift','j','k',' ','b'];
 const directions:Record<string,string>={w:'ArrowUp',a:'ArrowLeft',s:'ArrowDown',d:'ArrowRight'};
 const message=hud.notice&&notices[hud.notice]?notices[hud.notice][lang==='zh'?0:1]:'';
 const result=hud.status==='busted'?t('被警骑拦截','Busted'):hud.status==='wrecked'?t('车辆损坏，比赛结束','Bike wrecked'):hud.place<=3?(hud.stage===2?t('全赛程完成！','All races completed!'):t('成功晋级','Qualified')):t('比赛完成，再争前三','Finished. Try for the top three');
 return <section className={`road-game ${expanded?'road-game-expanded':''}`}>
  <div className="game-title"><strong>{t('公路对决','Road showdown')}</strong><span>{t('第','Race ')}{hud.stage+1}{t('场','')}</span><button className="game-expand" onMouseDown={event=>event.preventDefault()} onClick={()=>{setExpanded(!expanded);host.current?.focus();}} aria-label={expanded?t('收起游戏','Minimize game'):t('放大游戏','Expand game')}>{expanded?<Minimize2 size={13}/>:<Maximize2 size={13}/>}</button></div>
  <div ref={host} className={`game-stage combat-stage ${hud.status==='recovering'?'is-recovering':''}`} role="application" tabIndex={0} aria-label={t('公路摩托游戏：WASD 或方向键移动，Shift 加速，J 拳击，K 踢击，空格挥击，B 刹车，Esc 暂停','Motorcycle race: WASD or arrows move, Shift boosts, J punches, K kicks, Space swings, B brakes, Escape pauses')}
   onPointerDown={event=>{if(!(event.target as HTMLElement).closest('button'))host.current?.focus();}}
   onKeyDown={event=>{const key=event.key.length===1?event.key.toLowerCase():event.key;if(key==='Escape'){event.preventDefault();event.stopPropagation();pause();}if(playable.includes(key)&&available){event.preventDefault();event.stopPropagation();keys.current.add(key);if(!event.repeat){if(key==='j')attack('punch');else if(key==='k')attack('kick');else if(key===' ')attack('weapon');else engine.current?.nudge(directions[key]??key);}}}}
   onKeyUp={event=>{const key=event.key.length===1?event.key.toLowerCase():event.key;if(playable.includes(key)){event.preventDefault();event.stopPropagation();keys.current.delete(key);}}}
   onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))pause();}}>
   <div ref={canvasHost} className="game-canvas"/>
   <div className="game-hud"><span>{hud.speed}<small> km/h</small></span><span className="race-place">{hud.place}<small> / {hud.total}</small></span></div>
   <div className="race-distance"><div><span>{hud.distance} / {hud.length} m</span><span>{clock(hud.elapsed)}</span></div><i><b style={{width:`${Math.min(100,hud.distance/hud.length*100)}%`}}/></i></div>
   <div className="game-location"><span className={hud.town?'town':'prairie'}>{hud.town?t('城镇','Town'):t('草原弯道','Prairie curves')}</span>{hud.police&&<span className="police-alert">{t('警骑追逐','Police pursuit')}</span>}</div>
   {hud.nearest&&phase==='playing'&&<div className="rival-status"><span>{rivalNames[hud.nearest.id][lang==='zh'?0:1]} <small>{hud.nearest.gap} m</small></span><i><b style={{width:`${hud.nearest.health}%`}}/></i></div>}
   {phase==='playing'&&message&&<div className="race-message" role="status">{message}</div>}
   <div className="race-gauges">{[{label:t('体力','Rider'),value:hud.stamina,kind:'stamina'},{label:t('耐久','Bike'),value:hud.bike,kind:'bike'},{label:t('氮气','Nitro'),value:hud.nitro,kind:'nitro'}].map(g=><div key={g.kind} className={g.kind+(g.value<25?' low':'')}><span>{g.label}<b>{g.value}</b></span><i><b style={{width:`${g.value}%`}}/></i></div>)}<div className="weapon-indicator"><span>{t('武器','Weapon')}</span><strong>{hud.weapon?t('铁链','Chain'):t('拳脚','Fists')}</strong></div></div>
   {phase==='playing'&&hud.status==='countdown'&&<div className="race-countdown"><strong>{hud.countdown}</strong><span>{t('准备出发','Get ready')}</span></div>}
   {phase==='playing'&&hud.status==='recovering'&&<div className="race-recovery"><strong>{hud.recovery}</strong><span>{t('扶起摩托，继续比赛','Getting back on the bike')}</span></div>}
   {phase!=='playing'&&<div className={`game-overlay ${phase==='ended'?'race-results':''}`}>
    <span>{failed?t('暂不支持 3D 游戏','3D game unavailable'):phase==='ended'?result:phase==='paused'?t('已暂停','Paused'):t('公路竞速 · 近身对抗','Road racing · Close combat')}</span>
    {phase==='ready'&&!failed&&<small>{t('击退车手，避开车流，争取前三名','Fight racers, dodge traffic, finish in the top three')}</small>}
    {phase==='ended'&&<><div className="result-numbers"><strong>{hud.place}<small> / {hud.total}</small></strong><span>{clock(hud.elapsed)}<small>{t('击倒','Knockdowns')} {hud.knockdowns} · {t('摔倒','Falls')} {hud.falls}</small></span></div>{expanded&&hud.status==='finished'&&<ol className="race-standings">{hud.standings.slice(0,7).map((id,i)=><li className={id===-1?'you':''} key={id}><span>{i+1}</span>{id===-1?t('你','You'):rivalNames[id][lang==='zh'?0:1]}{id===-1&&<b>{t('本场成绩','Your result')}</b>}</li>)}</ol>}</>}
    <div className="race-result-actions">{phase==='ended'&&hud.status==='finished'&&hud.place<=3&&hud.stage<2&&<button onClick={()=>start(true)}><Play size={14}/>{t('下一场','Next race')}</button>}<button disabled={!available} onClick={()=>start()}>{phase==='ended'?<RotateCcw size={14}/>:<Play size={14}/>} {phase==='ended'?t('再跑一场','Race again'):phase==='paused'?t('继续','Resume'):t('开始比赛','Start race')}</button></div>
   </div>}
   {phase==='playing'&&<button className="game-pause" aria-label={t('暂停游戏','Pause game')} onClick={pause}><Pause size={13}/></button>}
  </div>
  <div className="race-controls"><button disabled={phase!=='playing'||hud.status!=='racing'} onMouseDown={event=>event.preventDefault()} onClick={()=>attack('punch')}>J {t('拳','Punch')}</button><button disabled={phase!=='playing'||hud.status!=='racing'} onMouseDown={event=>event.preventDefault()} onClick={()=>attack('kick')}>K {t('踢','Kick')}</button><button disabled={phase!=='playing'||hud.status!=='racing'} onMouseDown={event=>event.preventDefault()} onClick={()=>attack('weapon')}>␣ {hud.weapon?t('铁链','Chain'):t('挥击','Strike')}</button><button className="race-sound" aria-label={sound?t('关闭音效','Mute sound'):t('开启音效','Enable sound')} onMouseDown={event=>event.preventDefault()} onClick={()=>{engine.current?.setSound(!sound);setSound(!sound);host.current?.focus();}}>{sound?<Volume2 size={13}/>:<VolumeX size={13}/>}</button></div>
  <p className="game-help">{t('WASD / 方向键移动 · Shift 加速','Hold WASD / arrows to move · Shift boosts')}<br/><kbd>B</kbd> {t('刹车','brake')} <span>·</span> <kbd>Esc</kbd> {t('暂停','pause')} {expanded&&<span>{t('靠近车手再攻击，摔倒后会自动恢复','Attack within reach; get back up after a fall')}</span>}</p>
 </section>;
}
