#!/usr/bin/env python3
"""
explorer_gen.py — Sovereign EXCAL block explorer generator.

Reads the local chaindata (chaindata_mainnet/chaindata/blocks.jsonl),
parses every block and transaction, builds the UTXO set, and emits a
single self-contained explorer.html:

  - no server, no CDN, no external requests — open the file anywhere
  - block list, block detail, transaction detail, address lookup
  - chain stats: height, tip, cumulative work, minted supply, UTXO count
  - Aetherion bridge status section (reads ../aetherion/bridge_ledger.json
    if an operator publishes one; otherwise states none exists)

Pure stdlib. Re-run to refresh: python3 explorer_gen.py
"""
import hashlib
import json
import os
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
import sys
sys.path.insert(0, ROOT)
from txscript import parse_tx, txid_display, txid_internal, spk_pubkey, is_anyone  # noqa: E402

CHAINDATA = os.path.join(ROOT, "chaindata_mainnet", "chaindata", "blocks.jsonl")
STATE_JSON = os.path.join(ROOT, "chaindata_mainnet", "chaindata", "state.json")
BRIDGE_LEDGER = os.path.join(ROOT, "aetherion", "bridge_ledger.json")
OUT = os.path.join(HERE, "explorer.html")


def sha256d(b: bytes) -> bytes:
    return hashlib.sha256(hashlib.sha256(b).digest()).digest()


def load_blocks():
    blocks = []
    with open(CHAINDATA) as f:
        for line in f:
            line = line.strip()
            if line:
                blocks.append(json.loads(line))
    blocks.sort(key=lambda b: b["height"])
    return blocks


def addr_of(spk_hex: str) -> str:
    spk = bytes.fromhex(spk_hex)
    if is_anyone(spk):
        return "anyone"
    pk = spk_pubkey(spk)
    if pk:
        return pk.hex()
    return "script:" + spk_hex[:16]


def build_model():
    blocks = load_blocks()
    utxo = {}          # (txid, idx) -> {value, address, height}
    tx_index = {}      # txid -> {height, block_hash, tx}
    addr_hist = {}     # address -> [events]
    model_blocks = []
    total_out = 0
    for b in blocks:
        blk = b["block"]
        txs_out = []
        for raw_hex in blk.get("txs", []):
            raw = bytes.fromhex(raw_hex)
            t = parse_tx(raw)
            txid = txid_display(raw)          # display order for humans
            tid_raw = txid_internal(raw)      # wire order: UTXO key order
            ins = []
            is_coinbase = all(i["prev"] == b"\x00" * 32 and i["idx"] == 0xFFFFFFFF
                              for i in t["vin"])
            for i, inp in enumerate(t["vin"]):
                if is_coinbase and i == 0:
                    ins.append({"coinbase": True})
                else:
                    key = (inp["prev"], inp["idx"])
                    prev = utxo.get(key)
                    ins.append({"prev_txid": inp["prev"][::-1].hex(),
                                "prev_idx": inp["idx"],
                                "spent_value": prev["value"] if prev else None,
                                "spent_addr": prev["address"] if prev else None})
                    if prev:
                        del utxo[key]
            outs = []
            for idx, o in enumerate(t["vout"]):
                a = addr_of(o["script"].hex())
                utxo[(tid_raw, idx)] = {"value": o["value"], "address": a,
                                        "height": b["height"]}
                outs.append({"idx": idx, "value": o["value"], "address": a})
                addr_hist.setdefault(a, []).append(
                    {"kind": "recv", "txid": txid, "height": b["height"],
                     "value": o["value"]})
            for inp in ins:
                if inp.get("spent_addr"):
                    addr_hist.setdefault(inp["spent_addr"], []).append(
                        {"kind": "spent", "txid": txid, "height": b["height"],
                         "value": inp["spent_value"]})
            tx_index[txid] = {"height": b["height"], "block_hash": b["hash"]}
            txs_out.append({"txid": txid, "ins": ins, "outs": outs,
                            "is_coinbase": is_coinbase,
                            "size": len(raw)})
        model_blocks.append({
            "height": b["height"], "hash": b["hash"],
            "prev": blk.get("prev"), "merkle": blk.get("merkle"),
            "time": blk.get("time"), "bits": blk.get("bits"),
            "nonce": blk.get("nonce"), "txs": txs_out,
            "work_cum": b.get("work_cum"),
        })
    balances = {}
    for (txid, idx), u in utxo.items():
        balances[u["address"]] = balances.get(u["address"], 0) + u["value"]
    minted = sum(o["value"] for blk in model_blocks for t in blk["txs"]
                 if t["is_coinbase"] for o in t["outs"])
    return {
        "blocks": model_blocks,
        "tx_index": tx_index,
        "balances": balances,
        "addr_hist": addr_hist,
        "utxo_count": len(utxo),
        "minted": minted,
        "generated_at": int(time.time()),
    }


