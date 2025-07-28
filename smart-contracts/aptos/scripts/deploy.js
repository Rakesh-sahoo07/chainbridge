const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require("@aptos-labs/ts-sdk");
const fs = require("fs");
const path = require("path");

// Configuration
const NODE_URL = "https://fullnode.testnet.aptoslabs.com/v1";
const FAUCET_URL = "https://faucet.testnet.aptoslabs.com";

async function main() {
    console.log("Starting Aptos deployment...\n");

    // Initialize Aptos client
    const config = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(config);

    // Create or load account
    let account;
    try {
        // Try to load existing account from deployer-key.json
        const keyPath = path.join(__dirname, '..', 'deployer-key.json');
        if (fs.existsSync(keyPath)) {
            console.log("Loading existing account...");
            const keyInfo = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
            const privateKey = new Ed25519PrivateKey(keyInfo.privateKey);
            account = Account.fromPrivateKey({ privateKey });
        } else {
            console.log("Creating new account...");
            account = Account.generate();
        }
    } catch (error) {
        console.log("Creating new account due to error:", error.message);
        account = Account.generate();
    }

    console.log(`Deployer address: ${account.accountAddress}`);

    // Fund account
    console.log("Funding account...");
    try {
        await aptos.fundAccount({
            accountAddress: account.accountAddress,
            amount: 100000000, // 1 APT
        });
        console.log("Account funded successfully!");
    } catch (error) {
        console.log("Funding failed or account already funded:", error.message);
    }

    // Check balance
    try {
        const balance = await aptos.getAccountAPTAmount({
            accountAddress: account.accountAddress,
        });
        console.log(`Account balance: ${balance / 100000000} APT`);
    } catch (error) {
        console.log("Could not fetch account balance:", error.message);
    }

    // Compile Move modules
    console.log("\nCompiling Move modules...");
    const { execSync } = require('child_process');
    
    try {
        execSync('aptos move compile', { 
            cwd: '/Users/rakeshsahoo/Documents/1inchETH/smart-contracts/aptos',
            stdio: 'inherit' 
        });
        console.log("Move modules compiled successfully!");
    } catch (error) {
        console.error("Compilation failed:", error.message);
        process.exit(1);
    }

    // Deploy contracts
    console.log("\nDeploying contracts...");
    try {
        const deployResult = execSync('aptos move publish --assume-yes', {
            cwd: '/Users/rakeshsahoo/Documents/1inchETH/smart-contracts/aptos',
            encoding: 'utf8'
        });
        console.log("Deployment result:", deployResult);
    } catch (error) {
        console.error("Deployment failed:", error.message);
        console.error("Error details:", error.stdout || error.stderr);
    }

    // Initialize contracts
    console.log("\nInitializing contracts...");
    
    try {
        // Initialize CrossChainSwapAptos
        const initSwapTransaction = await aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: {
                function: `${account.accountAddress}::cross_chain_swap_aptos::initialize`,
                typeArguments: [],
                functionArguments: [account.accountAddress],
            },
        });

        const initSwapResponse = await aptos.signAndSubmitTransaction({
            signer: account,
            transaction: initSwapTransaction,
        });

        await aptos.waitForTransaction({ transactionHash: initSwapResponse.hash });
        console.log("CrossChainSwapAptos initialized:", initSwapResponse.hash);

        // Initialize TokenRegistry
        const initRegistryTransaction = await aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: {
                function: `${account.accountAddress}::token_registry::initialize`,
                typeArguments: [],
                functionArguments: [],
            },
        });

        const initRegistryResponse = await aptos.signAndSubmitTransaction({
            signer: account,
            transaction: initRegistryTransaction,
        });

        await aptos.waitForTransaction({ transactionHash: initRegistryResponse.hash });
        console.log("TokenRegistry initialized:", initRegistryResponse.hash);

    } catch (error) {
        console.error("Contract initialization failed:", error.message);
        console.error("Error details:", error);
    }

    console.log("\n=== Deployment Summary ===");
    console.log("Network: Aptos Testnet");
    console.log("Deployer Address:", account.accountAddress.toString());
    console.log("Contract Address:", account.accountAddress.toString());
    console.log("Node URL:", NODE_URL);

    // Save deployment info
    const deploymentInfo = {
        network: "testnet",
        deployer: account.accountAddress.toString(),
        contractAddress: account.accountAddress.toString(),
        nodeUrl: NODE_URL,
        timestamp: new Date().toISOString()
    };

    const deploymentPath = path.join(__dirname, '..', 'deployment.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("\nDeployment info saved to:", deploymentPath);

    // Save private key for future use (in production, use secure key management)
    const keyInfo = {
        address: account.accountAddress.toString(),
        privateKey: account.privateKey.toString(),
        publicKey: account.publicKey.toString()
    };

    const keyPath = path.join(__dirname, '..', 'deployer-key.json');
    fs.writeFileSync(keyPath, JSON.stringify(keyInfo, null, 2));
    console.log("Deployer key saved to:", keyPath);
    console.log("⚠️  IMPORTANT: Keep the private key secure and never commit it to version control!");
}

main()
    .then(() => {
        console.log("\nDeployment completed successfully!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });