import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const cXchangeModule = buildModule("cXchangeModule", (m) => {
  // Configuration parameters for Alfajores testnet
  const mentoTokenBroker = m.getParameter("mentoTokenBroker", "0x0000000000000000000000000000000000000000"); // Replace with actual broker address
  const priceFeedOracle = m.getParameter("priceFeedOracle", "0x0000000000000000000000000000000000000000"); // Replace with actual oracle address
  const baseToken = m.getParameter("baseToken", "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"); // cUSD on Alfajores

  const cXchange = m.contract("cXchange", [
    mentoTokenBroker,
    priceFeedOracle,
    baseToken
  ]);

  return { cXchange };
});

export default cXchangeModule; 