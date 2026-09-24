const express=require('express'),http=require('http'),fs=require('fs'),crypto=require('crypto');
const app=express(),srv=http.createServer(app),io=require('socket.io')(srv);
app.use(express.static(__dirname+'/public'));
const ADMIN=process.env.ADMIN_PASS||'Lyu09271517@',FILE=__dirname+'/data.json',SB=100,BB=200,N=6;
const NAMES=['Өндөр хөзөр','Хос','Хоёр хос','Гурвал','Стрит','Флэш','Фулл хаус','Каре','Стрит флэш'];
let U={};try{U=JSON.parse(fs.readFileSync(FILE))}catch(e){}
const save=()=>{try{fs.writeFileSync(FILE,JSON.stringify(U))}catch(e){}};
let seats=Array(N).fill(null),H=null,dealer=0,log=[],timer=null;
const lg=t=>{log.unshift(t);log=log.slice(0,30)};
const cv=c=>({r:c%13+2,s:c/13|0});
const online=t=>[...io.sockets.sockets.values()].some(s=>s.data.t==t);

// ---- hand evaluation ----
function ev5(c){const rs=c.map(x=>x.r).sort((a,b)=>b-a),fl=c.every(x=>x.s==c[0].s);let st=0;
if(new Set(rs).size==5){if(rs[0]-rs[4]==4)st=rs[0];else if(rs.join()=='14,5,4,3,2')st=5}
const cn={};rs.forEach(r=>cn[r]=(cn[r]||0)+1);
const g=Object.entries(cn).map(([r,n])=>[n,+r]).sort((a,b)=>b[0]-a[0]||b[1]-a[1]),k=g.map(x=>x[1]),n=g.map(x=>x[0]).join('');
if(st&&fl)return[8,st];if(n=='41')return[7,...k];if(n=='32')return[6,...k];if(fl)return[5,...rs];
if(st)return[4,st];if(n=='311')return[3,...k];if(n=='221')return[2,...k];if(n=='2111')return[1,...k];return[0,...rs]}
function cmp(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return d}return 0}
function best(c){let b=null;const rec=(i,a)=>{if(a.length==5){const v=ev5(a);if(!b||cmp(v,b)>0)b=v;return}
if(i>=c.length)return;rec(i+1,[...a,c[i]]);rec(i+1,a)};rec(0,[]);return b}

// ---- game flow ----
function pay(i,a){const p=H.p[i],u=U[p.t];a=Math.min(a,u.chips);u.chips-=a;p.bet+=a;p.total+=a;H.cur=Math.max(H.cur,p.bet)}
function startHand(){
if(H)return;
const act=[];seats.forEach((t,i)=>{if(t&&U[t].chips>0)act.push(i)});
if(act.length<2)return bc();
const deck=[...Array(52).keys()];for(let i=51;i>0;i--){const j=crypto.randomInt(i+1);[deck[i],deck[j]]=[deck[j],deck[i]]}
const af=i=>act.find(x=>x>i)??act[0];
dealer=af(dealer);const sb=af(dealer),bb=af(sb);
H={st:0,board:[],cur:0,turn:0,deck,show:false,res:0,dl:0,p:seats.map((t,i)=>act.includes(i)?{t,cards:[deck.pop(),deck.pop()],bet:0,total:0,fold:false,acted:false}:null)};
lg('— Шинэ гар —');pay(sb,SB);pay(bb,BB);H.turn=af(bb);step()}
function step(){
clearTimeout(timer);
const live=[];H.p.forEach((p,i)=>{if(p&&!p.fold)live.push(i)});
if(live.length==1)return finish();
const can=live.filter(i=>U[H.p[i].t].chips>0);
if(can.length==0||can.every(i=>H.p[i].acted&&H.p[i].bet==H.cur)||(can.length==1&&H.p[can[0]].bet>=H.cur))return nextStage();
let i=H.turn;for(let k=0;k<N;k++,i=(i+1)%N){const p=H.p[i];if(p&&!p.fold&&U[p.t].chips>0&&!(p.acted&&p.bet==H.cur))break}
H.turn=i;H.dl=Date.now()+30000;bc();
timer=setTimeout(()=>act(i,H.p[i].bet<H.cur?'f':'c'),30000)}
function act(i,t,amt){
if(!H||H.res||H.turn!==i)return;const p=H.p[i],u=U[p.t];
if(t=='f'){p.fold=true;lg(u.name+' хаялаа')}
else if(t=='c'){const a=Math.min(H.cur-p.bet,u.chips);pay(i,a);lg(u.name+(a?' тэнцүүлэв '+a:' шалгав'))}
else{const to=Math.min(p.bet+u.chips,Math.max(Math.floor(+amt)||0,H.cur+BB));if(to<=H.cur)return act(i,'c');
pay(i,to-p.bet);H.p.forEach((q,j)=>{if(q&&j!==i)q.acted=false});lg(u.name+(u.chips?' нэмлээ '+p.bet:' ALL-IN '+p.bet))}
p.acted=true;H.turn=(i+1)%N;step()}
function nextStage(){
H.p.forEach(p=>{if(p){p.bet=0;p.acted=false}});H.cur=0;H.st++;
if(H.st==1)H.board.push(H.deck.pop(),H.deck.pop(),H.deck.pop());else if(H.st<4)H.board.push(H.deck.pop());
if(H.st>=4)return finish();
H.turn=(dealer+1)%N;
const can=H.p.filter(p=>p&&!p.fold&&U[p.t].chips>0).length;
if(can<2){bc();timer=setTimeout(step,1200)}else step()}
function finish(){
clearTimeout(timer);
// fill remaining board if hand ended by all-in and we skipped ahead
const ps=H.p.map((p,i)=>p&&{...p,i}).filter(Boolean),live=ps.filter(p=>!p.fold);
H.show=live.length>1;const sc={};
if(H.show){while(H.board.length<5)H.board.push(H.deck.pop());live.forEach(p=>sc[p.i]=best(p.cards.concat(H.board).map(cv)))}
const lv=[...new Set(ps.filter(p=>p.total>0).map(p=>p.total))].sort((a,b)=>a-b);let prev=0;
for(const L of lv){
const sl=ps.reduce((s,p)=>s+Math.max(0,Math.min(p.total,L)-prev),0);prev=L;
let el=live.filter(p=>p.total>=L);if(!el.length)el=live;
let w=[el[0]];if(H.show)for(const p of el.slice(1)){const c=cmp(sc[p.i],sc[w[0].i]);if(c>0)w=[p];else if(c==0)w.push(p)}
const sh=Math.floor(sl/w.length);
w.forEach((p,k)=>{const a=sh+(k==0?sl-sh*w.length:0);U[p.t].chips+=a;lg(U[p.t].name+' хожлоо +'+a+(H.show?' ('+NAMES[sc[p.i][0]]+')':''))})}
H.res=1;H.turn=-1;save();bc();
setTimeout(()=>{
Object.values(U).forEach(u=>{if(u.pend){u.chips=Math.max(0,u.chips+u.pend);u.pend=0}});
seats.forEach((t,i)=>{if(t&&!online(t))seats[i]=null});
save();H=null;startHand();bc()},6000)}

// ---- state to clients ----
function view(s){
const t=s.data.t,me=seats.indexOf(t);
return{me,dealer,cur:H?H.cur:0,board:H?H.board:[],rem:H&&H.turn>=0?Math.max(0,H.dl-Date.now()):0,turn:H&&!H.res?H.turn:-1,
pot:H?H.p.reduce((a,p)=>a+(p?p.total:0),0):0,chips:U[t].chips+(U[t].pend||0),log:log.slice(0,6),
seats:seats.map((tk,i)=>{if(!tk)return null;const u=U[tk],p=H&&H.p[i];
return{name:u.name,chips:u.chips,bet:p?p.bet:0,fold:p?p.fold:false,in:!!p,cards:p&&!p.fold?(tk==t||H.show?p.cards:[-1,-1]):null}}),
users:s.data.admin?Object.values(U).map(u=>({name:u.name,chips:u.chips+(u.pend||0)})):null,admin:!!s.data.admin}}
function bc(){io.sockets.sockets.forEach(s=>{if(s.data.t)s.emit('s',view(s))})}

io.on('connection',s=>{
s.on('login',({token,name,pass})=>{
if(!token||typeof token!='string'||!name)return;
name=String(name).trim().slice(0,14)||'Тоглогч';
if(!U[token]){let n=name;while(Object.values(U).some(u=>u.name==n))n+='_';U[token]={name:n,chips:0};save()}
s.data.t=token;s.data.admin=(pass&&pass==ADMIN);bc()});
s.on('sit',i=>{const t=s.data.t;if(!t||seats.indexOf(t)>=0||!(i>=0&&i<N)||seats[i])return;seats[i]=t;lg(U[t].name+' суулаа');bc();if(!H)startHand()});
s.on('stand',()=>{const t=s.data.t,i=seats.indexOf(t);if(i<0)return;
if(H&&H.p[i]&&!H.p[i].fold&&!H.res){H.p[i].fold=true;seats[i]=null;step()}else{seats[i]=null;bc()}});
s.on('act',({t,amt})=>{const i=seats.indexOf(s.data.t);if(i>=0)act(i,t,amt)});
s.on('give',({name,amount})=>{
if(!s.data.admin)return;const a=Math.floor(+amount);if(!a)return;
const k=Object.keys(U).find(k=>U[k].name==name);if(!k)return;
if(H&&H.p.some(p=>p&&p.t==k))U[k].pend=(U[k].pend||0)+a;else U[k].chips=Math.max(0,U[k].chips+a);
lg(U[k].name+'-д '+a+' chip өглөө');save();bc();if(!H)startHand()});
s.on('disconnect',()=>{const t=s.data.t;if(!t)return;const i=seats.indexOf(t);
if(i>=0&&!(H&&H.p[i])){seats[i]=null}bc()})});
srv.listen(process.env.PORT||3000,()=>console.log('Poker server ready'));
