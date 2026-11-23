import {setupOffline} from "./pwa.js";
import {blank,History,id,point,project,readBackup,tools,zones} from "./model.js";
import {openStorage} from "./storage.js";
import {draw,exportCanvas,imageBlob,pdfBlob} from "./rink.js";
import {connectInput} from "./input.js";

const $=id=>document.getElementById(id);
const canvas=$("rink"), ctx=canvas.getContext("2d");
const dialog=$("dialog"), body=$("dialog-body"), actions=$("dialog-actions");
const byId=new Map(), pending=new Map();
let storage, active, history=new History(blank()), selection=null, tool="pen";
let pendingActive, draining, transient=null, playing=false, repaint=0, noticeTimer;
let exportHeading=true;
const inkColors=[["Mørk","#193d53"],["Rød","#bd273d"],["Blå","#175caa"],["Grønn","#177849"],["Oransje","#c35610"],["Lilla","#793bb0"]];
const widths=[["Tynn",.12],["Middels",.21],["Tykk",.38],["Ekstra tykk",.58]];
const icons={select:"↖",pen:"✎",line:"╱",arrow:"→",pass:"⇢",shot:"⇒",erase:"⌫"};

function notice(message) {
  $("notice").textContent=message;
  $("notice").hidden=false;
  clearTimeout(noticeTimer);
  noticeTimer=setTimeout(()=>$("notice").hidden=true,4500);
}
function frame() {
  if(repaint) return;
  repaint=requestAnimationFrame(()=>{
    repaint=0;
    const w=canvas.clientWidth,h=canvas.clientHeight, d=Math.min(devicePixelRatio||1,2.5);
    if(!w || !h) return;
    const pixelsX=Math.round(w*d), pixelsY=Math.round(h*d);
    if(canvas.width!==pixelsX||canvas.height!==pixelsY) {canvas.width=pixelsX;canvas.height=pixelsY;}
    ctx.setTransform(pixelsX/w,0,0,pixelsY/h,0,0);
    ctx.fillStyle="#203b52";ctx.fillRect(0,0,w,h);
    draw(ctx,w,h,transient||history.scene,selection);
  });
}
new ResizeObserver(frame).observe(canvas);

function button(text,action,{danger=false}={}) {
  const button=document.createElement("button");
  button.type="button";button.textContent=text;
  if(danger) button.className="danger";
  button.addEventListener("click",action);
  return button;
}
function paragraph(text) {
  const p=document.createElement("p");p.textContent=text;return p;
}
function modal(title) {
  $("dialog-title").textContent=title;
  body.replaceChildren();actions.replaceChildren();
  actions.append(button("Lukk",()=>dialog.close()));
  if(!dialog.open) dialog.showModal();
}
function confirm(title,message,verb,action) {
  modal(title);body.append(paragraph(message));
  actions.append(button(verb,()=>{dialog.close();action();},{danger:true}));
}
function textDialog(title,value,limit,action) {
  modal(title);
  const form=document.createElement("form");
  const input=document.createElement("input");
  input.type="text"; input.value=value; input.maxLength=limit; input.required=true;
  input.setAttribute("aria-label",title);
  form.append(input); body.append(form);
  function submit(event) {
    event?.preventDefault();
    const text=input.value.trim();
    if(!text) {input.focus();return;}
    dialog.close();action(text);
  }
  form.addEventListener("submit",submit);
  actions.append(button("OK",submit));
  input.focus();
}

function flush() {
  if(draining) return draining;
  if(!storage) return Promise.reject(new Error("Prosjektbiblioteket er utilgjengelig"));
  draining=(async()=>{
    while(pending.size || pendingActive) {
      const entries=[...pending], key=pendingActive;
      await storage.write({
        rows:entries.filter(([,row])=>row).map(([,row])=>row),
        remove:entries.filter(([,row])=>!row).map(([id])=>id),active:key
      });
      for(const [id,row] of entries) if(pending.get(id)===row) pending.delete(id);
      if(pendingActive===key) pendingActive=undefined;
    }
  })().finally(()=>{draining=null;});
  return draining;
}
function schedule() {
  flush().catch(()=>notice("Lagring mislyktes. Prøv Lagre igjen, eller eksporter en sikkerhetskopi."));
}
function stage(row) {
  byId.set(row.id,row);
  pending.set(row.id,row);
}
function selectProject(row) {
  cancelInput();
  active=row.id;
  pendingActive=active;
  history=new History(row.scene);
  selection=null;
  schedule();
  render();
}
function create(name,scene=blank()) {
  const row=project(name,scene);
  stage(row); selectProject(row);
}
function saveCurrent() {
  const row=byId.get(active);
  if(!row) return;
  stage({...row,scene:history.scene});
  schedule();render();
}
function commit(next) {
  if(history.commit(next)) saveCurrent();
  else frame();
}
function edit(patch) { commit({...history.scene,...patch}); }

