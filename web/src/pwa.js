export async function setupOffline(status,update,flush,notice) {
  if(!("serviceWorker" in navigator)) {
    status.textContent="Frakoblet bruk krever Safari over HTTPS.";
    return;
  }
  let initialController=navigator.serviceWorker.controller, registration;
  let checking=0;
  async function check() {
    const sequence=++checking;
    const worker=navigator.serviceWorker.controller;
    let ready=false;
    if(worker) {
      ready=await new Promise(resolve=>{
        const channel=new MessageChannel();
        const timer=setTimeout(()=>{channel.port1.close();resolve(false);},4000);
        channel.port1.onmessage=event=>{
          clearTimeout(timer);channel.port1.close();resolve(event.data.ready===true);
        };
        worker.postMessage(navigator.onLine?"repair":"check",[channel.port2]);
      });
    }
    if(sequence!==checking) return;
    status.dataset.ready=String(ready);
    status.textContent=ready ? (navigator.onLine?"Klar for frakoblet bruk":"Frakoblet · klar") :
      (worker?"Frakoblet kopi mangler filer":"Klargjør frakoblet bruk …");
    if(ready && (matchMedia("(display-mode: standalone)").matches || navigator.standalone)) {
      try { await navigator.storage?.persist?.(); } catch { /* Backups remain available. */ }
    }
  }
  function showUpdate() { update.hidden=!registration?.waiting || !navigator.serviceWorker.controller; }
  navigator.serviceWorker.addEventListener("controllerchange",async()=>{
    const previous=initialController;
    initialController=navigator.serviceWorker.controller;
    if(previous && previous!==initialController) {
      try { await flush(); location.reload(); }
      catch { notice("Oppdatering er klar. Eksporter en sikkerhetskopi før du laster inn på nytt."); }
    } else check();
  });
  window.addEventListener("online",()=>{check();registration?.update().catch(()=>{});});
  window.addEventListener("offline",check);
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible") {check();showUpdate();if(navigator.onLine) registration?.update().catch(()=>{});}
  });
  update.onclick=async()=>{
    try {
      await flush();
      registration.waiting?.postMessage("activate");
    } catch { notice("Oppdateringen venter til prosjektet er lagret."); }
  };
  try {
    registration=await navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"});
    function watch(worker) {
      worker?.addEventListener("statechange",()=>{
        if(worker.state==="installed") showUpdate();
        if(worker.state==="redundant"&&!navigator.serviceWorker.controller) {
          status.textContent="Frakoblet kopi kunne ikke lastes ned. Last inn på nytt med nett.";
        }
      });
    }
    watch(registration.installing);
    registration.addEventListener("updatefound",()=>watch(registration.installing));
    showUpdate();check();
  } catch {
    status.textContent="Frakoblet kopi kunne ikke lastes ned. Last inn på nytt med nett.";
  }
}

