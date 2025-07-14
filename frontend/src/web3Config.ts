import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { cookieStorage, createStorage } from "wagmi";
import { celo, celoAlfajores } from "wagmi/chains";

export const projectId = "2b3ec305529b70c69c1d2345b9939f0e"; // TODO: Replace with your WalletConnect Project ID

const metadata = {
  name: "MiloFX",
  description: "MiloFX Trading Platform",
  url: "https://milofx.xyz",
  icons: ["/milofx-favicon.svg"],
};

export const wagmiConfig = defaultWagmiConfig({
  chains: [celo, celoAlfajores],
  projectId,
  metadata,
  storage: createStorage({ storage: cookieStorage }),
}); 