const cancelInput=connectInput(canvas,{
  state:()=>({scene:history.scene,tool}),
  select:next=>{selection=next;renderSelection();frame();},
  preview:next=>{transient=next;frame();},
  commit
});

function choose(next) {
  cancelInput();tool=next;selection=null;render();
}
function reset(zone=history.scene.zone) {cancelInput();edit({zone,zoom:1,pan:point(0,0)});}
function addPlayer(label) {
  const {players,team,zone}=history.scene;
  const [left,right]=zones[zone];
  const index=players.length;
  const player={id:id(),label,team,at:point((left+right)/2+(index%3-1)*2.7,11.1+(Math.floor(index/3)%5)*1.95)};
  choose("select");selection={kind:"player",id:player.id};
  edit({players:[...players,player]});
}
function selectedPlayer() { return history.scene.players.find(p=>selection?.id===p.id); }
function selectedMark() { return history.scene.marks.find(m=>selection?.id===m.id); }
function updatePlayer(player,changes) { edit({players:history.scene.players.map(p=>p.id===player.id?{...p,...changes}:p)}); }
function removeSelected() {
  const selected=selection;
  selection=null;
  if(selected?.kind==="player") edit({players:history.scene.players.filter(p=>p.id!==selected.id)});
  if(selected?.kind==="mark") edit({marks:history.scene.marks.filter(m=>m.id!==selected.id)});
  if(selected?.kind==="puck") edit({puck:null});
}
function renderSelection() {
  const panelAction=$("selection-action"), detail=$("selection-detail");
  panelAction.replaceChildren();detail.replaceChildren();
  const player=selectedPlayer(), mark=selectedMark();
  if(player) {
    panelAction.append(button("Fjern spiller",removeSelected,{danger:true}));
    const label=document.createElement("strong");label.textContent=player.label+" · "+(player.team==="blue"?"Blå":"Rød");
    detail.append(label,button("Endre navn",()=>textDialog("Spillerens navn eller nummer",player.label,6,label=>updatePlayer(player,{label}))),
      button("Bytt lag",()=>updatePlayer(player,{team:player.team==="blue"?"red":"blue"})),
      button("Dupliser spiller",()=>{
        const copy={...player,id:id(),at:{...player.at,x:player.at.x+(player.at.x>56?-2:2)}};
        selection={kind:"player",id:copy.id};edit({players:[...history.scene.players,copy]});
      }));
  } else if(mark) panelAction.append(button("Fjern tegning",removeSelected,{danger:true}));
  else if(selection?.kind==="puck") panelAction.append(button("Fjern puck",removeSelected,{danger:true}));
}
function render() {
  $("title").textContent=byId.get(active)?.title??"Hockey Tactics Board";
  $("zone").value=history.scene.zone;
  for(const item of document.querySelectorAll("[data-team]")) item.setAttribute("aria-pressed",item.dataset.team===history.scene.team);
  for(const item of $("tools").children) item.setAttribute("aria-pressed",item.dataset.tool===tool);
  $("undo").disabled=!history.past.length;
  $("redo").disabled=!history.future.length;
  $("clear").disabled=!history.scene.marks.length;
  renderSelection();
  frame();
}

