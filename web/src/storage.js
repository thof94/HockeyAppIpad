export async function openStorage(scope = new URL("./",location.href).pathname) {
  const db = await new Promise((resolve,reject)=>{
    const request=indexedDB.open("hockey-tactics:"+scope,1);
    request.onupgradeneeded=()=>{
      request.result.createObjectStore("projects",{keyPath:"id"});
      request.result.createObjectStore("settings");
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error("Prosjektbiblioteket er åpent i et annet vindu"));
  });
  db.onversionchange=()=>db.close();
  function transaction(mode,operation) {
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(["projects","settings"],mode);
      tx.oncomplete=()=>resolve(result());
      tx.onabort=()=>reject(tx.error || new Error("Lagringen ble avbrutt"));
      let result;
      try { result=operation(tx.objectStore("projects"),tx.objectStore("settings")); }
      catch (error) { tx.abort(); reject(error); }
    });
  }
  return {
    load:()=>transaction("readonly",(projects,settings)=>{
      const all=projects.getAll(), active=settings.get("active");
      return ()=>({projects:all.result,active:active.result});
    }),
    write:({rows=[],remove=[],active})=>transaction("readwrite",(projects,settings)=>{
      for(const row of rows) projects.put(row);
      for(const id of remove) projects.delete(id);
      if(active) settings.put(active,"active");
      return ()=>undefined;
    })
  };
}

