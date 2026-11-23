import {bounded,clamp,distance,erase,hit,id,point,view,zones} from "./model.js";

export function connectInput(canvas,{state,select,preview,commit}) {
  const pointers=new Map();
  let gesture=null;
  const dimensions=()=>[canvas.clientWidth,canvas.clientHeight];
  const transform=scene=>view(...dimensions(),scene);
  function position(event) {
    const bounds=canvas.getBoundingClientRect();
    return point(event.clientX-bounds.left,event.clientY-bounds.top,
      event.pointerType==="pen" && event.pressure ? clamp(event.pressure,0,1.5) : 1);
  }
  function target(scene,at) {
    if(scene.puck && distance(scene.puck,at)<=.95) return {kind:"puck"};
    const player=[...scene.players].reverse().find(p=>distance(p.at,at)<=1.4);
    if(player) return {kind:"player",id:player.id};
    const mark=[...scene.marks].reverse().find(m=>hit(m,at,.46));
    return mark ? {kind:"mark",id:mark.id} : null;
  }
  function begin(event,p) {
    const {scene,tool}=state(), at=transform(scene).rink(p);
    const eraser=event.pointerType==="pen" && (event.button===5 || (event.buttons&32)!==0);
    gesture={scene,next:scene,tool:eraser?"erase":tool,at,type:event.pointerType,last:null};
    if (gesture.tool==="select") {
      gesture.selected=target(scene,at);
      if(gesture.selected?.kind==="mark") {
        const mark=scene.marks.find(m=>m.id===gesture.selected.id);
        gesture.bounds=mark.points.reduce(([left,right,top,bottom],p)=>
          [Math.min(left,p.x),Math.max(right,p.x),Math.min(top,p.y),Math.max(bottom,p.y)],[60,0,30,0]);
      }
      select(gesture.selected);
    } else {
      select(null);
      if(gesture.tool==="erase") apply(p);
      else {
        const [left,right]=zones[scene.zone];
        if (at.x>=left && at.x<=right && at.y>=0 && at.y<=30) {
          gesture.draft={id:id(),tool:gesture.tool,ink:scene.ink,width:scene.width,points:[at]};
        }
      }
    }
  }
  function pinchMeasure() {
    const [a,b]=pointers.values();
    return a && b ? {center:point((a.x+b.x)/2,(a.y+b.y)/2),span:distance(a,b)} : null;
  }
  function pinch() {
    const step=pinchMeasure(), old=gesture.pinch;
    gesture.pinch=step;
    if(!step || !old) return;
    const next={...gesture.next,pan:{...gesture.next.pan}};
    const anchor=transform(next).rink(old.center);
    next.zoom=clamp(next.zoom*(old.span?step.span/old.span:1),1,7);
    const remapped=transform(next).screen(anchor);
    const [w,h]=dimensions();
    if(!w || !h) return;
    next.pan.x=clamp(next.pan.x+(step.center.x-remapped.x)/w,-1,1);
    next.pan.y=clamp(next.pan.y+(step.center.y-remapped.y)/h,-1,1);
    gesture.next=next;
  }
  function apply(screen) {
    const g=gesture, at=transform(g.scene).rink(screen);
    if(g.tool==="erase") {
      if(!g.last || distance(g.last,at)>0) {
        g.next=erase(g.next,g.last??at,at);
        g.last=at;
      }
    } else if(g.tool==="select" && g.selected) {
      let dx=at.x-g.at.x, dy=at.y-g.at.y;
      if(dx===0 && dy===0) { g.next=g.scene; return; }
      const {kind,id}=g.selected;
      const move=p=>bounded(point(p.x+dx,p.y+dy,p.p));
      if(kind==="player") g.next={...g.scene,players:g.scene.players.map(p=>p.id===id?{...p,at:move(p.at)}:p)};
      if(kind==="puck") g.next={...g.scene,puck:move(g.scene.puck)};
      if(kind==="mark") {
        const [left,right,top,bottom]=g.bounds;
        dx=clamp(dx,-left,60-right); dy=clamp(dy,-top,30-bottom);
        g.next={...g.scene,marks:g.scene.marks.map(m=>m.id===id?{...m,points:m.points.map(move)}:m)};
      }
    } else if(g.draft) {
      const end=bounded(at), {points}=g.draft;
      if(g.tool==="pen") {
        if(distance(points.at(-1),end)>.015) points.push(end);
      } else points.splice(1,points.length-1,end);
    }
  }
  function paint() {
    const g=gesture;
    preview(g ? (g.draft ? {...g.next,marks:[...g.next.marks,g.draft]} : g.next) : null);
  }
  function cancel() { gesture=null; pointers.clear(); paint(); }
  canvas.addEventListener("pointerdown",event=>{
    if (gesture?.type==="pen" || (event.pointerType==="mouse" && event.button!==0)) return;
    if (event.pointerType==="pen" && pointers.size) cancel();
    canvas.setPointerCapture(event.pointerId);
    const p=position(event);
    pointers.set(event.pointerId,p);
    if(pointers.size===1) begin(event,p);
    else if(!gesture.navigating) {
      const original=gesture.scene;
      gesture={scene:original,next:original,navigating:true,pinch:pinchMeasure()};
      select(null);
    } else gesture.pinch=pinchMeasure();
    paint();
  });
  canvas.addEventListener("pointermove",event=>{
    if(!gesture || !pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId,position(event));
    if(gesture.navigating) pinch();
    else {
      const samples=event.getCoalescedEvents?.();
      for(const sample of samples?.length?samples:[event]) apply(position(sample));
    }
    paint();
  });
  canvas.addEventListener("pointerup",event=>{
    if(!gesture || !pointers.has(event.pointerId)) return;
    if(!gesture.navigating) apply(position(event));
    pointers.delete(event.pointerId);
    if(pointers.size) { gesture.pinch=pinchMeasure(); return; }
    const {next,draft}=gesture;
    gesture=null;
    preview(null);
    commit(draft ? {...next,marks:[...next.marks,draft]} : next);
  });
  for(const type of ["pointercancel","lostpointercapture"]) {
    canvas.addEventListener(type,event=>{ if(pointers.has(event.pointerId)) cancel(); });
  }
  return cancel;
}

