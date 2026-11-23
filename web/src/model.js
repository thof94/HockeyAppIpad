export const zones = {full:[0,60], left:[0,22.5], right:[37.5,60], half:[0,30]};
export const tools = {select:"Flytt", pen:"Penn", line:"Linje", arrow:"Pil", pass:"Pasning", shot:"Skudd", erase:"Viskelær"};
export const rgb = {blue:"#175caa", red:"#ba253d"};
export const id = () => crypto.randomUUID();
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(n, hi));
export const point = (x, y, p = 1) => ({x,y,p});
export const bounded = ({x,y,p}) => point(clamp(x,0,60),clamp(y,0,30),p);
export const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
export const blank = () => ({
  players:[], puck:null, marks:[], zone:"full", zoom:1, pan:point(0,0), team:"blue", ink:"#193d53", width:.21
});
export const project = (title = "Ny taktikk", scene = blank()) => ({id:id(), title, scene});

export function view(width,height,scene,margin=11) {
  const [left,right] = zones[scene.zone];
  const scale = Math.min(Math.max(1,width-2*margin)/(right-left),Math.max(1,height-2*margin)/30)*scene.zoom;
  const x = width/2-(left+right)*scale/2+scene.pan.x*width;
  const y = height/2-15*scale+scene.pan.y*height;
  return {scale,x,y,
    screen:p=>point(x+p.x*scale,y+p.y*scale,p.p),
    rink:p=>point((p.x-x)/scale,(p.y-y)/scale,p.p)
  };
}

const mix = (a,b,t) => point(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.p+(b.p-a.p)*t);
export function hit(mark,at,radius) {
  const {points} = mark;
  const path = mark.tool === "pen" ? points : [points[0],points.at(-1)];
  if (path.length === 1) return distance(path[0],at) <= radius+mark.width/2;
  for (let i=1;i<path.length;i++) {
    const a=path[i-1], b=path[i], x=b.x-a.x, y=b.y-a.y, square=x*x+y*y;
    const t=square ? clamp(((at.x-a.x)*x+(at.y-a.y)*y)/square,0,1) : 0;
    if (distance(mix(a,b,t),at) <= radius+mark.width/2) return true;
  }
  return false;
}

function capsule(from,to,radius) {
  const span = distance(from,to);
  const ux = span ? (to.x-from.x)/span : 1, uy = span ? (to.y-from.y)/span : 0;
  function slab(value,change,min,max) {
    if (!change) return value>=min && value<=max ? [0,1] : null;
    const a=(min-value)/change,b=(max-value)/change;
    return [Math.min(a,b),Math.max(a,b)];
  }
  return (a,b) => {
    const x=(a.x-from.x)*ux+(a.y-from.y)*uy, y=-(a.x-from.x)*uy+(a.y-from.y)*ux;
    const dx=(b.x-a.x)*ux+(b.y-a.y)*uy, dy=-(b.x-a.x)*uy+(b.y-a.y)*ux;
    let low=1,high=0;
    function add(start,end) {
      start=Math.max(0,start); end=Math.min(1,end);
      if (end-start>1e-5) { low=Math.min(low,start); high=Math.max(high,end); }
    }
    function circle(center) {
      const rx=x-center, speed=dx*dx+dy*dy, extra=rx*rx+y*y-radius*radius;
      if (!speed) { if (extra<0) add(0,1); return; }
      const projection=rx*dx+y*dy, discriminant=projection*projection-speed*extra;
      if (discriminant>0) {
        const root=Math.sqrt(discriminant);
        add((-projection-root)/speed,(-projection+root)/speed);
      }
    }
    circle(0);
    if (span) {
      circle(span);
      const u=slab(x,dx,0,span), v=slab(y,dy,-radius,radius);
      if (u && v) add(Math.max(u[0],v[0]),Math.min(u[1],v[1]));
    }
    return low<high ? [low,high] : null;
  };
}

function cut(mark,from,to) {
  const points=mark.points;
  const covered=capsule(from,to,.62+mark.width*.7875);
  if (points.length===1) return covered(points[0],points[0]) ? [] : [mark];
  const pieces=[];
  let part=[points[0]], changed=false;
  function flush() {
    if (part.length>1) pieces.push({...mark,id:pieces.length?id():mark.id,points:part});
    part=[];
  }
  for (let i=1;i<points.length;i++) {
    const a=points[i-1], b=points[i], span=covered(a,b);
    if (!span) {
      if (!part.length) part.push(a);
      part.push(b);
      continue;
    }
    changed=true;
    if (span[0]>0) {
      if (!part.length) part.push(a);
      part.push(mix(a,b,span[0]));
    }
    flush();
    if (span[1]<1) part=[mix(a,b,span[1]),b];
  }
  flush();
  return changed ? pieces : [mark];
}

export function erase(scene,from,to) {
  const target=[...scene.marks].reverse().find(mark=>hit(mark,to,.62));
  const marks=scene.marks.flatMap(mark=>{
    if (mark.tool==="pen") return cut(mark,from,to);
    return mark===target ? [] : [mark];
  });
  return marks.length===scene.marks.length && marks.every((mark,i)=>mark===scene.marks[i]) ? scene : {...scene,marks};
}

export class History {
  past=[]; future=[];
  constructor(scene) { this.scene=scene; }
  commit(scene) {
    if (scene===this.scene || JSON.stringify(scene)===JSON.stringify(this.scene)) return false;
    this.past.push(this.scene);
    if (this.past.length>80) this.past.shift();
    this.scene=scene;
    this.future=[];
    return true;
  }
  undo() { if (this.past.length) { this.future.push(this.scene); this.scene=this.past.pop(); } }
  redo() { if (this.future.length) { this.past.push(this.scene); this.scene=this.future.pop(); } }
}

export function readBackup(data) {
  function require(condition) { if (!condition) throw new Error("Ugyldig prosjektfil"); }
  function number(value,min,max) { require(Number.isFinite(value) && value>=min && value<=max); return value; }
  function label(value,length) { require(typeof value==="string" && value.trim() && value.length<=length); return value; }
  function color(value) { require(typeof value==="string" && /^#[a-f\d]{6}$/i.test(value)); return value; }
  function oneOf(value, choices) { require(choices.includes(value)); return value; }
  function coords(value,x1=0,x2=60,y1=0,y2=30) {
    require(value && typeof value==="object");
    return point(number(value.x,x1,x2),number(value.y,y1,y2),number(value.p??1,0,1.5));
  }
  require(data?.format==="hockey-tactics-board" && data.version===1);
  require(Array.isArray(data.projects) && data.projects.length>0);
  return data.projects.map(entry=>{
    require(entry?.scene && Array.isArray(entry.scene.players) && Array.isArray(entry.scene.marks));
    const s=entry.scene;
    const team=value=>oneOf(value,["blue","red"]);
    return project(label(entry.title,64),{
      players:s.players.map(player=>({id:id(),label:label(player?.label,6),team:team(player.team),at:coords(player.at)})),
      puck:s.puck===null ? null : coords(s.puck),
      marks:s.marks.map(mark=>{
        require(Array.isArray(mark?.points) && mark.points.length>0);
        return {id:id(),tool:oneOf(mark.tool,["pen","line","arrow","pass","shot"]),
          ink:color(mark.ink),width:number(mark.width,.05,2),points:mark.points.map(p=>coords(p))};
      }),
      zone:oneOf(s.zone,Object.keys(zones)), zoom:number(s.zoom,1,7), pan:coords(s.pan,-1,1,-1,1),
      team:team(s.team), ink:color(s.ink), width:number(s.width,.05,2)
    });
  });
}

