export type Attack='punch'|'kick'|'weapon';
export type RaceStatus='countdown'|'racing'|'recovering'|'finished'|'wrecked'|'busted';
export const stages=[{length:1200,speed:116},{length:1500,speed:123},{length:1800,speed:130}];
export const rivalNames=[['赤狐','Red Fox'],['疾风','Gale'],['夜鸦','Raven'],['银隼','Falcon'],['猎犬','Hound'],['铁鹰','Iron Eagle']];
export function roadCenter(distance:number){const d=((distance%1440)+1440)%1440;if(d>=360&&d<=840)return 0;const t=d<360?d/360:(d-840)/600;return Math.sin(t*Math.PI*2)*Math.sin(t*Math.PI)*7;}
export function roadHeight(distance:number){const d=((distance%1440)+1440)%1440;if(d>=360&&d<=840)return 0;const t=d<360?d/360:(d-840)/600;return Math.sin(t*Math.PI)**2*1.4;}
export type Rival={id:number;progress:number;x:number;speed:number;health:number;down:number;cooldown:number;armed:boolean;attack:number;attackSide:number;knocked:boolean};
export type RaceInput={left:boolean;right:boolean;up:boolean;down:boolean;boost:boolean;brake:boolean};
export class RaceSession{
 stage=0;distance=0;speed=0;stamina=100;bike=100;nitro=100;heat=0;weapon=false;elapsed=0;clock=0;countdown=3;status:RaceStatus='countdown';
 x=.65;z=3;cooldown=0;invulnerable=0;recovery=0;attackTime=0;attackKind:Attack='punch';attackSide=1;knockdowns=0;falls=0;notice='';noticeUntil=0;lastImpact=0;
 policeProgress=-65;policeX=-1.8;policeDown=0;policeActive=false;rivals:Rival[]=[];
 reset(stage=this.stage){
  this.stage=Math.max(0,Math.min(2,stage));this.distance=0;this.speed=0;this.stamina=100;this.bike=100;this.nitro=100;this.heat=0;this.weapon=false;this.elapsed=0;this.clock=0;this.countdown=3;this.status='countdown';this.x=.65;this.z=3;this.cooldown=0;this.invulnerable=0;this.recovery=0;this.attackTime=0;this.knockdowns=0;this.falls=0;this.notice='';this.noticeUntil=0;this.lastImpact=0;this.policeProgress=-65;this.policeX=-1.8;this.policeDown=0;this.policeActive=false;
  this.rivals=Array.from({length:6},(_,i)=>({id:i,progress:3+i*4,x:[-.7,1.9,-2.2,.9,-1.4,2.6][i],speed:0,health:100,down:0,cooldown:2+i*.7,armed:i===0||i===4,attack:0,attackSide:1,knocked:false}));
 }
 get length(){return stages[this.stage].length;}
 get progress(){return Math.max(0,this.distance+(3-this.z)*2);}
 get place(){return 1+this.rivals.filter(r=>r.progress>this.progress).length;}
 get complete(){return ['finished','wrecked','busted'].includes(this.status);}
 get nearest(){return this.rivals.filter(r=>r.down<=0&&Math.abs(r.progress-this.progress)<9).sort((a,b)=>Math.abs(a.progress-this.progress)-Math.abs(b.progress-this.progress))[0];}
 message(key:string,seconds=1.6){this.notice=key;this.noticeUntil=this.clock+seconds;}
 nudge(key:string){if(this.status!=='racing')return;if(key==='ArrowLeft')this.x-=.085;if(key==='ArrowRight')this.x+=.085;if(key==='ArrowUp')this.z-=.1;if(key==='ArrowDown')this.z+=.1;this.x=Math.max(-4.45,Math.min(4.45,this.x));this.z=Math.max(-3,Math.min(5,this.z));}
 attack(kind:Attack){
  if(this.status!=='racing'||this.cooldown>0)return false;
  this.attackKind=kind==='weapon'&&!this.weapon?'punch':kind;this.cooldown=this.attackKind==='kick'?.7:.5;this.attackTime=.35;
  const enemy=this.rivals.filter(r=>r.down<=0&&Math.abs(r.progress-this.progress)<5.8&&Math.abs(r.x-this.x)<(this.attackKind==='weapon'?2:1.6)).sort((a,b)=>Math.abs(a.progress-this.progress)-Math.abs(b.progress-this.progress))[0];
  this.attackSide=enemy?Math.sign(enemy.x-this.x)||1:this.x>0?-1:1;
  if(!enemy){this.message('miss');return false;}
  enemy.health-=this.attackKind==='weapon'?38:this.attackKind==='kick'?30:24;enemy.speed-=7;enemy.x=Math.max(-3.3,Math.min(3.3,enemy.x+this.attackSide*(this.attackKind==='kick'?.6:.22)));enemy.cooldown=Math.max(.65,enemy.cooldown);this.lastImpact=this.clock;this.heat=Math.min(100,this.heat+16);
  if(enemy.armed&&!this.weapon){this.weapon=true;enemy.armed=false;this.message('chain');}else this.message(this.attackKind==='kick'?'kick':this.attackKind==='weapon'?'chain_hit':'hit');
  if(enemy.health<=0){enemy.down=3.1;enemy.knocked=true;this.knockdowns++;this.message('knockdown');}
  return true;
 }
 impact(stamina:number,bike:number,notice='collision'){
  if(this.status!=='racing'||this.invulnerable>0)return;
  this.stamina=Math.max(0,this.stamina-stamina);this.bike=Math.max(0,this.bike-bike);this.speed*=.42;this.invulnerable=1.3;this.lastImpact=this.clock;this.message(notice);
  if(this.bike<=0){this.status='wrecked';return;}
  if(this.stamina<=0||stamina>=65){this.status='recovering';this.recovery=2.5;this.speed=0;this.falls++;this.message('recover',2.5);}
 }
 step(dt:number,input:RaceInput){
  if(this.complete)return;this.clock+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.attackTime=Math.max(0,this.attackTime-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);
  if(this.noticeUntil<this.clock)this.notice='';
  if(this.status==='countdown'){this.countdown=Math.max(0,this.countdown-dt);if(this.countdown===0){this.status='racing';this.message('go');}return;}
  this.elapsed+=dt;
  const recovering=this.status==='recovering',boosting=!recovering&&input.boost&&this.nitro>0,offRoad=Math.abs(this.x)>3.35;
  if(recovering){this.recovery-=dt;this.speed=0;if(this.recovery<=0){this.status='racing';this.stamina=Math.max(50,this.stamina);this.invulnerable=2.5;this.x=Math.max(-2.7,Math.min(2.7,this.x));this.message('back');}}
  else{
   const base=stages[this.stage].speed*(.76+.24*this.bike/100),target=input.brake?35:(boosting?base+54:base)*(offRoad?.57:1);
   this.speed+=(target-this.speed)*Math.min(1,dt*(input.brake?5:2.7));this.distance+=this.speed/3.6*dt;
   this.x=Math.max(-4.45,Math.min(4.45,this.x+(Number(input.right)-Number(input.left))*dt*(offRoad?2.6:3.6)));
   this.z=Math.max(-3,Math.min(5,this.z+(Number(input.down)-Number(input.up))*dt*3));
   if(boosting)this.nitro=Math.max(0,this.nitro-dt*23);else this.nitro=Math.min(100,this.nitro+dt*13);
   this.stamina=Math.min(100,this.stamina+dt*1.7);
   if(offRoad&&this.speed>70)this.bike=Math.max(0,this.bike-dt*.7);
  }
  this.rivals.forEach(r=>{
   r.cooldown=Math.max(0,r.cooldown-dt);r.attack=Math.max(0,r.attack-dt);
   if(r.down>0){r.down-=dt;if(r.down<=0){r.health=65;r.speed=45;r.knocked=false;}return;}
   const target=stages[this.stage].speed-4+(r.id%3)*5+(r.progress<this.progress-30?8:0);
   r.speed+=(target-r.speed)*Math.min(1,dt*1.8);r.progress+=r.speed/3.6*dt;
   const nearby=Math.abs(r.progress-this.progress)<10;
   const desired=nearby?this.x+(r.id%2?-1:1)*1.15:Math.sin(this.clock*.35+r.id*1.5)*2.35;
   r.x=Math.max(-3.1,Math.min(3.1,r.x+(desired-r.x)*dt*.65));
   if(nearby&&Math.abs(r.progress-this.progress)<5.2&&Math.abs(r.x-this.x)<1.5&&r.cooldown===0&&!recovering){r.attack=.34;r.attackSide=Math.sign(this.x-r.x)||1;r.cooldown=2.2+(r.id%3)*.6;this.impact(r.armed?22:14,1,'counter');}
   if(Math.abs(r.x-this.x)<.33&&Math.abs(r.progress-this.progress)<1.8&&!recovering){this.x=Math.max(-4.45,Math.min(4.45,this.x+(this.x>=r.x?1:-1)*dt*2.5));this.impact(8,2,'bump');}
  });
  this.heat=Math.max(0,this.heat-dt*(boosting?1.5:.55));
  if(this.heat>=36&&!this.policeActive){this.policeActive=true;this.policeProgress=this.progress-40;this.message('police',2);}
  if(this.policeActive){
   if(this.policeDown>0)this.policeDown-=dt;else this.policeProgress+=(this.status==='recovering'?115:stages[this.stage].speed+9)/3.6*dt;
   this.policeX+=(this.x-this.policeX)*dt*.8;
   if(recovering&&Math.abs(this.policeProgress-this.progress)<6){this.status='busted';this.message('busted');}
   else if(Math.abs(this.policeProgress-this.progress)<3&&Math.abs(this.policeX-this.x)<.55){this.impact(15,4,'police_bump');this.policeProgress-=6;}
   if(this.progress-this.policeProgress>95||this.heat<8){this.policeActive=false;this.heat=Math.min(7,this.heat);this.message('escaped');}
  }
  if(this.bike<=0)this.status='wrecked';
  else if(this.progress>=this.length&&this.status==='racing'){this.distance=this.length;this.status='finished';this.speed=0;this.message(this.place<=3?'qualified':'finished',20);}
 }
}
