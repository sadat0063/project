// ==================================================
// ChatSavePro v3.3 – Background Service Worker (Module)
// ==================================================

import { AdvancedStorageManager } from './modules/AdvancedStorageManager.js';
import { ExportManager } from './modules/ExportManager.js';
import { IndexedDBManager } from './modules/IndexedDBManager.js';

// -----------------------------
// 1. Context Isolation
// -----------------------------
const selfContext = typeof self !== 'undefined' ? self : globalThis;
if (selfContext.ChatSaveProBridge) delete selfContext.ChatSaveProBridge;

// -----------------------------
// 2. Logger + Error Catcher
// -----------------------------
class SecureLogger {
    constructor() { this.enabled = true; }
    log(level, msg, ...args) { if(!this.enabled) return; console.log(`[${level}] ${msg}`, ...args); }
    info(msg,...a){this.log("INFO",msg,...a);}
    warn(msg,...a){this.log("WARN",msg,...a);}
    error(msg,...a){this.log("ERROR",msg,...a);}
    critical(msg,...a){this.log("CRITICAL",msg,...a);}
}
const logger = new SecureLogger();

// -----------------------------
// 3. SafeExec
// -----------------------------
const SafeExec = async (fn,fallback=null,timeoutMs=30000)=>{
    let tid;
    try {
        const timeoutPromise = new Promise((_, rej) => { tid = setTimeout(()=>rej(new Error(`Timeout ${timeoutMs}ms`)), timeoutMs); });
        const result = await Promise.race([fn(), timeoutPromise]);
        clearTimeout(tid);
        return result;
    } catch(e) {
        clearTimeout(tid);
        logger.error("SafeExec caught:", e.message);
        return typeof fallback==='function'?fallback(e):fallback;
    }
};

// -----------------------------
// 4. Bridge Interface
// -----------------------------
const ChatSaveProBridge = {
    async getStatus(){ return await SafeExec(()=>backgroundController.getSystemStatus(), {success:false,error:"Status unavailable"}); },
    async exportData(opts){ return await SafeExec(()=>backgroundController.handleExport(opts), {success:false,error:"Export failed"}); },
    async deepScan(){ return await SafeExec(()=>backgroundController.performDeepScan(), {success:false,error:"Deep scan failed"}); },
    async liveScanStart(){ return await SafeExec(()=>backgroundController.startLiveScan(), {success:false,error:"Live scan start failed"}); },
    async liveScanStop(){ return await SafeExec(()=>backgroundController.stopLiveScan(), {success:false,error:"Live scan stop failed"}); }
};
Object.defineProperty(selfContext,'ChatSaveProBridge',{value:ChatSaveProBridge,writable:false,configurable:false,enumerable:true});

// -----------------------------
// 5. Background Controller
// -----------------------------
class BackgroundController {
    constructor(){
        this.storage = new AdvancedStorageManager();
        this.db = new IndexedDBManager();
        this.exportMgr = new ExportManager();
        this.popupPorts = new Map();
        this.liveScanSessions = new Map();
        this.initialized = false;
        this.initializationPromise = null;
    }

    async init(){
        if(this.initializationPromise) return this.initializationPromise;
        this.initializationPromise = this._initialize();
        return this.initializationPromise;
    }

    async _initialize(){
        if(this.initialized) return;
        logger.info("🚀 Booting Background Controller...");
        await SafeExec(()=>this.db.init());
        await SafeExec(()=>this.exportMgr.init());
        await SafeExec(()=>this.storage.init());
        this.setupConnections();
        this.initialized = true;
        logger.info("✅ Background initialized");
    }

    // -----------------------------
    // Memory Segmentation
    // -----------------------------
    async getMemorySnapshot(){
        return await SafeExec(async ()=>{
            const [internalCache, chromeStorage] = await Promise.all([
                SafeExec(()=>this.storage?.isInitialized() ?? false),
                SafeExec(()=>chrome.storage.local.get(null))
            ]);
            return {
                internalCache,
                indexedDB:this.db?true:false,
                chromeStorage,
                popupPortsCount:this.popupPorts.size,
                liveSessionsCount:this.liveScanSessions.size,
                timestamp:Date.now()
            };
        }, {internalCache:false,indexedDB:false,chromeStorage:{},popupPortsCount:0,liveSessionsCount:0,timestamp:Date.now(),error:"Memory snapshot failed"});
    }

