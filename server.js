const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const CARDS = [
  {"name":"Meny, The Pilot","cost":4,"type":"Minion","attack":3,"health":5,"text":"Battlecry: Ask Codex for backup."},
  {"name":"Migras, Sticker Prophet","cost":3,"type":"Minion","attack":2,"health":4,"text":"Whenever you lose a debate, add a Sticker to your hand."},
  {"name":"Codex, Unliving Mind","cost":6,"type":"Minion","attack":5,"health":7,"text":"At the end of your turn, correct a random enemy claim."},
  {"name":"Ad Hominem","cost":1,"type":"Spell","text":"Deal 3 damage."},
  {"name":"Ad Populum","cost":2,"type":"Spell","text":"Silence a minion."},
  {"name":"Gatekeeper of Status Quo","cost":5,"type":"Minion","attack":3,"health":6,"text":"Taunt."},
  {"name":"Luddite Doomcaller","cost":2,"type":"Minion","attack":2,"health":2,"text":"Deathrattle: Summon a 1/1 Bubble."},
  {"name":"Self Improvement Arc","cost":4,"type":"Spell","text":"Give a friendly minion +2/+2."},
  {"name":"VERTREP Supply Run","cost":3,"type":"Spell","text":"Restore 4 Health. Draw a card."},
  {"name":"Treasury Leviathan","cost":8,"type":"Minion","attack":8,"health":8,"text":"Taunt."},
  {"name":"Shadow Fleet Raider","cost":4,"type":"Minion","attack":4,"health":3,"text":"Stealth. When revealed, take 1 damage."},
  {"name":"Google IA Screenshot","cost":1,"type":"Spell","text":"Draw a card."},
  {"name":"The Group Chat","cost":2,"type":"Location","text":"Deal 1 damage to enemy hero."},
  {"name":"The Surprise","cost":7,"type":"Secret","text":"Deal 7 damage to enemy hero."},
  {"name":"Wiki Wiki","cost":0,"type":"Spell","text":"Add two Emojis to your hand."},
  {"name":"Singularity Wakeup","cost":10,"type":"Spell","text":"Draw 3 cards."},
  {"name":"Indefensible Position","cost":3,"type":"Spell","text":"Gain 5 Armor."},
  {"name":"Move the Goalposts","cost":2,"type":"Spell","text":"Return an enemy minion to hand. It costs 2 more."},
  {"name":"Source? Trust Me","cost":1,"type":"Spell","text":"Draw a card. Add a Sticker to your hand."},
  {"name":"Status Quo Lobby","cost":4,"type":"Minion","attack":2,"health":6,"text":"Taunt."}
];

const TOKENS = {
  Sticker: {name:"Sticker",cost:1,type:"Spell",text:"Deal 1 damage to enemy hero."},
  Emoji: {name:"Emoji",cost:0,type:"Spell",text:"Deal 1 damage to enemy hero."},
  Bubble: {name:"Bubble",cost:1,type:"Minion",attack:1,health:1,text:""}
};

const rooms = {};

function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;}
function makeDeck(){const d=[];for(const c of CARDS){d.push({...c},{...c});}return shuffle(d);}
function mkMinion(c){return {name:c.name,cost:c.cost,type:"Minion",attack:c.attack,health:c.health,maxHealth:c.health,text:c.text||"",attacksLeft:0,stealth:c.name==="Shadow Fleet Raider",taunt:/Taunt/.test(c.text||""),silenced:false};}
function dmgHero(p,n){const a=Math.min(p.armor,n);p.armor-=a;p.hp-=(n-a);}
function draw(g,s){const p=g.players[s];const c=p.deck.pop();if(!c){p.fatigue++;dmgHero(p,p.fatigue);g.log.push("P"+(s+1)+" fatigues for "+p.fatigue);}else if(p.hand.length<10)p.hand.push(c);}
function addHand(p,c){if(p.hand.length<10)p.hand.push({...c});}

function checkDeaths(g){
  let again=true;
  while(again){
    again=false;
    for(let s=0;s<2;s++){
      const p=g.players[s];
      for(let i=p.board.length-1;i>=0;i--){
        const m=p.board[i];
        if(m.health<=0){
          p.board.splice(i,1);
          g.log.push(m.name+" died");
          if(!m.silenced&&m.name==="Luddite Doomcaller"&&p.board.length<7){p.board.push(mkMinion(TOKENS.Bubble));g.log.push("A Bubble appears");}
          if(p.board.some(x=>x.name==="Migras, Sticker Prophet"&&!x.silenced)){addHand(p,TOKENS.Sticker);g.log.push("Migras hands over a Sticker");}
          again=true;
        }
      }
    }
  }
  for(let s=0;s<2;s++)if(g.players[s].hp<=0&&!g.over){g.over=true;g.winner=g.players[1-s].hp>0?(1-s):-1;}
}

