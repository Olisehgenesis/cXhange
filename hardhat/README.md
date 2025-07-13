# Celo Composer | Hardhat

## How to use

1. Create a copy of `.env.example` and rename it to `.env`.

   1. For the **smart contract deployment** you will need the `PRIVATE_KEY` set in `.env`. **Never** use a wallet with real funds for development. Always have a separate wallet for testing. 
   2. For the **smart contract verification** you will need a [Celoscan API Key](https://celoscan.io/myapikey) `CELOSCAN_API_KEY` set in `.env`.

2. Compile the contract 

```bash
npx hardhat compile
```

3. Deploy the contract

Make sure your wallet is funded when deploying to testnet or mainnet. You can get test tokens for deploying it on Alfajores from the [Celo Faucet](https://faucet.celo.org/alfajores).

```bash
npx hardhat ignition deploy ./ignition/modules/Lock.ts --network <network-name>
```

On Alfajores

```bash
npx hardhat ignition deploy ./ignition/modules/Lock.ts --network alfajores
```


On Celo Mainnet

```bash
npx hardhat ignition deploy ./ignition/modules/Lock.ts --network celo
```

4. Verify the contract

For Alfajores (Testnet) Verification

```bash
npx hardhat verify <CONTRACT_ADDRESS>  <CONSTRUCTOR_ARGS> --network alfajores
```

For the Lock.sol contract that could look like this:

```bash
npx hardhat verify 0x756Af13eafF4Ef0D9e294222F9A922226567C39e 1893456000  --network alfajores
```

For Celo Mainnet Verification

```bash
npx hardhat verify <CONTRACT_ADDRESS>  <CONSTRUCTOR_ARGS> --network celo
```

Check the file `hardhat.config.js` for Celo specific hardhat configuration.

5. ABI Synchronization


The project includes automatic ABI synchronization with your React frontend. ABIs are synced to `../react-app/src/abis/` during compilation.

- **Automatic Syncing**:
  - The ABIs only sync automatically when you run:
    ```bash
    yarn compile
    ```
    or
    ```bash
    npm run compile
    ```

- **Manual Syncing**:
  - To sync ABIs manually without compilation:
    - With npm:
      ```bash
      npm run sync:abis
      ```
    - With Yarn:
      ```bash
      yarn sync:abis
      ```

##### Configuration
- The sync script (`sync-abis.js`) is made executable automatically during `npm install` or `yarn install` by the `postinstall` hook in `package.json`.
- **To disable automatic syncing**, remove the `sync-abis.js` call from the `compile` script in `package.json`. This configuration provides a flexible and consistent workflow for both `yarn` and `npm` users.

## cXchange v4 Deployment

### Prerequisites

1. Set up your `.env` file with the following variables:
   ```bash
   PRIVATE_KEY=your_private_key_here
   CELOSCAN_API_KEY=your_celoscan_api_key_here
   MENTO_BROKER=mento_broker_contract_address
   BI_POOL_MANAGER=bi_pool_manager_contract_address
   ```

2. Make sure your wallet is funded with test tokens for Alfajores deployment.

### Deployment Steps

1. **Compile the contracts**:
   ```bash
   npm run compile
   ```

2. **Deploy cXchange v4**:
   ```bash
   npm run deploy:testnet:v4
   ```

3. **Add the contract address to your .env file**:
   ```bash
   CONTRACT_ADDRESS_V4=deployed_contract_address
   ```

4. **Verify the contract on CeloScan**:
   ```bash
   npm run verify:testnet:v4
   ```

5. **Set up the contract (discover and add all Mento assets)**:
   ```bash
   npm run setup:cxchange:testnet:v4
   ```

6. **Test the deployment**:
   ```bash
   npm run test:cxchange:testnet:v4
   ```

### Available Scripts

- `deploy:testnet:v4` - Deploy cXchange v4 to Alfajores testnet
- `verify:testnet:v4` - Verify the deployed contract on CeloScan
- `setup:cxchange:testnet:v4` - Automatically discover and add all Mento assets
- `test:cxchange:testnet:v4` - Run comprehensive tests on the deployed contract

### Key Features of cXchange v4

- **Streamlined Design**: Simplified architecture focused on Mento protocol integration
- **Auto-Discovery**: Automatically discovers and adds all available Mento trading pairs
- **Professional Fee Management**: Configurable protocol fees with comprehensive tracking
- **Security**: Reentrancy protection and multi-level access controls
- **Statistics**: Comprehensive trading analytics and volume tracking
- **Gas Efficient**: Optimized for cost-effective operations

### Contract Architecture

cXchange v4 is built with the following key components:
- **Mento Integration**: Routes all trades through the Mento protocol
- **BiPool Manager**: Manages exchange providers and trading pairs
- **Fee System**: Professional fee collection and management
- **Access Control**: Super admin and contract admin roles
- **Statistics**: Real-time trading data and analytics
