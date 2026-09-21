#!/usr/bin/env node
/** URUU is live on zkSync Era. WETH wrap is live. URUU→wURUU is not. */
console.log(
  JSON.stringify(
    {
      token: "URUU",
      chain: "zkSync Era",
      chainId: 324,
      address: "0x5B6C9d85465Cc6FFe84039183872239657D90208",
      buy: "https://www.excaliburcrypto.com/buy/uruu",
      wrap: "https://www.excaliburcrypto.com/wrap",
      wethWrap: "live",
      uruuCustodyWrap: "not-live",
      curve: "calculator-only",
    },
    null,
    2,
  ),
);
