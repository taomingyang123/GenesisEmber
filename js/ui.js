'use strict';

const C = { bg:'#0b0f17', panel:'#111827', card:'#161f33', line:'#263248', ink:'#e2e8f0', muted:'#94a3b8', dim:'#64748b', sky:'#38bdf8', green:'#34d399', amber:'#fbbf24', rose:'#fb7185', purple:'#c084fc' };
const fills = { emerald:'#059669', sky:'#0284c7', indigo:'#4f46e5', amber:'#d97706', purple:'#7e22ce', rose:'#e11d48', slate:'#334155' };
const tabs = [['evo','🧬','进化/职业'],['bld','🏛️','建筑 (35)'],['tech','🔬','科技 (44)'],['prestige','🚀','跃迁/任务'],['sys','📊','资源/设置']];
const font = 'Menlo, Monaco, Consolas, monospace';
function fmt(n) {
  if (!Number.isFinite(n)) return '0';
  for (const [threshold, divisor, places, unit] of [[1e9,1e9,2,'B'],[1e6,1e6,2,'M'],[1e4,1e3,1,'K'],[1e3,1e3,2,'K']]) {
    if (Math.abs(n)>=threshold) return (n/divisor).toFixed(places)+unit;
  }
  return Math.abs(n)>=100 ? String(Math.floor(n)) : n.toFixed(1).replace(/\.0$/,'');
}
const rateText = v => Math.abs(v)<0.05 ? '0.0/s' : (v>0?'+':'')+v.toFixed(1)+'/s';
const inside = (r,x,y) => r && x>=r.x && y>=r.y && x<r.x+r.w && y<r.y+r.h;

