#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function main() {
  const RPC = process.env.RPC_URL || 'http://127.0.0.1:8545';
  const NEXT_URL = process.env.NEXT_URL || 'http://localhost:3000/debug';

  const provider = new ethers.providers.JsonRpcProvider(RPC);

  // read deployments to find factory address for chain 31337 or current chain
  let factoryAddress = null;
  const deploymentsPath = path.join(__dirname, '..', 'packages', 'foundry', 'deployments', '31337.json');
  if (fs.existsSync(deploymentsPath)) {
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    const factoryName = Object.keys(deployments).find(k => k.toLowerCase().includes('factory'));
    if (factoryName) {
      factoryAddress = deployments[factoryName].address;
      console.log('Found factory in foundry deployments:', factoryName, factoryAddress);
    }
  }

  // Fallback: parse the nextjs deployedContracts.ts generated file for FactoryContract address
  if (!factoryAddress) {
    const dcPath = path.join(__dirname, '..', 'packages', 'nextjs', 'contracts', 'deployedContracts.ts');
    if (fs.existsSync(dcPath)) {
      const dcRaw = fs.readFileSync(dcPath, 'utf8');
      const m = dcRaw.match(/FactoryContract:\s*\{[\s\S]*?address:\s*"(0x[0-9a-fA-F]{40})"/);
      if (m) {
        factoryAddress = m[1];
        console.log('Found FactoryContract in deployedContracts.ts:', factoryAddress);
      }
    }
  }

  if (!factoryAddress) {
    console.error('No factory address found in deployments or deployedContracts.ts');
    process.exit(1);
  }

  // load Factory ABI
  const factoryJsonPath = path.join(__dirname, '..', 'packages', 'foundry', 'out', 'FactoryContract.sol', 'FactoryContract.json');
  if (!fs.existsSync(factoryJsonPath)) {
    console.error('Factory ABI not found:', factoryJsonPath);
    process.exit(1);
  }
  const factoryJson = JSON.parse(fs.readFileSync(factoryJsonPath, 'utf8'));
  const factoryAbi = factoryJson.abi;

  // Prepare filter for MarketplaceDeployed
  const iface = new ethers.utils.Interface(factoryAbi);
  const eventFragment = Object.values(iface.events).find(e => e.name === 'MarketplaceDeployed');
  if (!eventFragment) {
    console.error('MarketplaceDeployed event not found in factory ABI');
    process.exit(1);
  }
  const topic = iface.getEventTopic('MarketplaceDeployed');
  console.log('Event topic:', topic);

  const logs = await provider.getLogs({ address: factoryAddress, topics: [topic] });
  if (!logs || logs.length === 0) {
    console.log('No MarketplaceDeployed logs found for factory at', factoryAddress);
  } else {
    console.log('Found', logs.length, 'MarketplaceDeployed logs');
  }

  // Decode logs
  const dynamic = {};
  const chainId = String((await provider.getNetwork()).chainId || 31337);
  dynamic[chainId] = {};
  for (const log of logs) {
    try {
      const parsed = iface.parseLog(log);
      const marketplace = parsed.args.marketplace || parsed.args[0];
      const generatedName = `MarketplaceInstance_${String(marketplace).slice(2,8)}`;
      // load Marketplace ABI
      const miJsonPath = path.join(__dirname, '..', 'packages', 'foundry', 'out', 'MarketplaceInstance.sol', 'MarketplaceInstance.json');
      let miAbi = [];
      if (fs.existsSync(miJsonPath)) {
        const miJson = JSON.parse(fs.readFileSync(miJsonPath, 'utf8'));
        miAbi = miJson.abi;
      }
      dynamic[chainId][generatedName] = { address: marketplace, abi: miAbi, deployedOnBlock: log.blockNumber };
      console.log('Prepared dynamic entry', generatedName, marketplace);
    } catch (e) {
      console.warn('Failed to parse log', e);
    }
  }

  // Print instructions and the serialized dynamic JSON for manual injection into the browser console
  const serialized = JSON.stringify(dynamic, null, 2);
  console.log('\n--- dynamic registry JSON ---\n');
  console.log(serialized);
  console.log('\n--- end dynamic registry JSON ---\n');
  console.log('To register these entries in your browser console on the Debug page run:');
  console.log("sessionStorage.setItem('scaffoldEth2.dynamicContracts', `" + serialized.replace(/`/g, '\\`') + "`);\nwindow.dispatchEvent(new Event('scaffoldEth2:dynamicContractsUpdated'));\n");
}

main().catch(e => { console.error(e); process.exit(1); });