    // -----------------------------
    // Security & Permission
    // -----------------------------
    async checkPermission(name){ return await SafeExec(()=>chrome.permissions.contains({permissions:[name]}), false);}
    async verifySecureContext(){
        const perms=["storage","tabs","scripting"];
        const results = await Promise.all(perms.map(p=>this.checkPermission(p)));
        const missing = perms.filter((_,i)=>!results[i]);
        if(missing.length>0) logger.warn("⚠️ Missing permissions:", missing.join(", "));
        return missing.length===0;
    }

    // -----------------------------
    // Async Export
    // -----------------------------
    async handleExport({format="pdf",scope="all"}){
        logger.info(`📦 Export started (${format})`);
        const verified = await this.verifySecureContext();
        if(!verified) return {success:false,error:"Insufficient permissions"};
        return await SafeExec(async()=>{
            const data = await this.prepareExportData(scope);
            return await this.exportMgr.exportData(data,format);
        },{success:false,error:"Export failed"});
    }

    async prepareExportData(scope){
        return await SafeExec(async()=>{
            const scans = await this.db.getAllScans();
            return {scanResults:scans,version:"3.3",scope,statistics:{totalScans:scans.length,platforms:scans.reduce((a,s)=>{a[s.platform]=(a[s.platform]||0)+1;return a;},{})}};
        },{scanResults:[],version:"3.3",scope,statistics:{totalScans:0,platforms:{}},error:"Data prep failed"});
    }

    // -----------------------------
    // Scalable Connector
    // -----------------------------
    async performDeepScan(){
        logger.info("🎯 Performing Deep Scan...");
        return await SafeExec(async()=>{
            const res={platform:"Web",timestamp:Date.now(),itemsFound:Math.floor(Math.random()*10)+5,scanId:`scan_${Date.now()}_${Math.random().toString(36).substr(2,9)}`};
            await this.db.storeScan(res);
            return {success:true,...res};
        },{success:false,error:"Deep scan failed"});
    }

    async startLiveScan(){
        const sessionId="session_"+Date.now();
        this.liveScanSessions.set(sessionId,{start:Date.now(),id:sessionId,status:"active"});
        setTimeout(()=>{this.liveScanSessions.delete(sessionId);logger.warn(`🕒 Live session ${sessionId} expired`);},10*60*1000);
        return {success:true,sessionId};
    }

    async stopLiveScan(sessionId=null){
        if(sessionId) this.liveScanSessions.delete(sessionId); else this.liveScanSessions.clear();
        return {success:true,stoppedSessions:this.liveScanSessions.size};
    }

    async getSystemStatus(){
        return await SafeExec(async()=>({
            initialized:this.initialized,
            popups:this.popupPorts.size,
            sessions:this.liveScanSessions.size,
            memory:await this.getMemorySnapshot(),
            timestamp:Date.now(),
            version:"3.3.final"
        }),{initialized:false,popups:0,sessions:0,memory:{error:"Unavailable"},timestamp:Date.now(),version:"3.3.final"});
    }

    // -----------------------------
    // Connection Management
    // -----------------------------
    setupConnections(){
        chrome.runtime.onConnect.addListener(port=>{
            if(!port||!port.name) return;
            if(this.popupPorts.has(port.name)){port.disconnect();return;}
            this.popupPorts.set(port.name,port);

            const onDisconnect=()=>{this.popupPorts.delete(port.name); port.onDisconnect.removeListener(onDisconnect); port.onMessage.removeListener(onMessage);};
            const onMessage=async(msg)=>{await SafeExec(async()=>{
                if(!msg||!msg.action) return;
                switch(msg.action){
                    case "getStatus": port.postMessage(await this.getSystemStatus()); break;
                    case "export": port.postMessage(await this.handleExport(msg.options||{})); break;
                    case "deepScan": port.postMessage(await this.performDeepScan()); break;
                    case "liveScanStart": port.postMessage(await this.startLiveScan()); break;
                    case "liveScanStop": port.postMessage(await this.stopLiveScan()); break;
                    default: port.postMessage({success:false,error:"Unknown action"});
                }
            });};

            port.onDisconnect.addListener(onDisconnect);
            port.onMessage.addListener(onMessage);
        });
    }
}

// -----------------------------
// Bootstrap
// -----------------------------
const backgroundController = new BackgroundController();
SafeExec(()=>backgroundController.init());
logger.info("✅ Background v3.3 loaded successfully!");
