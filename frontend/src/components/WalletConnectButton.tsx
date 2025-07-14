import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useAccount } from "wagmi";
import { Wallet } from "lucide-react";
import { useState } from "react";
import WalletDialog from "./WalletDialog";

function truncateAddress(address: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
}

export default function WalletConnectButton() {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => (isConnected ? setDialogOpen(true) : open())}
        className={`flex items-center space-x-2 px-3 py-2 rounded-milo font-outfit font-medium transition-all duration-200 text-sm ${isConnected ? 'bg-sand-200 text-sand-800 border border-sand-500' : 'bg-forest-500 text-white shadow-milo hover:bg-forest-600'}`}
      >
        <Wallet className="w-4 h-4" />
        <span>{isConnected && address ? truncateAddress(address) : 'Connect Wallet'}</span>
      </button>
      <WalletDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
} 