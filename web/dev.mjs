import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {extname,join} from "node:path";
import {build} from "./build.mjs";

const {output,assets}=await build();
const base="/hockey-demo/";
const known=new Set([...assets,"sw.js"]);
const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",
  ".webmanifest":"application/manifest+json; charset=utf-8",".png":"image/png"};
const server=createServer(async (request,response)=>{
  const path=new URL(request.url,"http://localhost").pathname;
  if(path==="/") { response.writeHead(302,{Location:base}).end();return; }
  const file=path.slice(base.length)||"index.html";
  if(!path.startsWith(base)||!known.has(file)) { response.writeHead(404).end();return; }
  try {
    const content=await readFile(join(output,file));
    response.writeHead(200,{"Content-Type":types[extname(file)],"Cache-Control":"no-cache"}).end(content);
  } catch { response.writeHead(404).end(); }
});
server.listen(Number(process.env.PORT||4173),"127.0.0.1",()=>{
  console.log("Local URL: http://127.0.0.1:"+server.address().port+base);
});

