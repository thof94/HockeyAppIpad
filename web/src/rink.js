import {view,zones,rgb,point} from "./model.js";

export function draw(ctx,width,height,scene,selection) {
  const t=view(width,height,scene);
  const red="#c84051", blue="#2869af", ice="#f5faff";
  function line(x,y,x2,y2,color,w) {
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x2,y2);
    ctx.strokeStyle=color; ctx.lineWidth=w; ctx.stroke();
  }
  function circle(x,y,r,color,lineWidth=0) {
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
    if (lineWidth) { ctx.strokeStyle=color; ctx.lineWidth=lineWidth; ctx.stroke(); }
    else { ctx.fillStyle=color; ctx.fill(); }
  }
  function rounded(x,y,w,h,r) {
    ctx.beginPath(); ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }

  ctx.save();
  ctx.translate(t.x,t.y); ctx.scale(t.scale,t.scale);
  const [left,right]=zones[scene.zone];
  const start=left===0 ? -.5 : left, end=right===60 ? 60.5 : right;
  ctx.beginPath(); ctx.rect(start,-.5,end-start,31); ctx.clip();
  ctx.save();
  rounded(0,0,60,30,8);
  ctx.clip();
  ctx.fillStyle=ice; ctx.fillRect(0,0,60,30);
  ctx.lineCap="round"; ctx.lineJoin="round";
  for (const x of [4,56]) {
    line(x,0,x,30,red,.055);
    ctx.save(); ctx.translate(x,15); if (x>30) ctx.scale(-1,1);
    line(-4,-4.3,0,-3.4,red,.05); line(-4,4.3,0,3.4,red,.05);
    ctx.beginPath(); ctx.moveTo(0,-1.22); ctx.lineTo(1.1,-1.22);
    ctx.bezierCurveTo(2.07,-.77,2.07,.77,1.1,1.22); ctx.lineTo(0,1.22); ctx.closePath();
    ctx.fillStyle="#b9dff6"; ctx.fill(); ctx.strokeStyle=red; ctx.lineWidth=.055; ctx.stroke();
    rounded(-1.12,-.915,1.15,1.83,.28);
    ctx.fillStyle="#e1eaf0"; ctx.fill(); ctx.lineWidth=.1; ctx.stroke();
    ctx.restore();
  }
  for (const x of [22.5,37.5]) line(x,0,x,30,blue,.3);
  line(30,0,30,14.75,red,.3); line(30,15.25,30,30,red,.3);
  circle(30,30,3,red,.05); circle(30,15,4.5,blue,.07); circle(30,15,.15,blue);
  for (const x of [10,24,36,50]) for (const y of [8,22]) {
    circle(x,y,.3,"white");
    ctx.save(); ctx.beginPath(); ctx.rect(x-.3,y-.175,.6,.35); ctx.clip(); circle(x,y,.3,red); ctx.restore();
    if (x===10 || x===50) {
      circle(x,y,4.5,red,.065);
      for (const side of [-1,1]) {
        line(x+side*.65,y-.45,x+side*1.4,y-.45,red,.07);
        line(x+side*.65,y+.45,x+side*1.4,y+.45,red,.07);
        line(x+side*.6,y-4.45,x+side*.6,y-5.1,red,.07);
        line(x+side*.6,y+4.45,x+side*.6,y+5.1,red,.07);
      }
    }
  }

  for (const mark of scene.marks) {
    const first=mark.points[0], last=mark.points.at(-1);
    if (selection?.id===mark.id) {
      circle(first.x,first.y,.49,"#ffbf49"); circle(last.x,last.y,.49,"#ffbf49");
    }
    if (mark.tool==="pen") {
      const thickness=p=>mark.width*(.45+.75*p.p);
      circle(first.x,first.y,thickness(first)/2,mark.ink);
      let previous=first, mid=first;
      for (const next of mark.points.slice(1)) {
        const center=point((previous.x+next.x)/2,(previous.y+next.y)/2);
        ctx.beginPath(); ctx.moveTo(mid.x,mid.y); ctx.quadraticCurveTo(previous.x,previous.y,center.x,center.y);
        ctx.strokeStyle=mark.ink; ctx.lineWidth=thickness(previous); ctx.stroke();
        mid=center; previous=next;
      }
      line(mid.x,mid.y,last.x,last.y,mark.ink,thickness(last));
      continue;
    }
    const width=mark.width*(mark.tool==="shot"?1.65:1);
    if(mark.tool==="pass") ctx.setLineDash([.65,.48]);
    line(first.x,first.y,last.x,last.y,mark.ink,width);
    ctx.setLineDash([]);
    if(["arrow","pass","shot"].includes(mark.tool)) {
      const angle=Math.atan2(last.y-first.y,last.x-first.x);
      const len=Math.min(Math.hypot(last.x-first.x,last.y-first.y)*.65,mark.tool==="shot"?1.85:1.3);
      for (const a of [angle-.48,angle+.48]) line(last.x,last.y,last.x-Math.cos(a)*len,last.y-Math.sin(a)*len,mark.ink,width);
    }
  }
  ctx.textAlign="center"; ctx.textBaseline="middle";
  for (const player of scene.players) {
    const {x,y}=player.at;
    if (selection?.id===player.id) circle(x,y,1.38,"#ffbf49");
    circle(x,y,1.13,"white"); circle(x,y,1.01,rgb[player.team]);
    ctx.font="bold "+(player.label.length>3?".57":".80")+"px system-ui";
    ctx.fillStyle="white"; ctx.fillText(player.label,x,y,1.85);
  }
  if(scene.puck) {
    const {x,y}=scene.puck;
    if (selection?.kind==="puck") circle(x,y,.8,"#ffbf49");
    circle(x,y,.5,"white"); circle(x,y,.40,"#15273b");
  }
  ctx.restore();
  rounded(0,0,60,30,8);
  ctx.strokeStyle="#466176"; ctx.lineWidth=.16; ctx.stroke();
  ctx.restore();
}

