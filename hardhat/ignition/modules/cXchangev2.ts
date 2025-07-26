import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
//get variables from .env
import dotenv from 'dotenv';
dotenv.config();

const cXchangev2Module = buildModule("cXchangev2Module", (m) => {
  // Mento Alfajores addresses
  const mentoTokenBroker = m.getParameter("mentoTokenBroker", "0xD3Dff18E465bCa6241A244144765b4421Ac14D09");
  const baseToken = m.getParameter("baseToken", "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"); // cUSD

  const cXchangev2 = m.contract("cXchangev2", [
    mentoTokenBroker,
    baseToken
  ]);

  return { cXchangev2 };
});

export default cXchangev2Module;