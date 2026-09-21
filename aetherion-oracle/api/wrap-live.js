/**
 * Wrap status — WETH is a live mainnet contract. URUU custody wrap is not.
 */
const L1_WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const URUU = "0x5B6C9d85465Cc6FFe84039183872239657D90208";
const DIAMOND = "0x32400084C286CF3E17e7B677ea9583e60c1ace52";

export default async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).send(JSON.stringify({ error: "method" }));
    return;
  }
  res.status(200).send(
    JSON.stringify({
      kind: "wrap-live",
      weth: { live: true, l1: L1_WETH },
      mailbox: { protocolLive: true, diamond: DIAMOND },
      uruu: { address: URUU, custodyWrapLive: false, wrapStatus: "Not live" },
      honesty: {
        wethWrapLive: true,
        uruuCustodyWrapLive: false,
        doesNotMint137Eth: true,
        doesNotMintWuruu: true,
      },
    }),
  );
}
