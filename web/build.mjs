import {createHash} from "node:crypto";
import {mkdir,readdir,readFile,writeFile} from "node:fs/promises";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const here=dirname(fileURLToPath(import.meta.url));
const source=join(here,"src"), output=join(here,"dist");
async function files(directory,prefix="") {
  const entries=await readdir(directory,{withFileTypes:true});
  const result=[];
  for(const entry of entries) {
    const relative=prefix+entry.name;
    if(entry.isDirectory()) result.push(...await files(join(directory,entry.name),relative+"/"));
    else if(entry.isFile()) result.push(relative);
  }
  return result.sort();
}
export async function build() {
  const paths=await files(source);
  const hash=createHash("sha256");
  const contents=new Map();
  for(const path of paths) {
    const bytes=await readFile(join(source,path));
    contents.set(path,bytes);
    hash.update(path+"\0"+bytes.length+"\0").update(bytes);
  }
  const version=hash.digest("hex").slice(0,24);
  const assets=paths.filter(path=>path!=="sw.js");
  const entries=assets.map(path=>[path,"sha256-"+createHash("sha256").update(contents.get(path)).digest("base64")]);
  for(const [path,bytes] of contents) {
    const destination=join(output,path);
    await mkdir(dirname(destination),{recursive:true});
    await writeFile(destination,path==="sw.js"
      ? bytes.toString().replace("__BUILD_ID__",version).replace("__PRECACHE__",JSON.stringify(entries))
      : bytes);
  }
  return {output,version,assets};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const {version,assets}=await build();
  console.log("PWA "+version+" · "+assets.length+" offlinefiler");
}

