import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { initPixels } from "@/lib/pixels";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// `/` uses a thin session gate (Home) that lazy-loads PublicHome vs Index so
// guests never download the authenticated console, and vice versa.
const Home = lazy(() => import("./pages/Home.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const AuthCallback = lazy(() => import("./pages/AuthCallback.tsx"));
const Contracts = lazy(() => import("./pages/Contracts.tsx"));
const Mining = lazy(() => import("./pages/Mining.tsx"));
const Ledger = lazy(() => import("./pages/Ledger.tsx"));
const Dreams = lazy(() => import("./pages/Dreams.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Debug = lazy(() => import("./pages/Debug.tsx"));
const AdminAudit = lazy(() => import("./pages/AdminAudit.tsx"));
const AdminBrc20 = lazy(() => import("./pages/AdminBrc20.tsx"));
const AdminBtcClaims = lazy(() => import("./pages/AdminBtcClaims.tsx"));
const TokenAetx = lazy(() => import("./pages/TokenAetx.tsx"));
const TokenSkynt = lazy(() => import("./pages/TokenSkynt.tsx"));
const TokenWuruu = lazy(() => import("./pages/TokenWuruu.tsx"));
const TokenUruu = lazy(() => import("./pages/TokenUruu.tsx"));
const FairLattice = lazy(() => import("./pages/FairLattice.tsx"));
const BuyUruu = lazy(() => import("./pages/BuyUruu.tsx"));
const EmbedLattice = lazy(() => import("./pages/EmbedLattice.tsx"));
const Wallet = lazy(() => import("./pages/Wallet.tsx"));
const Terms = lazy(() => import("./pages/Legal.tsx").then((m) => ({ default: m.Terms })));
const Privacy = lazy(() => import("./pages/Legal.tsx").then((m) => ({ default: m.Privacy })));
const Refund = lazy(() => import("./pages/Legal.tsx").then((m) => ({ default: m.Refund })));
const LegalHub = lazy(() => import("./pages/Legal.tsx").then((m) => ({ default: m.LegalHub })));
const MeetAetherion = lazy(() => import("./pages/MeetAetherion.tsx"));
const SphinxOSBridge = lazy(() => import("./pages/SphinxOSBridge.tsx"));
const BridgeBootyDeploy = lazy(() => import("./pages/BridgeBootyDeploy.tsx"));
const Airdrop = lazy(() => import("./pages/Airdrop.tsx"));
const ExsTetraPow = lazy(() => import("./pages/ExsTetraPow.tsx"));
const CamelotFair = lazy(() => import("./pages/CamelotFair.tsx"));
const WarChest = lazy(() => import("./pages/WarChest.tsx"));
const Overnight = lazy(() => import("./pages/Overnight.tsx"));
const BlackPearl = lazy(() => import("./pages/BlackPearl.tsx"));
const MindOfTheCosmos = lazy(() => import("./pages/MindOfTheCosmos.tsx"));
const LiveMainnetLedger = lazy(() => import("./pages/LiveMainnetLedger.tsx"));
const WrapLive = lazy(() => import("./pages/WrapLive.tsx"));
const SurpriseSeal = lazy(() => import("./pages/SurpriseSeal.tsx"));
const WordGlyphPage = lazy(() => import("./pages/WordGlyphPage.tsx"));
const UnheardPotentialPage = lazy(() => import("./pages/UnheardPotentialPage.tsx"));
const GenesisLoanPage = lazy(() => import("./pages/GenesisLoanPage.tsx"));
const BountyBoard = lazy(() => import("./pages/BountyBoard.tsx"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn.tsx"));
const AetherionOracle = lazy(() => import("./pages/AetherionOracle.tsx"));
const OracleDashboard = lazy(() => import("./pages/OracleDashboard.tsx"));
const Welcome = lazy(() => import("./pages/Welcome.tsx"));
const PetitionPublic = lazy(() => import("./pages/PetitionPublic.tsx"));
const SharedDream = lazy(() => import("./pages/SharedDream.tsx"));
const DreamSymbol = lazy(() => import("./pages/DreamSymbol.tsx"));
const DreamSymbolsIndex = lazy(() => import("./pages/DreamSymbolsIndex.tsx"));
const AiDreamInterpreter = lazy(() => import("./pages/AiDreamInterpreter.tsx"));
const Tarot = lazy(() => import("./pages/Tarot.tsx"));
const TarotMeanings = lazy(() => import("./pages/TarotMeanings.tsx"));
const TarotGuide = lazy(() => import("./pages/TarotGuide.tsx"));
const TarotCardMeaning = lazy(() => import("./pages/TarotCardMeaning.tsx"));
const TarotYesNo = lazy(() => import("./pages/TarotYesNo.tsx"));
const VerifyDivination = lazy(() => import("./pages/VerifyDivination.tsx"));
const VerifyDeliberation = lazy(() => import("./pages/VerifyDeliberation.tsx"));
const EnterpriseDeliberation = lazy(() => import("./pages/EnterpriseDeliberation.tsx"));
const DevnetRollup = lazy(() => import("./pages/DevnetRollup.tsx"));
const Lp = lazy(() => import("./pages/Lp.tsx"));
const FunnelDashboard = lazy(() => import("./pages/admin/FunnelDashboard.tsx"));
const AdminSettings = lazy(() => import("./pages/admin/Settings.tsx"));
const Status = lazy(() => import("./pages/Status.tsx"));
const OracleLanding = lazy(() => import("./pages/OracleLanding.tsx"));
const Learn = lazy(() => import("./pages/Learn.tsx"));
const LearnArticle = lazy(() => import("./pages/LearnArticle.tsx"));
const Gallery = lazy(() => import("./pages/Gallery.tsx"));
const ClaimTart = lazy(() => import("./pages/ClaimTart.tsx"));
const ClaimTartDetail = lazy(() => import("./pages/ClaimTartDetail.tsx"));
const ClaimAetx = lazy(() => import("./pages/ClaimAetx.tsx"));
const OracleCard = lazy(() => import("./pages/OracleCard.tsx"));
const ForceOracle = lazy(() => import("./pages/ForceOracle.tsx"));
const Chat = lazy(() => import("./pages/Chat.tsx"));
const Emf = lazy(() => import("./pages/Emf.tsx"));
const Divinations = lazy(() => import("./pages/Divinations.tsx"));
const Tokenomics = lazy(() => import("./pages/Tokenomics.tsx"));
const PuzzleSolver = lazy(() => import("./pages/PuzzleSolver.tsx"));
const Cosmic8Ball = lazy(() => import("./pages/Cosmic8Ball.tsx"));
const QuantumHunt = lazy(() => import("./pages/QuantumHunt.tsx"));
const NonHermitianLattice = lazy(() => import("./pages/NonHermitianLattice.tsx"));
const QuantumCaduceus = lazy(() => import("./pages/QuantumCaduceus.tsx"));
const QaiChipset = lazy(() => import("./pages/QaiChipset.tsx"));
const QuantumTimeLoop = lazy(() => import("./pages/QuantumTimeLoop.tsx"));
const WheelerBit = lazy(() => import("./pages/WheelerBit.tsx"));
const RetrocausalSeal = lazy(() => import("./pages/RetrocausalSeal.tsx"));
const HexagramTetrahedron = lazy(() => import("./pages/HexagramTetrahedron.tsx"));
const AethernetFusion = lazy(() => import("./pages/AethernetFusion.tsx"));
const UruuSpec = lazy(() => import("./pages/uruu/UruuSpec.tsx"));
const UruuExplorer = lazy(() => import("./pages/uruu/UruuExplorer.tsx"));
const UruuValidators = lazy(() => import("./pages/uruu/UruuValidators.tsx"));

const queryClient = new QueryClient();

const PIXEL_ROUTES = ["/lp", "/tarot", "/auth"];
function PixelGate() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (PIXEL_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      initPixels();
    }
  }, [pathname]);
  return null;
}

/** Minimal, theme-aware placeholder shown while a route chunk loads. */
function RouteFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PixelGate />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/aethernet" element={<AethernetFusion />} />
            <Route path="/uruu" element={<UruuSpec />} />
            <Route path="/uruu/explorer" element={<UruuExplorer />} />
            <Route path="/uruu/validators" element={<UruuValidators />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/mining" element={<Mining />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="/dreams" element={<Dreams />} />
            <Route path="/dreams/symbols" element={<DreamSymbolsIndex />} />
            <Route path="/dreams/symbols/:slug" element={<DreamSymbol />} />
            <Route path="/ai-dream-interpreter" element={<AiDreamInterpreter />} />
            <Route path="/tarot" element={<Tarot />} />
            <Route path="/tarot/yes-no" element={<TarotYesNo />} />
            <Route path="/tarot/meanings" element={<TarotMeanings />} />
            <Route path="/tarot/guide" element={<TarotGuide />} />
            <Route path="/tarot/meanings/:slug" element={<TarotCardMeaning />} />
            <Route path="/claim/tart" element={<ClaimTart />} />
            <Route path="/claim/tart/:id" element={<ClaimTartDetail />} />
            <Route path="/claim/aetx" element={<ClaimAetx />} />
            <Route path="/oracle-card" element={<OracleCard />} />
            <Route path="/emf" element={<Emf />} />
            <Route path="/verify" element={<VerifyDivination />} />
            <Route path="/verify/deliberation" element={<VerifyDeliberation />} />
            <Route path="/enterprise/deliberation" element={<EnterpriseDeliberation />} />
            <Route path="/rollup" element={<DevnetRollup />} />
            <Route path="/d/:token" element={<SharedDream />} />
            <Route path="/debug" element={<Debug />} />
            <Route path="/admin/audit" element={<AdminAudit />} />
            <Route path="/admin/funnel" element={<FunnelDashboard />} />
            <Route path="/admin/brc20" element={<AdminBrc20 />} />
            <Route path="/admin/btc-claims" element={<AdminBtcClaims />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/lp" element={<Lp />} />
            <Route path="/token/aetx" element={<TokenAetx />} />
            <Route path="/token/skynt" element={<TokenSkynt />} />
            <Route path="/token/wuruu" element={<TokenWuruu />} />
            <Route path="/token/uruu" element={<TokenUruu />} />
            <Route path="/token/lattice" element={<FairLattice />} />
            <Route path="/buy/uruu" element={<BuyUruu />} />
            <Route path="/embed/lattice" element={<EmbedLattice />} />
            <Route path="/tokenomics" element={<Tokenomics />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/legal" element={<LegalHub />} />
            <Route path="/aetherion" element={<MeetAetherion />} />
            <Route path="/bridge" element={<SphinxOSBridge />} />
            <Route path="/bridge/booty" element={<BridgeBootyDeploy />} />
            <Route path="/airdrop" element={<Airdrop />} />
            <Route path="/exs" element={<ExsTetraPow />} />
            <Route path="/camelot-fair" element={<CamelotFair />} />
            <Route path="/war-chest" element={<WarChest />} />
            <Route path="/overnight" element={<Overnight />} />
            <Route path="/black-pearl" element={<BlackPearl />} />
            <Route path="/mind-of-the-cosmos" element={<MindOfTheCosmos />} />
            <Route path="/live-ledger" element={<LiveMainnetLedger />} />
            <Route path="/wrap" element={<WrapLive />} />
            <Route path="/surprise" element={<SurpriseSeal />} />
            <Route path="/glyph" element={<WordGlyphPage />} />
            <Route path="/potential" element={<UnheardPotentialPage />} />
            <Route path="/genesis-loan" element={<GenesisLoanPage />} />
            <Route path="/bounty" element={<BountyBoard />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refund" element={<Refund />} />
            <Route path="/checkout/return" element={<CheckoutReturn />} />
            <Route path="/oracle" element={<AetherionOracle />} />
            <Route path="/dashboard" element={<OracleDashboard />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/oracle/:slug" element={<OracleLanding />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/learn/:slug" element={<LearnArticle />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/petition/:id" element={<PetitionPublic />} />
            <Route path="/status" element={<Status />} />
            <Route path="/lattice/force" element={<ForceOracle />} />
            <Route path="/lattice/nh" element={<NonHermitianLattice />} />
            <Route path="/lattice/caduceus" element={<QuantumCaduceus />} />
            <Route path="/caduceus/speculative" element={<RetrocausalSeal />} />
            <Route path="/caduceus/speculative/hexagram-tetra" element={<HexagramTetrahedron />} />
            <Route path="/chipset" element={<QaiChipset />} />
            <Route path="/lattice/loop" element={<QuantumTimeLoop />} />
            <Route path="/lattice/bit" element={<WheelerBit />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:threadId" element={<Chat />} />
            <Route path="/divinations" element={<Divinations />} />
            <Route path="/puzzle" element={<PuzzleSolver />} />
            <Route path="/oracle-8ball" element={<Cosmic8Ball />} />
            <Route path="/quantum-hunt" element={<QuantumHunt />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