def bridge_status():
    if not os.path.exists(BRIDGE_LEDGER):
        return {"present": False}
    try:
        with open(BRIDGE_LEDGER) as f:
            st = json.load(f)
        assets = {}
        for sym, a in st.get("assets", {}).items():
            assets[sym] = {"locked": a.get("locked", 0),
                           "minted": a.get("minted", 0),
                           "burned": a.get("burned", 0)}
        return {"present": True, "assets": assets,
                "threshold": st.get("threshold"),
                "log_len": len(st.get("log", []))}
    except Exception as e:
        return {"present": False, "error": str(e)}


HTML_HEAD = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>EXCAL Genesis Fork — Sovereign Explorer</title>
<style>
body{font-family:ui-monospace,Menlo,Consolas,monospace;background:#0d1117;color:#c9d1d9;margin:0;padding:0}
header{background:#161b22;padding:16px 24px;border-bottom:1px solid #30363d}
h1{font-size:18px;margin:0;color:#f0b429}h1 small{color:#8b949e;font-size:12px}
.stats{display:flex;gap:24px;flex-wrap:wrap;padding:12px 24px;background:#0d1117;border-bottom:1px solid #30363d}
.stat label{display:block;font-size:11px;color:#8b949e}.stat b{font-size:14px;color:#e6edf3}
main{padding:16px 24px;max-width:1100px}
input[type=text]{width:100%;padding:10px;background:#0d1117;border:1px solid #30363d;color:#e6edf3;border-radius:6px;font-family:inherit}
table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
th,td{text-align:left;padding:8px;border-bottom:1px solid #21262d;vertical-align:top}
th{color:#8b949e;font-weight:normal;font-size:11px;text-transform:uppercase}
a{color:#58a6ff;text-decoration:none;cursor:pointer}a:hover{text-decoration:underline}
.hash{font-size:12px;word-break:break-all}
.card{background:#161b22;border:1px solid #30363d;border-radius:6px;padding:16px;margin:12px 0}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:#1f6feb;color:#fff}
.badge.coinbase{background:#8957e5}.badge.warn{background:#9e6a03}
.note{color:#8b949e;font-size:12px}
</style></head><body>
<header><h1>⚔ EXCAL Genesis Fork <small>sovereign explorer · generated locally · no third parties</small></h1></header>
<div class="stats" id="stats"></div>
<main>
<input type="text" id="q" placeholder="Search: block height, block hash, txid, or address…  (Enter)">
<div id="view"></div>
</main>
<script>
const DATA = /*__DATA__*/;
"""

HTML_TAIL = """
const $=s=>document.querySelector(s);
function fmtTime(t){return new Date(t*1000).toISOString().replace('T',' ').slice(0,19)+'Z'}
function fmtVal(v){return (v/1e8).toFixed(8)+' GSF'}
function shortAddr(a){return a==='anyone'?'anyone':a.slice(0,16)+'…'}
function renderStats(){
  const b=DATA.blocks[DATA.blocks.length-1];
  $('#stats').innerHTML=
   stat('Height',b.height)+stat('Tip',b.hash.slice(0,16)+'…')+
   stat('Blocks',DATA.blocks.length)+stat('Minted',fmtVal(DATA.minted))+
   stat('UTXOs',DATA.utxo_count)+stat('Generated',fmtTime(DATA.generated_at));
  function stat(l,v){return '<div class="stat"><label>'+l+'</label><b>'+v+'</b></div>'}
}
function blockRow(b){return '<tr><td><a data-h="'+b.height+'">'+b.height+'</a></td>'+
 '<td class="hash"><a data-h="'+b.height+'">'+b.hash.slice(0,24)+'…</a></td>'+
 '<td>'+fmtTime(b.time)+'</td><td>'+b.txs.length+'</td>'+
 '<td>'+b.nonce+'</td><td class="hash">'+b.bits.toString(16)+'</td></tr>'}
function showHome(){
  let h='<table><tr><th>Height</th><th>Hash</th><th>Time</th><th>Txs</th><th>Nonce</th><th>Bits</th></tr>';
  [...DATA.blocks].reverse().forEach(b=>{h+=blockRow(b)});
  $('#view').innerHTML=h+'</table>';
}
function showBlock(h){
  const b=DATA.blocks.find(x=>x.height===h);if(!b)return showHome();
  let s='<div class="card"><span class="badge">BLOCK '+b.height+'</span> <span class="hash note">'+b.hash+'</span>'+
   '<table><tr><th>Field</th><th>Value</th></tr>'+
   '<tr><td>Prev</td><td class="hash">'+b.prev+'</td></tr>'+
   '<tr><td>Merkle</td><td class="hash">'+b.merkle+'</td></tr>'+
   '<tr><td>Time</td><td>'+fmtTime(b.time)+'</td></tr>'+
   '<tr><td>Bits</td><td>0x'+b.bits.toString(16)+'</td></tr>'+
   '<tr><td>Nonce</td><td>'+b.nonce+'</td></tr>'+
   '<tr><td>Cum. work</td><td>'+b.work_cum+'</td></tr></table></div>';
  s+='<h3>Transactions ('+b.txs.length+')</h3><table><tr><th>Txid</th><th>Type</th><th>Ins</th><th>Outs</th><th>Size</th></tr>';
  b.txs.forEach(t=>{s+='<tr><td class="hash"><a data-t="'+t.txid+'">'+t.txid.slice(0,24)+'…</a></td>'+
   '<td>'+(t.is_coinbase?'<span class="badge coinbase">coinbase</span>':'tx')+'</td>'+
   '<td>'+t.ins.length+'</td><td>'+t.outs.length+'</td><td>'+t.size+' B</td></tr>'});
  $('#view').innerHTML=s+'</table>';
}
function showTx(txid){
  let b=null,t=null;
  for(const blk of DATA.blocks){t=blk.txs.find(x=>x.txid===txid);if(t){b=blk;break}}
  if(!t){$('#view').innerHTML='<p class="note">Transaction not found.</p>';return}
  let s='<div class="card"><span class="badge">TX</span> <span class="hash note">'+txid+'</span>'+
   '<p class="note">Block <a data-h="'+b.height+'">'+b.height+'</a> · '+(t.is_coinbase?'<span class="badge coinbase">coinbase</span>':'')+' · '+t.size+' bytes</p>';
  s+='<h3>Inputs ('+t.ins.length+')</h3><table><tr><th>Source</th><th>Value</th></tr>';
  t.ins.forEach(i=>{s+=i.coinbase?'<tr><td>coinbase</td><td>—</td></tr>':
   '<tr><td class="hash"><a data-t="'+i.prev_txid+'">'+i.prev_txid.slice(0,20)+'…</a>:'+i.prev_idx+
   (i.spent_addr?' <span class="note">(<a data-a="'+i.spent_addr+'">'+shortAddr(i.spent_addr)+'</a>)</span>':'')+'</td><td>'+
   (i.spent_value!=null?fmtVal(i.spent_value):'<span class="note">?</span>')+'</td></tr>'});
  s+='</table><h3>Outputs ('+t.outs.length+')</h3><table><tr><th>#</th><th>Address</th><th>Value</th></tr>';
  t.outs.forEach(o=>{s+='<tr><td>'+o.idx+'</td><td class="hash"><a data-a="'+o.address+'">'+
   (o.address.length>40?o.address.slice(0,40)+'…':o.address)+'</a></td><td>'+fmtVal(o.value)+'</td></tr>'});
  $('#view').innerHTML=s+'</table></div>';
}
function showAddr(a){
  const bal=DATA.balances[a]||0,hist=DATA.addr_hist[a]||[];
  let s='<div class="card"><span class="badge">ADDRESS</span> <span class="hash note">'+a+'</span>'+
   '<p>Balance: <b>'+fmtVal(bal)+'</b> · '+hist.length+' events</p>';
  if(hist.length){s+='<table><tr><th>Kind</th><th>Height</th><th>Txid</th><th>Value</th></tr>';
   [...hist].reverse().forEach(e=>{s+='<tr><td>'+e.kind+'</td><td><a data-h="'+e.height+'">'+e.height+'</a></td>'+
    '<td class="hash"><a data-t="'+e.txid+'">'+e.txid.slice(0,20)+'…</a></td><td>'+fmtVal(e.value)+'</td></tr>'});
   s+='</table>'}else{s+='<p class="note">No activity on this chain.</p>'}
  $('#view').innerHTML=s+'</div>';
}
function search(){
  const q=$('#q').value.trim();if(!q)return;
  if(/^\\d+$/.test(q)){const h=parseInt(q);if(DATA.blocks.some(b=>b.height===h))return showBlock(h)}
  const ql=q.toLowerCase();
  let b=DATA.blocks.find(x=>x.hash.toLowerCase().startsWith(ql));
  if(b)return showBlock(b.height);
  for(const blk of DATA.blocks){if(blk.txs.some(t=>t.txid.toLowerCase().startsWith(ql)))return showTx(blk.txs.find(t=>t.txid.toLowerCase().startsWith(ql)).txid)}
  if(DATA.balances[q]!==undefined||DATA.addr_hist[q])return showAddr(q);
  const am=Object.keys(DATA.addr_hist).find(a=>a.toLowerCase().startsWith(ql));
  if(am)return showAddr(am);
  $('#view').innerHTML='<p class="note">No block, transaction, or address matches.</p>';
}
document.addEventListener('click',e=>{
  const t=e.target.closest('a[data-h],a[data-t],a[data-a]');if(!t)return;
  if(t.dataset.h!==undefined)showBlock(parseInt(t.dataset.h));
  else if(t.dataset.t)showTx(t.dataset.t);else showAddr(t.dataset.a);
});
$('#q').addEventListener('keydown',e=>{if(e.key==='Enter')search()});
renderStats();showHome();
</script></body></html>
"""


def main():
    model = build_model()
    model["bridge"] = bridge_status()
    data_json = json.dumps(model, separators=(",", ":"))
    html = HTML_HEAD.replace("/*__DATA__*/", data_json) + HTML_TAIL
    with open(OUT, "w") as f:
        f.write(html)
    n_blocks = len(model["blocks"])
    n_txs = sum(len(b["txs"]) for b in model["blocks"])
    print(f"explorer: {n_blocks} blocks, {n_txs} txs, {model['utxo_count']} utxos -> {OUT}")


if __name__ == "__main__":
    main()