export function exportCanvas(scene,pdf,heading) {
  const canvas=document.createElement("canvas");
  canvas.width=pdf?2526:3200;
  canvas.height=pdf?1785:1660;
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="white"; ctx.fillRect(0,0,canvas.width,canvas.height);
  const margin=pdf?78:32;
  let top=margin;
  if (pdf && heading) {
    ctx.fillStyle="#15273b"; ctx.font="bold 57px system-ui"; ctx.textBaseline="top";
    ctx.fillText(heading,margin,margin,canvas.width-2*margin);
    top+=103;
  }
  ctx.translate(margin,top);
  draw(ctx,canvas.width-2*margin,canvas.height-top-margin,{...scene,zone:"full",zoom:1,pan:point(0,0)});
  return canvas;
}

export function imageBlob(canvas,type,quality) {
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Kunne ikke lage bildet")),type,quality));
}

export async function pdfBlob(canvas) {
  const jpeg=await imageBlob(canvas,"image/jpeg",.96);
  const encoder=new TextEncoder();
  const chunks=[], offsets=[0];
  let position=0;
  function append(value) {
    const bytes=typeof value==="string"?encoder.encode(value):value;
    position+=bytes.size??bytes.byteLength;
    chunks.push(bytes);
  }
  function object(n,value) { offsets[n]=position; append(n+" 0 obj\n"); append(value); append("\nendobj\n"); }
  append("%PDF-1.4\n");
  object(1,"<</Type /Catalog /Pages 2 0 R>>");
  object(2,"<</Type /Pages /Kids [3 0 R] /Count 1>>");
  object(3,"<</Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources <</XObject <</Im 4 0 R>>>> /Contents 5 0 R>>");
  offsets[4]=position;
  append("4 0 obj\n<</Type /XObject /Subtype /Image /Width "+canvas.width+" /Height "+canvas.height+
    " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+jpeg.size+">>\nstream\n");
  append(jpeg); append("\nendstream\nendobj\n");
  const content="q 842 0 0 595 0 0 cm /Im Do Q\n";
  object(5,"<</Length "+content.length+">>\nstream\n"+content+"endstream");
  const xref=position;
  append("xref\n0 6\n0000000000 65535 f \n");
  for (const offset of offsets.slice(1)) append(String(offset).padStart(10,"0")+" 00000 n \n");
  append("trailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n"+xref+"\n%%EOF\n");
  return new Blob(chunks,{type:"application/pdf"});
}

