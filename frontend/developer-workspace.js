/* CodeQuest developer tools: consent-based screen scan and project heuristics.
 * Screen capture starts only after a click and the browser's native source picker.
 * No screen frames are uploaded; uploaded source is never executed or written back.
 */
(() => {
"use strict";
if (window.__cqDeveloperWorkspaceLoaded) return;
window.__cqDeveloperWorkspaceLoaded = true;
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const status = (id, msg, kind) => { const e=$(id); if(e){e.textContent=msg;e.className="repo-status"+(kind?" "+kind:"");} };
const findingsFor = text => {
 const checks = [
  ["Possible missing name","The program uses a name it cannot find. It may be misspelled, out of scope, or not imported.","Check the spelling and where the name is created. Import it if it belongs to another file.","// Make sure calculateTotal is defined or imported before use.",/ReferenceError:\s*\w+\s+is not defined|NameError:.*is not defined|is not defined/i],
  ["Possible null / undefined value","The code tries to use a value before confirming it exists.","Check the value before accessing its properties and decide what should happen when it is missing.","if (user && user.profile) {\n  // Safely use user.profile here\n}",/Cannot read propert(?:y|ies) of (?:null|undefined)|Cannot read properties of (?:null|undefined)|undefined is not an object|NoneType.*(?:attribute|subscript)/i],
  ["Possible syntax or bracket error","The parser could not understand part of the code. A missing bracket, quote, colon, or inconsistent indentation may be the cause.","Start at the line named in the error and match each bracket and quote. In Python, also check colons and indentation.","// Match every opening bracket/quote with its closing pair.\n// Python blocks need a colon and consistent indentation.",/SyntaxError:|Unexpected token|Unexpected end of input|unterminated string|IndentationError:|TabError:/i],
  ["Possible asynchronous timing issue","An operation may finish later than the code expects, or a failure may not be handled.","Use async/await in an async function and handle failures with try/catch.","async function loadData() {\n  try {\n    return await fetchData();\n  } catch (error) {\n    console.error('Could not load data:', error);\n    throw error;\n  }\n}",/UnhandledPromiseRejection|coroutine was never awaited|await is only valid/i],
  ["Possible API request failure","The browser or server rejected a request, could not reach the API, or returned an error.","Check the URL, backend status, permissions, CORS settings, and server logs. Never put private API keys in browser code.","const response = await fetch(apiUrl);\nif (!response.ok) throw new Error('HTTP ' + response.status);\nconst data = await response.json();",/Failed to fetch|NetworkError when attempting to fetch|CORS policy|HTTP\s*(?:401|403|404|429|500|502|503)/i],
  ["Possible credential in visible text","The visible text may contain a credential; the match could be a false positive.","Do not share credentials. If a real key was exposed, revoke it and create a replacement. Keep secrets on a server.","// Read private values from server-side environment variables.\n// Never ship private keys or service-role keys to a browser.",/sk-[A-Za-z0-9_-]{12,}|service_role|private[_ -]?key|client_secret|api[_ -]?key\s*[:=]/i]
 ];
 const out=[]; checks.forEach(c=>{if(c[4].test(text))out.push({title:c[0],reason:c[1],fix:c[2],patch:c[3]});});
 if(!out.length && /function\s+\w+|def\s+\w+|=>|Traceback|Error:|Exception:/.test(text)) out.push({title:"Code detected — no confident bug pattern found",reason:"This quick scan only checks for a small set of common error clues; it cannot prove code is correct.",fix:"Copy the exact error and relevant function into the review box, with the expected and actual behavior.",patch:"// Add a small test for expected behavior and one edge case."});
 return out;
};
function showFindings(target,text) {
 const e=$(target); if(!e)return;
 if(!String(text||"").trim()){e.innerHTML='<p class="muted">No readable code or error text detected. Zoom in, show the error panel, or paste code.</p>';return;}
 const found=findingsFor(text);
 if(!found.length){e.innerHTML='<p class="muted">No obvious pattern found. That is not proof the code is bug-free.</p>';return;}
 e.innerHTML=found.map(f=>'<article class="panel" style="padding:15px;margin:10px 0"><span class="tag orange">Possible issue</span><h3>'+esc(f.title)+'</h3><p style="font-size:12px"><b>What it means:</b> '+esc(f.reason)+'</p><p style="font-size:12px"><b>Try this:</b> '+esc(f.fix)+'</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere;background:#0a1020;padding:12px;border-radius:9px;color:#b7f2df;font-size:12px">'+esc(f.patch)+'</pre><button class="soft-btn gl-copy" data-copy="'+esc(f.patch)+'">Copy example fix</button></article>').join("");
}
let stream=null,timer=null,busy=false,ocrPromise=null;
const video=$("gl-video");
async function loadOCR(){
 if(window.Tesseract)return window.Tesseract;
 if(!ocrPromise)ocrPromise=new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";s.async=true;s.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(Error("OCR did not initialize."));s.onerror=()=>reject(Error("Could not load OCR. Check your connection or paste code instead."));document.head.appendChild(s);});
 return ocrPromise;
}
function stopCapture(message){
 if(timer)clearInterval(timer);timer=null;
 if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;
 if(video){video.srcObject=null;video.style.display="none";}
 if($("gl-start"))$("gl-start").disabled=false;
 if($("gl-stop"))$("gl-stop").disabled=true;
 if($("gl-scan-now"))$("gl-scan-now").disabled=true;
 if($("gl-status"))$("gl-status").textContent="Not sharing";
 status("gl-live-note",message||"Screen scan stopped. Nothing is being captured.");
}
async function scanFrame(){
 if(!stream||!video||busy||video.readyState<2||!video.videoWidth)return;
 busy=true;
 try{
  status("gl-live-note","Reading visible text locally…");
  const canvas=document.createElement("canvas"),scale=Math.min(1,1400/video.videoWidth);
  canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
  canvas.getContext("2d",{willReadFrequently:true}).drawImage(video,0,0,canvas.width,canvas.height);
  const T=await loadOCR(),result=await T.recognize(canvas,"eng"),text=result&&result.data?result.data.text:"";
  showFindings("gl-results",text);
  status("gl-live-note","Last local scan: "+new Date().toLocaleTimeString()+". OCR can misread text; check fixes before using them.","good");
 }catch(e){status("gl-live-note",e.message||"Could not scan this frame.","error");}
 finally{busy=false;}
}
async function startCapture(){
 if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia){status("gl-live-note","Screen sharing is not supported. Use a recent desktop browser over HTTPS, or paste code below.","error");return;}
 try{
  stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:5},audio:false});
  video.srcObject=stream;video.style.display="block";await video.play();
  $("gl-start").disabled=true;$("gl-stop").disabled=false;$("gl-scan-now").disabled=false;
  $("gl-status").textContent="Sharing · local scan";
  status("gl-live-note","Screen sharing is active. Local OCR runs about every 12 seconds, even when you switch to another tab or app, as long as the browser keeps this page alive.","good");
  stream.getVideoTracks()[0].addEventListener("ended",()=>stopCapture("Browser screen sharing ended."));
  await scanFrame();timer=setInterval(scanFrame,12000);
 }catch(e){stream=null;status("gl-live-note",e.name==="NotAllowedError"||e.name==="AbortError"?"Sharing was cancelled or permission denied. Nothing is captured.":(e.message||"Could not start sharing."),"error");}
}
if($("gl-start"))$("gl-start").addEventListener("click",startCapture);
if($("gl-stop"))$("gl-stop").addEventListener("click",()=>stopCapture());
if($("gl-scan-now"))$("gl-scan-now").addEventListener("click",scanFrame);
if($("gl-paste-scan"))$("gl-paste-scan").addEventListener("click",()=>showFindings("gl-results",$("gl-code").value));
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&stream)scanFrame();else if(document.hidden&&stream)status("gl-live-note","Screen sharing remains active while this tab is hidden. The browser sharing indicator stays visible; use Stop scanning to end it.");});
window.addEventListener("pagehide",()=>stopCapture("Page closed; screen sharing stopped."));
document.addEventListener("click",e=>{const b=e.target.closest(".gl-copy");if(!b)return;const v=b.getAttribute("data-copy")||"";if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(v).then(()=>{const old=b.textContent;b.textContent="Copied";setTimeout(()=>b.textContent=old,1200);}).catch(()=>window.prompt("Copy example fix:",v));else window.prompt("Copy example fix:",v);});

