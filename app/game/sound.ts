export class RideSound{
 private context:AudioContext|null=null;private engine:OscillatorNode|null=null;private gain:GainNode|null=null;enabled=false;
 setEnabled(enabled:boolean){
  this.enabled=enabled;if(enabled&&!this.context){this.context=new AudioContext();this.engine=this.context.createOscillator();this.gain=this.context.createGain();this.engine.type='sawtooth';this.engine.frequency.value=45;this.gain.gain.value=0;this.engine.connect(this.gain).connect(this.context.destination);this.engine.start();}
  if(enabled)void this.context?.resume();else if(this.context&&this.gain)this.gain.gain.setTargetAtTime(0,this.context.currentTime,.025);
 }
 tick(speed:number,playing:boolean,police:boolean){if(!this.context||!this.gain||!this.engine)return;const now=this.context.currentTime;this.engine.frequency.setTargetAtTime(38+speed*.52+(police?Math.sin(now*9)*3:0),now,.1);this.gain.gain.setTargetAtTime(this.enabled&&playing?.022:0,now,.04);}
 cue(kind:string){
  if(!this.enabled||!this.context)return;const context=this.context,osc=context.createOscillator(),gain=context.createGain(),now=context.currentTime;
  const hit=['hit','chain_hit','kick','knockdown','counter','collision','bump'].includes(kind);osc.type=hit?'triangle':'sine';osc.frequency.setValueAtTime(hit?170:kind==='go'?740:440,now);osc.frequency.exponentialRampToValueAtTime(hit?35:260,now+.12);gain.gain.setValueAtTime(.09,now);gain.gain.exponentialRampToValueAtTime(.001,now+.16);osc.connect(gain).connect(context.destination);osc.start(now);osc.stop(now+.18);osc.onended=()=>{osc.disconnect();gain.disconnect();};
 }
 dispose(){this.engine?.stop();void this.context?.close();this.context=null;}
}
