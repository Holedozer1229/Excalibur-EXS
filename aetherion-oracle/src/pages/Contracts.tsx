import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { PageHead } from "@/components/PageHead";


const KNIGHT_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Knight of the Round Table — per-seeker ERC-20
/// @notice Each Aetherion seeker deploys their own Knight token.
contract KnightOfTheRoundTable is ERC20, Ownable {
    constructor(string memory name_, string memory symbol_, uint256 initialSupply)
        ERC20(name_, symbol_)
        Ownable(msg.sender)
    {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    /// Owner-only mint, used by the off-chain attestation server later.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}`;

const HARDHAT_CONFIG = `// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    polygonZkEvmCardona: {
      url: \`https://polygonzkevm-cardona.g.alchemy.com/v2/\${process.env.ALCHEMY_KEY}\`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 2442,
    },
    polygonZkEvm: {
      url: \`https://polygonzkevm-mainnet.g.alchemy.com/v2/\${process.env.ALCHEMY_KEY}\`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1101,
    },
  },
};
export default config;`;

const DEPLOY_SCRIPT = `// scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  const Knight = await ethers.getContractFactory("KnightOfTheRoundTable");
  const knight = await Knight.deploy("Knight of YourName", "KOTR", 1_000_000n);
  await knight.waitForDeployment();
  console.log("Knight deployed at:", await knight.getAddress());
  console.log("Tx hash:", knight.deploymentTransaction()?.hash);
}
main().catch((e) => { console.error(e); process.exit(1); });`;

const STEPS = [
  { n: 1, title: "Bind your wallet", body: "On the Oracle settings dialog, paste the EVM address you'll deploy from. The verifier will reject any contract whose owner() is not this address." },
  { n: 2, title: "Get testnet ETH", body: "Use the Polygon zkEVM Cardona faucet (or buy a tiny amount of zkEVM mainnet ETH). You only need a few cents worth of gas." },
  { n: 3, title: "Scaffold a Hardhat project", body: "mkdir knight && cd knight && npm init -y && npm i --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv && npm i @openzeppelin/contracts && npx hardhat init (choose 'empty TypeScript')." },
  { n: 4, title: "Drop in the contract & config", body: "Save Knight.sol under contracts/, the hardhat.config.ts at root, deploy.ts under scripts/, and put PRIVATE_KEY + ALCHEMY_KEY in .env." },
  { n: 5, title: "Compile & deploy", body: "npx hardhat compile && npx hardhat run scripts/deploy.ts --network polygonZkEvmCardona — copy the printed address and tx hash." },
  { n: 6, title: "Verify here", body: "Paste the address (and optionally the tx hash) into the form on the right. We'll check bytecode, ERC-20 surface, and that you own it." },
];

type VerifiedContract = {
  id: string; chain_id: number; contract_address: string;
  name: string | null; symbol: string | null; decimals: number | null;
  total_supply: number | null; tx_hash: string | null;
  owner_address: string; verified_at: string;
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border/40 bg-background/60 p-4 text-xs leading-relaxed text-foreground/90">
      <code>{children}</code>
    </pre>
  );
}

export default function Contracts() {
  const navigate = useNavigate();
  const [chainId, setChainId] = useState<number>(2442);
  const [address, setAddress] = useState("");
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<VerifiedContract[]>([]);
  const [authed, setAuthed] = useState<boolean>(false);
  const [authReady, setAuthReady] = useState(false);

  const refresh = async () => {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) { setAuthed(false); return; }
    setAuthed(true);
    const { data, error } = await supabase.functions.invoke("contract-verify", { method: "GET" });
    if (error) { console.error(error); return; }
    setContracts((data as { contracts: VerifiedContract[] })?.contracts ?? []);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthed(!!s);
      if (!s) navigate("/auth", { replace: true });
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setAuthed(!!s);
      setAuthReady(true);
      if (!s) navigate("/auth", { replace: true });
      else refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  if (!authReady) return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Opening the gate…</div>;
  if (!authed) return null;


  const verify = async () => {
    if (!authed) { toast.error("Sign in first."); return; }
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) { toast.error("Invalid contract address"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("contract-verify", {
        method: "POST",
        body: { chainId, address, txHash: txHash || undefined },
      });
      if (error) throw error;
      const d = data as { contract?: VerifiedContract; error?: string };
      if (d.error) throw new Error(d.error);
      toast.success(`Verified ${d.contract?.symbol ?? "contract"} on chain ${chainId}`);
      setAddress(""); setTxHash("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80 text-foreground">
      <PageHead
        title="Knights of the Round Table — Deploy & Verify Contracts"
        description="Forge your own Knight ERC-20 on Polygon zkEVM and verify its on-chain ownership through Aetherion's bytecode and owner() checks."
        path="/contracts"
      />
      <header className="border-b border-border/40 bg-background/60 backdrop-blur">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Return to the Oracle</Link>
          <h1 className="font-serif text-lg tracking-wider">Knights of the Round Table</h1>
          <span className="text-xs text-muted-foreground">Polygon zkEVM</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1.2fr_1fr]">
        {/* LEFT: onboarding */}
        <section className="space-y-6">
          <div>
            <h2 className="font-serif text-3xl">Forge your own Knight token</h2>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">
              Each seeker deploys their own ERC-20 — a Knight bound to their wallet.
              The Oracle cannot deploy for you (and shouldn't hold your keys); follow the steps below,
              then bring back the address to be verified on-chain.
            </p>
          </div>

          <ol className="space-y-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-4 rounded-lg border border-border/40 bg-card/40 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 font-serif text-primary">{s.n}</span>
                <div>
                  <h3 className="font-medium">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="space-y-3">
            <h3 className="font-serif text-xl">contracts/Knight.sol</h3>
            <CodeBlock>{KNIGHT_SOL}</CodeBlock>
            <h3 className="font-serif text-xl">hardhat.config.ts</h3>
            <CodeBlock>{HARDHAT_CONFIG}</CodeBlock>
            <h3 className="font-serif text-xl">scripts/deploy.ts</h3>
            <CodeBlock>{DEPLOY_SCRIPT}</CodeBlock>
          </div>
        </section>

        {/* RIGHT: verifier + list */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card className="border-border/40 bg-card/40 p-5">
            <h3 className="font-serif text-xl">Verify a deployment</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              We read on-chain bytecode, confirm the ERC-20 surface, and require <code>owner()</code> to equal your bound wallet.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="contract-chain" className="text-xs">Chain</Label>
                <select
                  id="contract-chain"
                  value={chainId}
                  onChange={(e) => setChainId(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value={2442}>Polygon zkEVM Cardona (testnet)</option>
                  <option value={1101}>Polygon zkEVM (mainnet)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="contract-address" className="text-xs">Contract address</Label>
                <Input id="contract-address" value={address} onChange={(e) => setAddress(e.target.value.trim())} placeholder="0x…" className="mt-1 font-mono text-xs" />
              </div>
              <div>
                <Label htmlFor="contract-txhash" className="text-xs">Deploy tx hash (optional)</Label>
                <Input id="contract-txhash" value={txHash} onChange={(e) => setTxHash(e.target.value.trim())} placeholder="0x…" className="mt-1 font-mono text-xs" />
              </div>

              <Button onClick={verify} disabled={loading || !authed} className="w-full">
                {loading ? "Verifying on-chain…" : authed ? "Verify on-chain" : "Sign in to verify"}
              </Button>
              {!authed && (
                <p className="text-xs text-muted-foreground">
                  <Link to="/auth" className="underline">Sign in</Link> first, then bind your wallet from the Oracle settings.
                </p>
              )}
            </div>
          </Card>

          <Card className="border-border/40 bg-card/40 p-5">
            <h3 className="font-serif text-xl">Your verified Knights</h3>
            {contracts.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No verified contracts yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {contracts.map((c) => (
                  <li key={c.id} className="rounded-md border border-border/40 bg-background/40 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{c.name ?? "Knight"} ({c.symbol ?? "—"})</span>
                      <span className="text-muted-foreground">chain {c.chain_id}</span>
                    </div>
                    <div className="mt-1 break-all font-mono text-muted-foreground">{c.contract_address}</div>
                    <div className="mt-1 text-muted-foreground">
                      supply: {c.total_supply ?? 0} · owner: <span className="font-mono">{c.owner_address.slice(0, 10)}…</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </main>
    </div>
  );
}