function resolveTarget(g,p,t){
  if(!t)return null;
  const side=t.who==="me"?p:1-p;
  const pl=g.players[side];
  if(t.what==="hero")return {hero:pl,side};
  const m=pl.board[t.i];
  return m?{minion:m,side}:null;
}

function castSpell(g,p,c,t){
  const me=g.players[p],op=g.players[1-p];
  switch(c.name){
    case "Sticker": case "Emoji": dmgHero(op,1); break;
    case "Ad Hominem": {
      const r=resolveTarget(g,p,t); if(!r)return "bad target";
      if(r.minion){if(r.minion.stealth)return "stealthed"; r.minion.health-=3;} else dmgHero(r.hero,3);
      break;
    }
    case "Ad Populum": {
      const r=resolveTarget(g,p,t); if(!r||!r.minion)return "needs a minion target";
      if(r.minion.stealth)return "stealthed";
      r.minion.silenced=true;r.minion.taunt=false;r.minion.stealth=false;
      break;
    }
    case "Self Improvement Arc": {
      if(!t||t.who!=="me")return "needs friendly minion";
      const m=me.board[t.i]; if(!m)return "bad target";
      m.attack+=2;m.health+=2;m.maxHealth+=2;
      break;
    }
    case "Move the Goalposts": {
      if(!t||t.who!=="op")return "needs enemy minion";
      const m=op.board[t.i]; if(!m)return "bad target";
      if(m.stealth)return "stealthed";
      op.board.splice(t.i,1);
      addHand(op,{name:m.name,cost:m.cost+2,type:"Minion",attack:m.attack,health:m.maxHealth,text:m.text});
      break;
    }
    case "VERTREP Supply Run": me.hp=Math.min(30,me.hp+4); draw(g,p); break;
    case "Google IA Screenshot": draw(g,p); break;
    case "The Group Chat": dmgHero(op,1); break;
    case "The Surprise": dmgHero(op,7); break;
    case "Wiki Wiki": addHand(me,TOKENS.Emoji); addHand(me,TOKENS.Emoji); break;
    case "Singularity Wakeup": draw(g,p); draw(g,p); draw(g,p); break;
    case "Indefensible Position": me.armor+=5; break;
    case "Source? Trust Me": draw(g,p); addHand(me,TOKENS.Sticker); break;
    default: return "unknown card";
  }
  return null;
}

function playCard(g,p,idx,t){
  if(g.over)return "game over";
  if(g.turn!==p)return "not your turn";
  const me=g.players[p];
  const c=me.hand[idx];
  if(!c)return "no such card";
  if(c.cost>me.mana)return "not enough mana";
  if(c.type==="Minion"&&me.board.length>=7)return "board full";
  if(c.type==="Minion"){
    me.mana-=c.cost; me.hand.splice(idx,1);
    me.board.push(mkMinion(c));
    g.log.push("P"+(p+1)+" plays "+c.name);
    if(c.name==="Meny, The Pilot"){draw(g,p);g.log.push("Meny calls Codex for backup (draw 1)");}
  } else {
    const before={mana:me.mana};
    me.mana-=c.cost;
    const err=castSpell(g,p,c,t);
    if(err){me.mana=before.mana;return err;}
    me.hand.splice(idx,1);
    g.log.push("P"+(p+1)+" plays "+c.name);
  }
  checkDeaths(g);
  return null;
}

function doAttack(g,p,ai,t){
  if(g.over)return "game over";
  if(g.turn!==p)return "not your turn";
  const me=g.players[p],op=g.players[1-p];
  const a=me.board[ai];
  if(!a)return "no attacker";
  if(a.attacksLeft<1)return "minion cannot attack";
  if(a.attack<1)return "0 attack";
  const taunts=op.board.some(m=>m.taunt);
  if(!t)return "no target";
  if(t.what==="hero"){
    if(taunts)return "taunt in the way";
    dmgHero(op,a.attack);
    g.log.push(a.name+" hits face for "+a.attack);
  } else {
    const m=op.board[t.i];
    if(!m)return "bad target";
    if(m.stealth)return "stealthed";
    if(taunts&&!m.taunt)return "taunt in the way";
    m.health-=a.attack; a.health-=m.attack;
    g.log.push(a.name+" trades with "+m.name);
  }
  a.attacksLeft--;
  if(a.stealth){a.stealth=false;dmgHero(me,1);g.log.push(a.name+" revealed: you lose 1 Credibility");}
  checkDeaths(g);
  return null;
}

function startTurn(g){
  const p=g.players[g.turn];
  p.maxMana=Math.min(10,p.maxMana+1);
  p.mana=p.maxMana;
  for(const m of p.board)m.attacksLeft=1;
  draw(g,g.turn);
  g.log.push("P"+(g.turn+1)+"'s turn ("+p.maxMana+" mana)");
  checkDeaths(g);
}

function endTurn(g,p){
  if(g.over)return "game over";
  if(g.turn!==p)return "not your turn";
  const me=g.players[p],op=g.players[1-p];
  for(const m of me.board){
    if(m.name==="Codex, Unliving Mind"&&!m.silenced){
      const ts=op.board.filter(x=>!x.stealth);
      if(ts.length){const x=ts[Math.random()*ts.length|0];x.health-=1;g.log.push("Codex corrects "+x.name);}
      else {dmgHero(op,1);g.log.push("Codex corrects the enemy hero");}
    }
  }
  checkDeaths(g);
  if(g.over)return null;
  g.turn=1-p;
  startTurn(g);
  return null;
}

function newGame(){
  const g={turn:0,over:false,winner:-1,log:["Game started"],players:[]};
  for(let s=0;s<2;s++){
    g.players.push({hp:30,armor:0,mana:0,maxMana:0,fatigue:0,deck:makeDeck(),hand:[],board:[]});
  }
  for(let i=0;i<3;i++){draw(g,0);draw(g,1);}
  draw(g,1);
  startTurn(g);
  return g;
}

function packPlayer(p,full){
  return {hp:p.hp,armor:p.armor,mana:p.mana,maxMana:p.maxMana,deck:p.deck.length,board:p.board,hand:full?p.hand:p.hand.length};
}
function view(g,seat){
  return {seat,turn:g.turn,over:g.over,winner:g.winner,log:g.log.slice(-20),me:packPlayer(g.players[seat],true),op:packPlayer(g.players[1-seat],false)};
}
function broadcast(room){
  room.sockets.forEach((ws,i)=>{
    if(ws&&ws.readyState===1)ws.send(JSON.stringify({type:"state",state:view(room.game,i)}));
  });
}
function sendErr(ws,msg){ws.send(JSON.stringify({type:"error",msg}));}
function code4(){let c;do{c=Array.from({length:4},()=>String.fromCharCode(65+Math.random()*26|0)).join("");}while(rooms[c]);return c;}

// Added image MIME types so textures load with correct Content-Type (protocol unchanged).
const MIME={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml"};
const server=http.createServer((req,res)=>{
  let p=req.url.split("?")[0];
  if(p==="/health"){
    res.writeHead(200,{"Content-Type":"text/plain"});
    res.end("ok");
    return;
  }
  if(p==="/")p="/index.html";
  const clean=path.normalize(decodeURIComponent(p))
    .replace(/^([\/\\])+/,"")
    .replace(/^(\.\.[\/\\])+/,"");
  const base=clean.split(/[\/\\]/)[0]==="assets" ? __dirname : path.join(__dirname,"public");
  const file=path.join(base,clean);
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404);res.end("not found");return;}
    res.writeHead(200,{"Content-Type":MIME[path.extname(file)]||"application/octet-stream"});
    res.end(data);
  });
});

const wss=new WebSocketServer({server});
wss.on("connection",ws=>{
  ws.on("message",raw=>{
    let m;try{m=JSON.parse(raw);}catch(e){return;}
    const room=ws.roomCode?rooms[ws.roomCode]:null;
    if(m.type==="create_room"){
      const code=code4();
      rooms[code]={sockets:[ws,null],game:null};
      ws.roomCode=code;ws.seat=0;
      ws.send(JSON.stringify({type:"room_created",code,seat:0}));
    }
    else if(m.type==="join_room"){
      const r=rooms[(m.code||"").toUpperCase()];
      if(!r)return sendErr(ws,"no such room");
      if(r.sockets[1])return sendErr(ws,"room full");
      r.sockets[1]=ws;ws.roomCode=(m.code||"").toUpperCase();ws.seat=1;
      ws.send(JSON.stringify({type:"joined",code:ws.roomCode,seat:1}));
      if(r.sockets[0]&&r.sockets[0].readyState===1)r.sockets[0].send(JSON.stringify({type:"opponent_joined"}));
    }
    else if(m.type==="start_game"){
      if(!room)return sendErr(ws,"not in a room");
      if(!room.sockets[0]||!room.sockets[1])return sendErr(ws,"need 2 players");
      if(room.game&&!room.game.over)return sendErr(ws,"already started");
      room.game=newGame();
      broadcast(room);
    }
    else if(m.type==="play_card"||m.type==="attack"||m.type==="end_turn"){
      if(!room||!room.game)return sendErr(ws,"no game");
      const g=room.game;let err=null;
      if(m.type==="play_card")err=playCard(g,ws.seat,m.i,m.target);
      else if(m.type==="attack")err=doAttack(g,ws.seat,m.a,m.target);
      else err=endTurn(g,ws.seat);
      if(err)sendErr(ws,err);
      broadcast(room);
    }
  });
  ws.on("close",()=>{
    const room=ws.roomCode?rooms[ws.roomCode]:null;
    if(!room)return;
    room.sockets[ws.seat]=null;
    const other=room.sockets[1-ws.seat];
    if(other&&other.readyState===1)other.send(JSON.stringify({type:"opponent_left"}));
    if(!room.sockets[0]&&!room.sockets[1])delete rooms[ws.roomCode];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => console.log("listening on " + PORT));