// Project ZIP/public GitHub analysis: text-only inspection; never execute code.
let zipPromise=null;
function loadZip(){if(window.JSZip)return Promise.resolve(window.JSZip);if(!zipPromise)zipPromise=new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";s.onload=()=>window.JSZip?resolve(window.JSZip):reject(Error("ZIP reader did not initialize."));s.onerror=()=>reject(Error("Could not load ZIP reader; check your connection."));document.head.appendChild(s);});return zipPromise;}
const skip=/(^|\/)(node_modules|vendor|\.git|dist|build|coverage|\.next|venv|__pycache__)(\/|$)/i;
const ext=/\.(js|jsx|ts|tsx|mjs|cjs|py|java|go|rs|rb|php|cs|cpp|c|h|html|css|scss|json|ya?ml|toml|md|sql|sh|txt)$/i;
async function zipFiles(file){
 if(!file)throw Error("Choose a ZIP file or enter a public GitHub URL.");
 if(file.size>25*1024*1024)throw Error("ZIP files must be 25 MB or smaller.");
 const Z=await loadZip(),archive=await Z.loadAsync(file),files=[];
 for(const path in archive.files){const entry=archive.files[path];if(entry.dir||skip.test(path)||!ext.test(path)||files.length>=160)continue;const size=entry._data&&entry._data.uncompressedSize||0;if(size>180000)continue;const body=await entry.async("string");if(!body.includes("\u0000"))files.push({path,content:body});}
 return files;
}
function parseRepo(raw){let u;try{u=new URL(raw);}catch{throw Error("Enter a valid public GitHub repository URL.");}if(u.protocol!=="https:"||u.hostname!=="github.com")throw Error("URL analysis currently supports public GitHub repositories. Other sites may block browser access.");const p=u.pathname.split("/").filter(Boolean);if(p.length<2)throw Error("Use a link like https://github.com/owner/repo.");return{owner:p[0],repo:p[1].replace(/\.git$/,""),branch:p[2]==="tree"?p[3]:""};}
async function githubFiles(raw){
 const r=parseRepo(raw),base="https://api.github.com/repos/"+encodeURIComponent(r.owner)+"/"+encodeURIComponent(r.repo),headers={Accept:"application/vnd.github+json"};
 const mr=await fetch(base,{headers});if(!mr.ok)throw Error(mr.status===404?"Repository not found or not public.":"GitHub request failed (HTTP "+mr.status+").");
 const meta=await mr.json(),branch=r.branch||meta.default_branch,tr=await fetch(base+"/git/trees/"+encodeURIComponent(branch)+"?recursive=1",{headers});
 if(!tr.ok)throw Error("Could not read repository tree (HTTP "+tr.status+"). Try its default URL or upload ZIP.");
 const tree=await tr.json(),files=[];
 for(const item of tree.tree||[]){if(item.type!=="blob"||skip.test(item.path)||!ext.test(item.path)||files.length>=100||(item.size||0)>180000)continue;
  try{const url="https://raw.githubusercontent.com/"+encodeURIComponent(r.owner)+"/"+encodeURIComponent(r.repo)+"/"+branch.split("/").map(encodeURIComponent).join("/")+"/"+item.path.split("/").map(encodeURIComponent).join("/");const res=await fetch(url);if(res.ok){const body=await res.text();if(!body.includes("\u0000"))files.push({path:item.path,content:body});}}catch(_){}
 }
 if(!files.length)throw Error("No readable source files found. Check the public repository or upload its ZIP.");
 return files;
}
async function getFiles(prefix){const url=$(prefix+"-source").value.trim();return url?githubFiles(url):zipFiles($(prefix+"-zip").files[0]);}
function projectReport(files){
 const paths=files.map(f=>f.path.toLowerCase()),all=files.map(f=>f.content).join("\n"),count=r=>(all.match(r)||[]).length;
 const tests=paths.filter(p=>/(^|\/)(__tests__|tests?|spec)\/|(^|[._-])(test|spec)\.[^.]+$/.test(p)).length;
 const ci=paths.filter(p=>p.includes(".github/workflows/")||p.includes(".gitlab-ci")||p.includes("jenkinsfile")||p.includes("azure-pipelines")).length;
 const docs=paths.some(p=>/(^|\/)(readme|contributing|security|architecture)(\.|$)|(^|\/)docs\//.test(p));
 const manifest=paths.some(p=>/(^|\/)(package\.json|requirements\.txt|pyproject\.toml|go\.mod|cargo\.toml|pom\.xml)$/.test(p));
 const todos=count(/\b(TODO|FIXME|HACK|XXX)\b/g),catches=count(/catch\s*\([^)]*\)\s*\{\s*\}|except\s*:\s*(?:pass)?/g),evals=count(/\beval\s*\(/g),html=count(/\.innerHTML\s*=/g);
 const secretMatches=files.filter(f=>!/example|sample|test|fixture/i.test(f.path)).reduce((n,f)=>n+(f.content.match(/(?:sk-[A-Za-z0-9_-]{20,}|(?:api[_-]?key|client_secret|service_role)\s*[:=]\s*["'][^"'\n]{12,}["'])/gi)||[]).length,0);
 const large=files.filter(f=>f.content.split(/\r?\n/).length>500);
 const source=files.filter(f=>/\.(js|jsx|ts|tsx|py|java|go|rs|rb|php|cs|cpp|c)$/i.test(f.path)).length;
 const risk=Math.min(100,Math.round((tests?0:22)+(ci?0:10)+(manifest?0:8)+Math.min(18,todos*2)+Math.min(18,catches*6)+Math.min(18,secretMatches*12)+Math.min(12,large.length*3)+Math.min(8,evals*4)+(source?0:12)));
 const suggestions=[];
 function add(ok,title,why,action,impact){if(ok)suggestions.push({title,why,action,impact});}
 add(!tests,"Add automated tests","No obvious test/spec files were found in the scanned files.","Test key user flows and edge cases that have caused bugs.","High");
 add(!ci,"Run checks automatically","No common CI workflow was found.","Add a GitHub Actions workflow for tests, linting, and production builds.","High");
 add(secretMatches>0,"Review possible credentials","A text pattern resembles a secret; it may be a false positive.","Verify privately. Revoke any real exposed key and move secrets to server-side environment variables.","Critical");
 add(catches>0,"Make errors visible","Empty error handlers may hide failures.","Log safe context, handle expected errors specifically, and show a useful user message.","High");
 add(todos>0,"Turn TODOs into tracked tasks","Found "+todos+" TODO/FIXME/HACK markers.","Prioritize them, create issues for important ones, and remove obsolete markers.","Medium");
 add(large.length>0,"Split oversized source files carefully",large.length+" files exceed 500 lines; this alone is not a bug.","Extract cohesive modules and add tests before refactoring.","Medium");
 add(evals>0,"Review dynamic code execution","Calls to eval were found.","Avoid eval for data parsing; use JSON.parse for JSON and explicit operations.","High");
 add(html>0,"Review HTML injection boundaries","Direct innerHTML assignments were found; risk depends on the data source.","Use textContent for plain text or sanitize HTML and validate inputs.","High");
 add(!manifest,"Document dependencies and setup","No common dependency manifest was found.","Add the correct manifest and repeatable setup instructions.","Medium");
 add(!docs,"Add a project guide","No obvious README or docs folder was found.","Document install, run, test, configuration, and deployment.","Medium");
 if(!suggestions.length)suggestions.push({title:"Validate the main user journeys",why:"No major pattern from this lightweight scan stood out.",action:"Run tests, inspect logs, update dependencies, and test key flows end to end.","impact":"Medium"});
 return{files:files.length,source:source,tests:tests,ci:ci,todos:todos,catches:catches,secrets:secretMatches,large:large.length,risk:risk,suggestions:suggestions};
}
function renderReport(target,report,mode,goal){
 let suggestions=report.suggestions.slice().sort((a,b)=>({Critical:0,High:1,Medium:2,Low:3}[a.impact]||3)-({Critical:0,High:1,Medium:2,Low:3}[b.impact]||3));
 if(goal==="security")suggestions.sort((a,b)=>Number(/credential|injection|execution/i.test(b.title))-Number(/credential|injection|execution/i.test(a.title)));
 if(goal==="reliability")suggestions.sort((a,b)=>Number(/test|error|checks|TODO/i.test(b.title))-Number(/test|error|checks|TODO/i.test(a.title)));
 if(goal==="scale")suggestions.sort((a,b)=>Number(/oversized|test|checks/i.test(b.title))-Number(/oversized|test|checks/i.test(a.title)));
 $(target).innerHTML='<div class="panel"><h3>'+(mode==="time"?"Forecast snapshot":"Project snapshot")+'</h3><div class="stat"><div class="stat-head"><span>Heuristic maintenance-risk indicator</span><span class="tag orange">Not a probability</span></div><strong>'+report.risk+'/100</strong><div class="progress"><span style="width:'+report.risk+'%"></span></div></div><p class="muted" style="font-size:12px">Files: '+report.files+' · Source files: '+report.source+' · Test/spec files: '+report.tests+' · CI workflows: '+report.ci+' · TODO markers: '+report.todos+' · Large files: '+report.large+'</p><p class="small-note">This is a rule-based indicator, not a statistically validated prediction of bugs, users, revenue, or future outcomes.</p></div><div class="panel"><h3>What may happen as it grows</h3><p style="font-size:13px">Without automated checks, clear error handling, and safe configuration, changes may become slower to review and regressions harder to spot. This scan cannot predict when a failure will happen.</p><p class="muted" style="font-size:12px">Security matches are clues to verify, not proof of a vulnerability.</p></div><div class="panel" style="grid-column:1/-1"><h3>Prioritized suggestions</h3>'+suggestions.map((s,i)=>'<div class="mission-row"><div class="mission-symbol">'+(s.impact==="Critical"?"🛡️":s.impact==="High"?"⚠️":"🧩")+'</div><div><strong>'+(i+1)+'. '+esc(s.title)+'</strong><small style="display:block;margin-top:5px">'+esc(s.why)+'</small><p class="muted" style="font-size:12px;margin:7px 0 0"><b>Next step:</b> '+esc(s.action)+'</p></div><span class="tag">'+esc(s.impact)+'</span></div>').join("")+'</div>';
}
async function runAnalysis(prefix,mode){
 const btn=$(prefix+"-analyze");btn.disabled=true;btn.dataset.old=btn.textContent;btn.textContent="Inspecting files…";
 $(prefix+"-results").innerHTML="";status(prefix+"-status","Reading text files. Uploaded code will not be executed.");
 try{const files=await getFiles(prefix),report=projectReport(files);renderReport(prefix+"-results",report,mode,prefix==="adv"?$("adv-goal").value:"");status(prefix+"-status","Done. Inspected "+files.length+" readable text files; unsupported or large files may be skipped.","good");}
 catch(e){status(prefix+"-status",e.message||"Could not analyze project.","error");}
 finally{btn.disabled=false;btn.textContent=btn.dataset.old||"Analyze project";delete btn.dataset.old;}
}
if($("tt-analyze"))$("tt-analyze").addEventListener("click",()=>runAnalysis("tt","time"));
if($("adv-analyze"))$("adv-analyze").addEventListener("click",()=>runAnalysis("adv","adventure"));
if($("tt-clear"))$("tt-clear").addEventListener("click",()=>{$("tt-results").innerHTML="";status("tt-status","Results cleared.");});
if($("adv-clear"))$("adv-clear").addEventListener("click",()=>{$("adv-results").innerHTML="";status("adv-status","Results cleared.");});
const labels={ghostlab:"Ghost Lab",timetravel:"Time Travel",adventure:"Adventure"};
const nav=document.querySelector(".nav[aria-label='Developer tools']");
if(nav){nav.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b&&labels[b.dataset.page]){const c=$("crumbName");if(c)c.textContent=labels[b.dataset.page];}});}
})();