function library() {
  modal("Prosjektbibliotek");
  for(const row of [...byId.values()].reverse()) {
    const item=document.createElement("div");item.className="project";
    item.append(button(row.title,()=>{dialog.close();selectProject(row);}),
      button("Kopier",()=>{dialog.close();create((row.title.slice(0,57)+" (kopi)"),row.scene);}),
      button("Slett",()=>confirm("Slette prosjektet?",row.title,"Slett",()=>{
        byId.delete(row.id);pending.set(row.id,null);
        if(row.id===active) {
          const replacement=byId.values().next().value;
          if(replacement) selectProject(replacement); else create("Ny taktikk");
        } else schedule();
      }),{danger:true}));
    body.append(item);
  }
  actions.append(button("Nytt prosjekt",()=>textDialog("Prosjektnavn","",64,name=>create(name))),
    button("Endre navn",()=>textDialog("Prosjektnavn",byId.get(active).title,64,title=>{
      stage({...byId.get(active),title});saveCurrent();
    })),
    button("Importer fil",()=>{dialog.close();$("import").click();}),
    button("Sikkerhetskopi av alle",()=>backup([...byId.values()],"Hockeytavle-prosjekter")));
}
function download(data,name) {
  const href=URL.createObjectURL(data);
  const link=document.createElement("a");
  link.href=href;link.download=name;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(href),60000);
}
const safeName=name=>name.replace(/[\\/:*?"<>|\u0000-\u001f]/g,"_");
function backup(rows,name) {
  const data={format:"hockey-tactics-board",version:1,projects:rows};
  download(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),safeName(name)+".json");
}
function exportDialog() {
  modal("Eksporter taktikk");
  const label=document.createElement("label"), check=document.createElement("input");
  check.type="checkbox";check.checked=exportHeading;
  check.addEventListener("change",()=>{exportHeading=check.checked;});
  label.append(check," Ta med prosjektnavn og dato i PDF");body.append(label);
  async function exportImage(pdf) {
    dialog.close();
    const row=byId.get(active);
    try {
      const heading=pdf && exportHeading?row.title+" · "+new Date().toLocaleDateString("nb-NO"):null;
      const output=exportCanvas(row.scene,pdf,heading);
      const data=pdf?await pdfBlob(output):await imageBlob(output,"image/png");
      const name=safeName(row.title)+(pdf?".pdf":".png");
      modal(pdf?"PDF klar":"PNG klar");
      const href=URL.createObjectURL(data);
      const link=document.createElement("a");
      link.href=href;link.download=name;link.className="file-link";link.textContent="Last ned "+name;
      body.append(link);
      dialog.addEventListener("close",()=>setTimeout(()=>URL.revokeObjectURL(href),60000),{once:true});
    } catch { notice("Kunne ikke eksportere tavlen."); }
  }
  actions.append(button("Lagre PNG",()=>exportImage(false)),button("Lagre PDF",()=>exportImage(true)),
    button("Eksporter prosjektfil",()=>{const row=byId.get(active);backup([row],row.title);}));
}
function options(title,items,property) {
  modal(title);
  if(selectedMark()) body.append(paragraph("Endrer også den valgte tegningen."));
  for(const [name,value] of items) body.append(button(name,()=>{
    const selected=selectedMark();
    dialog.close();
    edit({[property]:value,marks:history.scene.marks.map(m=>m===selected?{...m,[property]:value}:m)});
  }));
}

for(const [key,label] of Object.entries(tools)) {
  const item=button(icons[key]+" "+label,()=>choose(key));item.dataset.tool=key;$("tools").append(item);
}
for(const label of ["C","LW","RW","LD","RD","G"]) $("positions").append(button(label,()=>addPlayer(label)));
for(const item of document.querySelectorAll("[data-team]")) item.addEventListener("click",()=>edit({team:item.dataset.team}));
$("zone").addEventListener("change",event=>reset(event.target.value));
$("reset").onclick=()=>reset();
$("panel-toggle").onclick=()=>{
  $("panel").hidden=!$("panel").hidden;
  $("panel-toggle").setAttribute("aria-expanded",!$("panel").hidden);
};
$("library").onclick=library;
$("save").onclick=()=>flush().then(()=>notice("Prosjektet er lagret."),()=>notice("Kunne ikke lagre prosjektet."));
$("export").onclick=exportDialog;
$("custom-player").onclick=()=>textDialog("Spillerens navn eller nummer","",6,label=>addPlayer(label));
$("puck").onclick=()=>{
  choose("select");selection={kind:"puck"};
  const [left,right]=zones[history.scene.zone];
  if(!history.scene.puck) edit({puck:point((left+right)/2,17.1)});
  else render();
};
$("ink").onclick=()=>options("Strekfarge",inkColors,"ink");
$("width").onclick=()=>options("Strektykkelse",widths,"width");
$("undo").onclick=()=>{cancelInput();history.undo();selection=null;saveCurrent();};
$("redo").onclick=()=>{cancelInput();history.redo();selection=null;saveCurrent();};
$("clear").onclick=()=>confirm("Tømme alle tegninger?","Du kan angre fra verktøylinjen.","Tøm",()=>{
  selection=null;edit({marks:[]});
});
$("import").onchange=async event=>{
  const file=event.target.files[0];
  event.target.value="";
  if(!file) return;
  let rows;
  try { rows=readBackup(JSON.parse(await file.text())); }
  catch { notice("Kunne ikke lese filen. Sjekk at den er en gyldig sikkerhetskopi."); return; }
  for(const row of rows) stage(row);
  selectProject(rows[0]);
  try {
    await flush();
    notice(rows.length===1?"Prosjektet er importert.":rows.length+" prosjekter er importert.");
  } catch { notice("Importen er åpen i denne økten. Lokal lagring mislyktes. Prøv Lagre igjen."); }
};
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden" && playing && pending.size) schedule();});

async function start() {
  const controls=[...document.querySelectorAll("#app button, #app select")].filter(item=>item.id!=="update");
  for(const item of controls) item.disabled=true;
  canvas.style.pointerEvents="none";
  try {
    storage=await openStorage();
    const saved=await storage.load();
    for(const row of saved.projects) byId.set(row.id,row);
    const first=byId.get(saved.active)||byId.values().next().value;
    if(first) selectProject(first); else create("Ny taktikk");
  } catch {
    if(!active) {
      const row=project();byId.set(row.id,row);active=row.id;
    }
    notice("Lokal lagring er utilgjengelig. Bruk prosjektfil for å ta vare på endringer.");
  }
  playing=true;
  for(const item of controls) item.disabled=false;
  canvas.style.pointerEvents="";
  render();
}
start();


setupOffline($("offline"),$("update"),flush,notice);
