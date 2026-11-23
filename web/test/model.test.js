import {test} from "node:test";
import assert from "node:assert/strict";
import {blank,erase,History,point,project,readBackup,view,zones} from "../src/model.js";

test("coordinate round trip for zoom, pan and every zone",()=>{
  for(const zone of Object.keys(zones)) {
    const viewport=view(1024,650,{...blank(),zone,zoom:2.5,pan:point(.2,-.15)});
    const original=point(21.7,13.2,.3);
    const restored=viewport.rink(viewport.screen(original));
    assert.ok(Math.abs(restored.x-original.x)<1e-10 && Math.abs(restored.y-original.y)<1e-10);
    assert.equal(restored.p,.3);
  }
});

test("fast eraser swipe splits a pen stroke, preserving endpoints and pressure",()=>{
  const mark={id:"one",tool:"pen",ink:"#123456",width:.21,points:[point(6,15,.2),point(54,15,.9)]};
  const before={...blank(),marks:[mark]};
  const after=erase(before,point(30,10),point(30,20));
  assert.equal(after.marks.length,2);
  assert.deepEqual(after.marks[0].points[0],mark.points[0]);
  assert.deepEqual(after.marks[1].points.at(-1),mark.points[1]);
  assert.ok(after.marks[0].points.at(-1).x<30 && after.marks[1].points[0].x>30);
  assert.ok(after.marks[0].points.at(-1).p>.2);
  const history=new History(before);
  history.commit(after);history.undo();
  assert.equal(history.scene,before);
  history.redo();assert.equal(history.scene,after);
});

test("other tools erase the entire targeted annotation",()=>{
  for(const tool of ["line","arrow","pass","shot"]) {
    const mark={id:tool,tool,ink:"#123456",width:.21,points:[point(6,15),point(54,15)]};
    const scene={...blank(),marks:[mark]};
    assert.equal(erase(scene,point(30,6),point(30,6)),scene);
    assert.deepEqual(erase(scene,point(30,15),point(30,15)).marks,[]);
  }
});

test("backup imports with fresh IDs and rejects malformed data",()=>{
  const scene={...blank(),players:[{id:"original",label:"Å5",team:"red",at:point(22,4)}],puck:point(1,2)};
  const original=project("Spill",scene);
  const backup={format:"hockey-tactics-board",version:1,projects:[original]};
  const [imported]=readBackup(JSON.parse(JSON.stringify(backup)));
  assert.notEqual(imported.id,original.id);
  assert.notEqual(imported.scene.players[0].id,"original");
  assert.equal(imported.scene.players[0].label,"Å5");
  assert.deepEqual(imported.scene.puck,scene.puck);
  assert.throws(()=>readBackup({...backup,version:2}));
  assert.throws(()=>readBackup({...backup,projects:[{...original,scene:{...scene,zone:"__proto__"}}]}));
});