class GameUI {
  constructor(canvas,game,scene,actions,v) {
    Object.assign(this,{canvas,ctx:canvas.getContext('2d'),game,scene,actions,tab:'evo',scrolls:{},anchors:{},batch:1,hideDone:false,floats:[],resScroll:0,toastMessage:'',hits:[]});
    this.resize(v);
  }
  resize(v) {
    this.scale=1; this.width=Math.min(v.width,1440); this.height=v.height;
    this.left=(v.width-this.width)/2; this.safeTop=Math.max(v.safeTop||0,v.menuBottom||0);
    this.safeBottom=v.safeBottom||0; this.dpr=Math.min(v.dpr||1,3);
    this.canvas.width=Math.round(v.width*this.dpr); this.canvas.height=Math.round(v.height*this.dpr);
    this.touch=null;
  }
  toast(message){ this.toastMessage=message; this.toastUntil=Date.now()+2200; }
  float(label,color=C.green){ this.floats.push({label,color,born:Date.now()}); this.floats=this.floats.slice(-8); }
  box(x,y,w,h,bg,border=C.line,b=1,r=4){
    const c=this.ctx;
    if(w<=0||h<=0)return;
    const fill=(x,y,w,h,color,radius)=>{
      if(w<=0||h<=0)return;
      c.fillStyle=color;
      if(radius && c.arcTo){
        radius=Math.min(radius,w/2,h/2); c.beginPath();c.moveTo(x+radius,y);
        c.arcTo(x+w,y,x+w,y+h,radius);c.arcTo(x+w,y+h,x,y+h,radius);
        c.arcTo(x,y+h,x,y,radius);c.arcTo(x,y,x+w,y,radius);c.closePath();c.fill();
      }else c.fillRect(x,y,w,h);
    };
    if(b&&border)fill(x,y,w,h,border,r);
    else b=0;
    fill(x+b,y+b,w-2*b,h-2*b,bg,Math.max(0,r-b));
  }
  measure(s,size,bold=false){ this.ctx.font=(bold?'bold ':'')+size+'px '+font; return this.ctx.measureText(String(s)).width; }
  text(s,x,y,size=11,color=C.ink,bold=false,max=Infinity,align='left'){
    s=String(s); let length=this.measure(s,size,bold);
    if(length>max){
      while(s.length&&this.measure(s+'…',size,bold)>max)s=s.slice(0,-1);
      s+='…'; length=this.measure(s,size,bold);
    }
    const c=this.ctx; c.fillStyle=color;c.textBaseline='middle';
    c.fillText(s,x-(align==='center'?length/2:align==='right'?length:0),y);
  }
  lines(s,width,size){
    const lines=[]; let line='';
    for(const ch of s){if(line&&this.measure(line+ch,size)>width){lines.push(line);line='';}line+=ch;}
    if(line)lines.push(line);return lines;
  }
  hit(x,y,w,h,action){
    if(!action)return;
    if(this.clip){const bottom=Math.min(y+h,this.clip.y+this.clip.h);y=Math.max(y,this.clip.y);h=bottom-y;}
    if(h>0)this.hits.push({x,y,w,h,action});
  }
  button(x,y,w,h,label,tone,action,sub,size=11){
    const active=!!action;
    this.box(x,y,w,h,active?fills[tone]:'#222a39',active?'#566175':'#343c4b',2);
    const mainY=sub?y+h/2-7:y+h/2;
    this.text(label,x+w/2,mainY,size,active?'#fff':'#646b76',true,w-6,'center');
    if(sub)this.text(sub,x+w/2,mainY+15,10,active?'#e2e8f0':'#565f6d',false,w-6,'center');
    this.hit(x,y,w,h,action);
  }
  beginClip(r){const c=this.ctx;c.save();c.beginPath();c.rect(r.x,r.y,r.w,r.h);c.clip();this.clip=r;}
  endClip(){this.ctx.restore();this.clip=null;}
  render(){
    const c=this.ctx,g=this.game,w=g.save.world,d=g.defs,m=g.metrics,e=d.ERAS_DEF[w.eraIndex];
    const wide=this.width>=768, pad=wide?10:6,gap=wide?8:6, x=pad, y=this.safeTop+(wide?8:0);
    const W=this.width-2*pad,bottom=this.height-this.safeBottom-(wide?8:0);
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle=C.bg;c.fillRect(0,0,this.canvas.width/this.dpr,this.height);
    c.setTransform(this.dpr,0,0,this.dpr,this.left*this.dpr,0); c.imageSmoothingEnabled=false;
    this.hits=[]; this.clip=null;
    const kpis=[];
    if(w.eraIndex)kpis.push(['人口 / 幸福',Math.floor(w.pop)+'/'+m.popCap+' '+w.happiness+'%',C.sky]);
    (w.eraIndex?['food','knowledge']:['rna','dna']).forEach((id,i)=>kpis.push([d.RES_MAP[id].name,fmt(w.res[id])+'/'+fmt(m.caps[id]),i?C.green:C.amber]));
    kpis.push(['🔥 余烬',''+fmt(g.save.prestige.genesisShards),C.purple]);
    const bonus='+'+g.save.prestige.lifetimeShards*2+'%';
    const widths=kpis.map(([name,val],i)=>Math.max(68,Math.ceil(Math.max(this.measure(val,12,true),this.measure(name+(i===kpis.length-1?' '+bonus:''),10)))+16));
    const inner=W-20,kpiW=widths.reduce((a,b)=>a+b,0)+5*(widths.length-1);
    const wrap=inner<42+this.measure(e.name,15,true)+6+kpiW;
    const kpiRows=kpiW>inner?2:1, topH=wrap?34+6+35*kpiRows+5*(kpiRows-1):35;
    const headH=8+topH+5+25+8;
    this.box(x,y,W,headH,C.panel,C.line,2);
    this.box(x+10,y+8,34,34,'#17253b','#334a6e',2);
    this.text(e.icon,x+27,y+25,18,C.ink,false,32,'center');
    this.text('时代 '+(w.eraIndex+1)+'/7',x+52,y+14,10,C.green,true);
    this.text(e.name,x+52,y+31,15,'#f8fafc',true);
    let kx=wrap?x+10:x+W-10-kpiW,ky=y+8+(wrap?40:0);
    kpis.forEach(([name,val,color],i)=>{
      const kw=widths[i],ember=i===widths.length-1;
      if(kx+kw>x+W-9){kx=x+10;ky+=40;}
      this.box(kx,ky,kw,35,ember?'#241238':'#0d1422',ember?'#6b21a8':'#26354d');
      this.text(name,kx+8,ky+10,10,C.muted);
      if(ember)this.text(bonus,kx+kw-8,ky+10,10,C.amber,true,kw,'right');
      this.text(val,kx+8,ky+23,12,color,true,kw-12);kx+=kw+5;
    });
    const my=y+headH-33,mission=d.MISSIONS_DEF[w.missionIndex];
    this.box(x+10,my,inner,25,'#0d1526','#283b59');
    const code=mission?'['+mission.id+']':'[通关]';
    this.text(code,x+18,my+13,11,C.amber,true);
    this.text(mission?mission.name+'：'+mission.desc:'全部 51 项主线任务已完成！可随时启动文明跃迁！',x+24+this.measure(code,11,true),my+13,11,C.ink,false,inner-90);
    this.text(w.missionIndex+'/51',x+W-18,my+13,11,C.green,true,50,'right');
    this.hit(x+10,my,inner,25,()=>this.jumpTo('prestige','mission'));

    const ly=y+headH+gap,lw=wide?390:W,inset=wide?10:8,lx=x+inset,lcy=ly+inset,cw=lw-2*inset,stage=wide?212:112;
    const resources=d.RESOURCES_DEF.filter(r=>w.unlockedRes[r.id]);
    const resY=lcy+stage+gap;
    const resH=wide?bottom-inset-45-gap-resY:Math.min(92,37+Math.ceil(resources.length/2)*41-4);
    const ay=resY+resH+gap, leftBottom=ay+45+inset;
    this.box(x,ly,lw,leftBottom-ly,C.panel,C.line,2);
    this.box(lx,lcy,stage,stage,'#071318','#384e73',2);
    c.drawImage(this.scene(),lx+2,lcy+2,stage-4,stage-4);
    this.box(lx+5,lcy+stage-24,stage-10,18,'rgba(8,13,22,.82)','#234052',1,2);
    this.text(['+RNA','+食物/木/知'][w.eraIndex]||'+时代资源',lx+stage/2,lcy+stage-15,10,'#6ee7b7',false,stage-14,'center');
    this.hit(lx,lcy,stage,stage,()=>g.collect());
    const sx=lx+stage+8,sw=cw-stage-8;
    const hint='点击正方形 / [Space] 采集',twoLines=this.measure(hint,11,true)>sw-14;
    const hintH=twoLines?39:24;
    this.box(sx,lcy,sw,hintH,'#102c2d','#086951',1,3);
    (twoLines?['点击正方形 / [Space]','采集']:[hint]).forEach((line,i)=>this.text(line,sx+sw/2,lcy+12+i*15,11,'#6ee7b7',true,sw-6,'center'));
    this.hit(sx,lcy,sw,hintH,()=>g.collect());
    const fs=wide?11.5:11,lore=this.lines(e.desc,sw,fs).slice(0,wide?6:3);
    const loreY=lcy+stage/2+3-lore.length*fs*1.35/2;
    lore.forEach((line,i)=>this.text(line,sx,loreY+(i+.5)*fs*1.35,fs,'#cbd5e1'));
    const metaLines=this.lines('渲染帧率: 15 FPS 低功耗',sw-51,10);
    const metaY=lcy+stage-4-metaLines.length*14;
    for(let xx=sx;xx<lx+cw;xx+=5)this.box(xx,metaY,3,1,'#26354d',null,0,0);
    metaLines.forEach((line,i)=>this.text(line,sx,metaY+11+14*i,10,C.muted));
    this.text('采集: '+w.clicks+' 次',lx+cw,metaY+11,10,C.muted,false,65,'right');
    this.box(lx,resY,cw,resH,'#0c121e','#24324a');
    const ri=wide?8:6,rx=lx+ri,rw=cw-2*ri;
    this.text('📊 全文明资源库存与净产率',rx,resY+ri+8,11,C.sky,true,rw-75);
    this.text('已解锁 '+resources.length+'/26',rx+rw,resY+ri+8,10,C.muted,true,83,'right');
    this.box(rx,resY+ri+19,rw,1,'#1e293b',null,0);
    const grid={x:rx,y:resY+ri+25,w:rw,h:Math.max(1,resH-2*ri-25)};
    this.grid=grid;this.maxResScroll=Math.max(0,Math.ceil(resources.length/2)*41-4-grid.h);
    this.resScroll=Math.min(this.resScroll,this.maxResScroll);this.beginClip(grid);
    resources.forEach((r,i)=>{
      const width=(rw-4)/2,xx=rx+(i%2)*(width+4),yy=grid.y+Math.floor(i/2)*41-this.resScroll;
      const val=w.res[r.id],cap=m.caps[r.id],net=m.netRates[r.id]||0;
      this.box(xx,yy,width,37,'#131c2e','#233149',1,3);
      this.text(r.name,xx+6,yy+11,11,C.ink,true,width-44);
      this.text(fmt(val)+'/'+fmt(cap),xx+6,yy+26,10,C.muted);
      this.text(rateText(net),xx+width-6,yy+11,10,net>.05?C.green:net<-.05?C.rose:C.muted,true,60,'right');
      const secs=Math.ceil((cap-val)/net);
      const eta=net>.05&&val<cap?'满:'+(secs>9999?'>9999':secs)+'s':net<-.05&&val>0?'空:'+Math.ceil(val/-net)+'s':'平衡';
      this.text(eta,xx+width-6,yy+26,9,C.dim,false,65,'right');
      this.hit(xx,yy,width,37,()=>this.jumpTo('sys','resources'));
    });this.endClip();
    const half=(cw-6)/2,dna=!w.eraIndex&&w.techs.evo_membrane;
    const sub=!w.eraIndex?'RNA:'+fmt(w.res.rna)+'/'+m.caps.rna+' | DNA:'+fmt(w.res.dna)+'/'+m.caps.dna:w.eraIndex===1?'木:'+fmt(w.res.lumber)+' 石:'+fmt(w.res.stone)+' 知:'+fmt(w.res.knowledge):'币:'+fmt(w.res.money)+' 知:'+fmt(w.res.knowledge);
    this.button(lx,ay,half,45,dna?'🧬 合成 DNA (2RNA→1)':e.actionBtn.title,e.actionBtn.color.slice(3),!dna||(w.res.rna>=2&&w.res.dna<m.caps.dna)?()=>g.action():null,sub,12);
    const can=g.canPrestigeNow();
    this.button(lx+half+6,ay,half,45,can?'🚀 启动恒星际跃迁':w.eraIndex===6?'终局时代: 太空文明':'下一时代: '+d.ERAS_DEF[w.eraIndex+1].name,can?'purple':'slate',can?this.actions.prestige:null,can?'可获得 +'+g.calcPrestigeGain()+' 创世余烬':e.nextReqText);

    const px=wide?x+lw+gap:x,py=wide?ly:leftBottom+gap,pw=wide?W-lw-gap:W,bar=wide?50:56;
    this.box(px,py,pw,bottom-py,C.panel,C.line,2);
    this.box(px+2,py+2,pw-4,bar,'#0d1320',null,0,0);
    this.box(px+2,py+bar,pw-4,2,C.line,null,0,0);
    const tw=(pw-24)/5;
    const ready=t=>!w.techs[t.id]&&t.era<=w.eraIndex&&t.req.every(id=>w.techs[id])&&g.canAffordCost(t.cost);
    const badges=[d.EVO_CHAIN_IDS.some(id=>ready(d.TECH_MAP[id]))||Object.values(w.jobs).reduce((a,b)=>a+b,0)<Math.floor(w.pop),d.BUILDINGS_DEF.some(b=>b.era<=w.eraIndex&&(!b.reqTech||w.techs[b.reqTech])&&(!b.maxCount||w.buildings[b.id]<b.maxCount)&&g.canAffordCost(g.getBuildingCost(b,1))),d.TECHS_DEF.some(ready),can,false];
    tabs.forEach(([id,icon,label],i)=>{
      const xx=px+6+i*(tw+3),yy=py+6,active=this.tab===id,bh=bar-10;
      this.box(xx,yy,tw,bh,active?'#1e2d4a':'#162033',active?C.sky:'#293852');
      if(active)this.box(xx+1,yy+bh-3,tw-2,2,C.sky,null,0);
      if(wide)this.text(icon+' '+label,xx+tw/2,yy+bh/2,12,active?'#fff':C.muted,true,tw-4,'center');
      else {this.text(icon,xx+tw/2,yy+13,12,C.ink,false,tw,'center');this.text(label,xx+tw/2,yy+32,11,active?'#fff':C.muted,true,tw-2,'center');}
      if(badges[i])this.box(xx+tw-11,yy+4,7,7,'#10b981',null,0,4);
      this.hit(xx,yy,tw,bh,()=>this.changeTab(id));
    });
    this.list={x:px+2,y:py+2+bar,w:pw-4,h:Math.max(0,bottom-4-py-bar)};
    this.beginClip(this.list);
    this.cx=px+10;this.cw=pw-20;
    this.start=this.list.y+8-(this.scrolls[this.tab]||0);this.cy=this.start;
    this.panels();
    this.maxScroll=Math.max(0,this.cy-this.start+8-this.list.h);
    this.scrolls[this.tab]=Math.min(this.scrolls[this.tab]||0,this.maxScroll);
    this.endClip();
    const now=Date.now();this.floats=this.floats.filter(f=>now-f.born<750);
    this.floats.forEach(f=>{const t=(now-f.born)/750;c.globalAlpha=1-t;this.text(f.label,lx+stage/2,lcy+stage*.45-38*t,13,f.color,true,200,'center');});c.globalAlpha=1;
    if(g.save.settings.crt){c.fillStyle='rgba(0,0,0,.16)';for(let j=0;j<this.height;j+=3)c.fillRect(0,j,this.width,1);}
    if(this.dialog)this.drawDialog();
    if(this.toastUntil>now){
      const width=Math.min(this.width*.92,this.measure(this.toastMessage,12,true)+32),xx=(this.width-width)/2;
      this.box(xx,y+12,width,35,'#0f172a',C.sky,2);
      this.text(this.toastMessage,this.width/2,y+29,12,'#f8fafc',true,width-24,'center');
    }
  }
  // Each row uses the same two-column structure as the source HTML:
  // text flows within the available width, while the action keeps its intrinsic width.
  row(x,y,width,{title,color=C.sky,desc='',detail='',cost,btn,action,tone='sky',height=36,inner=false,done=false,tag=''}){
    const pad=inner?9:10,buttonW=btn?Math.ceil(this.measure(btn,11,true))+24:0;
    const textW=width-2*pad-(btn?buttonW+8:0);
    const titleLines=this.lines(title,textW,12);
    const descriptions=this.lines(desc,textW,10);
    const parts=cost?[[detail,C.ink],...Object.entries(cost).map(([id,n])=>[this.game.defs.RES_MAP[id].name+':'+fmt(n)+' ',this.game.save.world.res[id]>=n?C.green:C.rose])]:detail?[[detail,done?C.green:C.rose]]:[];
    const runs=[];let dx=0,line=0;
    for(const [str,color] of parts){
      const len=this.measure(str,10);
      if(dx&&dx+len>textW){dx=0;line++;}
      runs.push({str,color,dx,line});dx+=len;
    }
    const textH=titleLines.length*17+descriptions.length*14+(runs.length?(line+1)*14:0)+(inner?0:4);
    const h=Math.max(textH,btn?height:0)+(inner?14:18);
    this.box(x,y,width,h,inner?(done?'#0d261c':'#0f172a'):done?'#0c2219':C.card,inner?(done?'#059669':'#26354d'):done?'#065f46':C.line,inner?1:2);
    let ty=y+(h-textH)/2;
    titleLines.forEach(str=>{this.text(str,x+pad,ty+8,12,color,true,textW);ty+=17;});
    if(tag && titleLines.length===1){
      const tagX=x+pad+this.measure(title,12,true)+5, space=x+pad+textW-tagX;
      if(space>20){const tagW=Math.min(space,this.measure(tag,10)+10);this.box(tagX,y+(h-textH)/2+1,tagW,15,'#1e293b',null,0,3);this.text(tag,tagX+5,y+(h-textH)/2+8,10,C.muted,false,tagW-8);}
    }
    if(!inner)ty+=2;
    descriptions.forEach(str=>{this.text(str,x+pad,ty+7,10,C.muted);ty+=14;});
    if(!inner)ty+=2;
    runs.forEach(r=>this.text(r.str,x+pad+r.dx,ty+7+r.line*14,10,r.color,false,textW-r.dx));
    if(btn)this.button(x+width-pad-buttonW,y+(h-height)/2,buttonW,height,btn,tone,action);
    return h;
  }
  panels(){
    const g=this.game,w=g.save.world,d=g.defs,m=g.metrics,x=this.cx,width=this.cw;
    const row=opts=>{this.cy+=this.row(x,this.cy,width,opts)+8;};
    const block=(h,color=C.line)=>this.box(x,this.cy,width,h,C.card,color,2);
    const advance=h=>{this.cy+=h+8;};
    const research=(id,index,evo)=>{
      const t=d.TECH_MAP[id],done=!!w.techs[id],required=t.req.every(r=>w.techs[r]);
      const enabled=!done&&required&&t.era<=w.eraIndex&&g.canAffordCost(t.cost);
      return {title:(evo?(index+1)+'. ':'')+t.name,desc:t.desc,tag:evo?'':d.ERAS_DEF[t.era].name,done,color:done?C.green:C.sky,
        detail:done?'✅ 已完成'+(evo?'进化':'研究'):required?'消耗: ':(evo?'前置: ':'前置要求: ')+t.req.map(r=>d.TECH_MAP[r].name).join(evo?', ':' + '),
        cost:!done&&required?t.cost:null,btn:evo?(done?'':'进化'):done?'已研究':'研究',height:evo?34:36,action:enabled?()=>g.research(id):null,tone:evo?'emerald':'sky',inner:evo};
    };
    if(this.tab==='evo'){
      if(w.eraIndex>=1){
        const jobs=d.JOBS_DEF.filter(j=>j.era<=w.eraIndex&&(!j.reqTech||w.techs[j.reqTech]));
        const idle=Math.floor(w.pop)-Object.values(w.jobs).reduce((a,b)=>a+b,0);
        const recruitLabel=cap=>cap<=0?'住房已满':'📣 吸引流民 (+'+Math.min(cap,2)+'人 / '+fmt(g.getRecruitFoodCost())+'食物)';
        const cap=m.popCap-Math.floor(w.pop),food=g.getRecruitFoodCost(),inner=width-20;
        const recruitWidth=this.measure(recruitLabel(cap),11,true)+20;
        const sideBySide=inner>recruitWidth+285;
        const recruitHeight=sideBySide?48:78;
        const h=53+recruitHeight+jobs.length*49;
        block(h);this.text('👥 人口与 12 职业分工',x+10,this.cy+19,12,C.sky,true);
        this.text('空闲: '+idle+' / '+Math.floor(w.pop)+' (幸福 ×'+m.happyMult.toFixed(2)+')',x+width-10,this.cy+19,10,C.ink,false,width/2,'right');
        const yy=this.cy+39;
        this.box(x+10,yy,inner,recruitHeight,'#0c1322','#1e3a2f');
        this.text('📈 人口自然净增速: +'+m.popGrowthRate.toFixed(2)+' 人/秒',x+17,yy+12,11,C.green,true,inner-14);
        this.text('基础 +'+m.popBaseRate.toFixed(2)+'/s | 空房引力 +'+m.popVacancyBonus.toFixed(2)+'/s | 繁荣倍率 ×'+m.popProsperityMult.toFixed(1),x+17,yy+28,10,C.muted,false,inner-14);
        this.button(sideBySide?x+width-17-recruitWidth:x+17,yy+(sideBySide?7:37),Math.min(recruitWidth,inner-14),34,recruitLabel(cap),'emerald',cap>0&&w.res.food>=food?()=>g.recruit():null);
        jobs.forEach((j,i)=>{
          const yy=this.cy+47+recruitHeight+49*i;
          this.box(x+10,yy,width-20,45,'#0f172a','#24324a');
          this.text(j.name+' ['+(w.jobs[j.id]||0)+'人]',x+18,yy+13,12,C.ink,true);
          this.text(j.desc,x+18,yy+31,10,C.muted,false,width-150);
          [-1,1,5].forEach((n,k)=>this.button(x+width-118+k*34,yy+7,30,30,['-','+','+5'][k],['slate','sky','indigo'][k],()=>g.adjustJob(j.id,n)));
        });advance(h);
      }
      const items=d.EVO_CHAIN_IDS.map((id,i)=>research(id,i,true));
      // Draw the surrounding group before the rows so the single frame includes wrapped descriptions.
      const innerW=width-20;
      let total=41;
      for(const item of items){
        const textW=innerW-18-(item.btn?Math.ceil(this.measure(item.btn,11,true))+32:0);
        total+=14+17+14*this.lines(item.desc,textW,10).length+14+8;
      }
      block(total+2);
      this.text('🧬 生命基因进化树 (8 阶段)',x+10,this.cy+19,12,C.green,true,width-110);
      this.text(w.techs.evo_sapiens?'✅ 已完成智人演化':'向智慧生命演进',x+width-10,this.cy+19,10,C.muted,false,100,'right');
      this.box(x+10,this.cy+32,width-20,1,'#26354d',null,0);
      this.cy+=41;
      items.forEach(item=>{this.cy+=this.row(x+10,this.cy,innerW,item)+8;});
      this.cy+=10;
    }else if(this.tab==='bld'){
      block(48);this.text('🏛️ 批量建造:',x+10,this.cy+24,12,C.amber,true);
      if(w.techs.electricity)this.text('⚡发电 '+Math.round(m.powerGen)+'MW / 负荷 '+Math.round(m.powerReq)+'MW',x+106,this.cy+24,10,C.sky,false,Math.max(0,width-255));
      [1,10,'MAX'].forEach((n,i)=>this.button(x+width-136+i*42,this.cy+9,38,30,n==='MAX'?n:'x'+n,this.batch===n?'amber':'slate',()=>{this.batch=n;g.setBatch(n);}));
      advance(48);
      const buildings=d.BUILDINGS_DEF.filter(b=>b.era<=w.eraIndex&&(!b.reqTech||w.techs[b.reqTech]));
      if(!buildings.length){
        const msg='当前处于生命起源时代，研究【智人诞生】进入农业文明后解锁全部 35 种建筑！',lines=this.lines(msg,width-44,12),h=44+17*lines.length;
        block(h);lines.forEach((str,i)=>this.text(str,x+22,this.cy+30+i*17,12,C.muted));advance(h);
      }
      buildings.forEach(b=>{
        const owned=w.buildings[b.id]||0,maxed=b.maxCount&&owned>=b.maxCount;
        const qty=this.batch==='MAX'?Math.max(1,g.getMaxAffordableBuilding(b)):Math.min(this.batch,b.maxCount?b.maxCount-owned:this.batch);
        const cost=g.getBuildingCost(b,qty);
        row({title:b.name,tag:'已建 '+owned+'  ['+d.ERAS_DEF[b.era].name+']',color:C.amber,desc:b.desc,cost:maxed?null:cost,detail:maxed?'✅ 已达建造上限':'费用(+'+qty+'): ',btn:maxed?'已满':'建造 +'+qty,tone:'amber',action:!maxed&&g.canAffordCost(cost)?()=>g.build(b.id):null});
      });
    }else if(this.tab==='tech'){
      block(44);this.text('🔬 文明科技树 ('+Object.keys(w.techs).filter(id=>w.techs[id]).length+'/44)',x+10,this.cy+22,12,C.sky,true);
      this.button(x+width-83,this.cy+8,73,28,this.hideDone?'显示已研究':'隐藏已研究',this.hideDone?'sky':'slate',()=>{this.hideDone=!this.hideDone;},null,10);advance(44);
      d.TECHS_DEF.filter(t=>t.era<=w.eraIndex+1&&!(this.hideDone&&w.techs[t.id])).forEach(t=>row(research(t.id,0,false)));
    }else if(this.tab==='prestige'){
      const p=g.save.prestige,can=g.canPrestigeNow(),gain=g.calcPrestigeGain();
      const narrow=width<490,h=narrow?131:82;block(h,'#6b21a8');
      this.text('🚀 恒星际文明跃迁 (Prestige 转生)',x+10,this.cy+19,12,C.purple,true);
      this.text('累计余烬: '+p.lifetimeShards+' (全局产能 +'+p.lifetimeShards*2+'%) | 可用余烬: '+p.genesisShards,x+10,this.cy+34,10,C.muted);
      this.button(narrow?x+10:x+width-150,this.cy+(narrow?47:10),140,36,can?'🔥 启动跃迁 (+'+gain+'余烬)':'未达终局 (预计+'+gain+'余烬)','purple',can?this.actions.prestige:null);
      this.lines('跃迁条件：进入【太空文明】、研究【星际航行】并建造 1 艘【恒星际殖民方舟】。',width-20,10).forEach((s,i)=>this.text(s,x+10,this.cy+(narrow?99:60)+i*14,10,C.muted));
      advance(h);
      d.PERKS_DEF.forEach(perk=>{
        const lv=g.getPerkLevel(perk.id),cost=perk.costs[lv];
        row({title:perk.icon+' '+perk.name+' [Lv.'+lv+'/5]',color:C.amber,desc:perk.desc,btn:lv===5?'已满级':'升级 ('+cost+'余烬)',height:34,tone:'purple',action:lv<5&&p.genesisShards>=cost?()=>g.buyPerk(perk.id):null});
      });
      this.text('📜 51 项顺序主线进度 ('+w.missionIndex+' / 51)',x,this.cy+13,12,C.green,true);advance(21);
      d.MISSIONS_DEF.slice(Math.max(0,w.missionIndex-2),w.missionIndex+6).forEach(task=>{
        const index=d.MISSIONS_DEF.indexOf(task),active=index===w.missionIndex;
        if(active)this.anchors.mission=this.cy-this.start;
        const reward=index<w.missionIndex?'✅已完成':task.rewardText,right=Math.min(width*.4,this.measure(reward,10));
        const lines=this.lines('['+task.id+'] '+task.name+'：'+task.desc,width-right-30,11),h=16+lines.length*15;
        this.box(x,this.cy,width,h,active?'#0d2119':C.card,active?'#10b981':C.line,2);
        lines.forEach((s,i)=>this.text(s,x+10,this.cy+15+15*i,11,active?C.green:C.muted));
        this.text(reward,x+width-10,this.cy+h/2,10,index<w.missionIndex?C.green:C.amber,false,right,'right');advance(h);
      });
    }else{
      block(127);this.text('💾 终端设置与跨设备存档',x+10,this.cy+19,12,C.sky,true);
      const s=g.save.settings;
      const buttons=[
        ['🔊 音效: '+(s.sound?'开':'关'),s.sound?'emerald':'slate',()=>{s.sound=!s.sound;this.actions.save(false);}],
        ['📺 扫描线: '+(s.crt?'开':'关'),s.crt?'sky':'slate',()=>{s.crt=!s.crt;this.actions.save(false);}],
        ['💾 手动存档','amber',()=>this.actions.save(true)],['📤 导出存档码','sky',this.actions.exportSave],
        ['📥 导入存档码','indigo',this.actions.importSave],['🗑️ 清空存档','rose',this.actions.reset]
      ];
      const bw=(width-32)/3;
      buttons.forEach(([label,color,action],i)=>this.button(x+10+(i%3)*(bw+6),this.cy+35+44*Math.floor(i/3),bw,38,label,color,action));advance(127);
      this.anchors.resources=this.cy-this.start;
      block(42+d.RESOURCES_DEF.length*30);this.text('📦 26 种全文明资源百科与上限明细',x+10,this.cy+18,12,C.green,true);
      d.RESOURCES_DEF.forEach((r,i)=>{
        const yy=this.cy+35+i*30,unlocked=w.unlockedRes[r.id],net=m.netRates[r.id]||0;
        this.box(x+10,yy,width-20,26,'#0d1422','#1e293b',1,3);
        this.text(r.name,x+18,yy+13,11,unlocked?C.ink:C.dim,true);
        this.text('['+d.ERAS_DEF[r.era].name+']',x+22+this.measure(r.name,11,true),yy+13,10,C.dim);
        this.text(unlocked?fmt(w.res[r.id])+' / '+fmt(m.caps[r.id])+' ('+rateText(net)+')':'未解锁',x+width-18,yy+13,11,unlocked?C.ink:C.dim,false,width/2,'right');
      });advance(42+d.RESOURCES_DEF.length*30);
    }
  }
  openDialog(dialog){this.dialog=dialog;this.touch=null;this.render();}
  closeDialog(){this.dialog=null;this.render();}
  drawDialog(){
    const d=this.dialog, w=Math.min(this.width-24,440), x=(this.width-w)/2;
    const lines=this.lines(d.body,w-32,12), hasCode=d.code!==undefined;
    const h=103+lines.length*17+(hasCode?106:0);
    const y=Math.max(this.safeTop,(this.height-h)/2);
    this.hits=[];
    this.box(0,0,this.width,this.height,'rgba(5,8,15,.82)',null,0,0);
    this.box(x,y,w,h,C.panel,C.sky,2,6);
    this.text(d.title,x+16,y+31,14,C.sky,true,w-70);
    this.button(x+w-46,y+16,30,27,'✕','slate',()=>this.closeDialog());
    lines.forEach((s,i)=>this.text(s,x+16,y+60+i*17,12,C.muted));
    if(hasCode){
      const fieldY=y+61+lines.length*17;
      this.box(x+16,fieldY,w-32,96,'#090d16','#334155');
      this.lines(d.code.slice(0,480)||'点击此处从剪贴板粘贴存档码…',w-50,11).slice(0,5).forEach((line,i)=>this.text(line,x+24,fieldY+15+15*i,11,d.code?C.sky:C.dim));
      if(d.paste)this.hit(x+16,fieldY,w-32,96,d.paste);
    }
    const yy=y+h-44;
    this.button(x+16,yy,54,29,d.cancel||'取消','slate',()=>this.closeDialog());
    const bw=this.measure(d.label,11,true)+24;
    this.button(x+w-16-bw,yy,bw,29,d.label,d.tone,()=>d.confirm());
  }
  changeTab(tab){this.tab=tab;this.render();}
  jumpTo(tab,anchor){this.changeTab(tab);this.scrolls[tab]=Math.min(this.maxScroll,this.anchors[anchor]||0);this.render();}
  scroll(x,y,delta){
    if(this.dialog)return;
    if(inside(this.grid,x,y))this.resScroll=Math.max(0,Math.min(this.maxResScroll,this.resScroll+delta));
    else if(inside(this.list,x,y))this.scrolls[this.tab]=Math.max(0,Math.min(this.maxScroll,(this.scrolls[this.tab]||0)+delta));
  }
  touchStart(x,y,id=0){if(!this.touch)this.touch={x:x-this.left,y,lastY:y,id,moved:false};}
  touchMove(x,y,id=0){
    const t=this.touch;if(!t||id!==t.id)return;
    t.moved = t.moved || Math.abs(x-this.left-t.x)>8||Math.abs(y-t.y)>8;
    if(t.moved)this.scroll(t.x,t.y,t.lastY-y);
    t.lastY=y;
  }
  touchEnd(x,y,id=0){
    const t=this.touch;if(!t||id!==t.id)return;this.touch=null;x-=this.left;
    if(t.moved||Math.abs(x-t.x)>8||Math.abs(y-t.y)>8)return;
    const hit=this.hits.slice().reverse().find(r=>inside(r,t.x,t.y)&&inside(r,x,y));
    if(hit){hit.action();this.render();}
  }
  touchCancel(){this.touch=null;}
}
module.exports={GameUI,fmt};
