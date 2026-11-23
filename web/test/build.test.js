import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {test} from "node:test";
import {build} from "../build.mjs";

test("Pages build contains every essential file with a matching offline integrity hash",async()=>{
  const {output,version,assets}=await build();
  const worker=await readFile(join(output,"sw.js"),"utf8");
  const manifest=JSON.parse(await readFile(join(output,"manifest.webmanifest"),"utf8"));
  const base=new URL("https://example.github.io/team-hockey/");
  assert.match(worker,new RegExp(version));
  assert.equal(new URL(manifest.start_url,base).href,base.href);
  assert.equal(new URL(manifest.scope,base).href,base.href);
  assert.equal(manifest.display,"standalone");
  for(const file of ["index.html","manifest.webmanifest","style.css","app.js","pwa.js","storage.js",
    "model.js","rink.js","input.js","icons/apple-touch-icon.png",...manifest.icons.map(icon=>icon.src.slice(2))]) {
    assert.ok(assets.includes(file),file);
    const bytes=await readFile(join(output,file));
    const integrity="sha256-"+createHash("sha256").update(bytes).digest("base64");
    assert.ok(worker.includes(JSON.stringify([file,integrity])),file);
  }
});

