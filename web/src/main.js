import EthereumProvider from "@walletconnect/ethereum-provider";
import { BrowserProvider, ContractFactory } from "ethers";
import artifact from "../../artifacts/contracts/MurphysLawToken.sol/MurphysLawToken.json";
import "./style.css";

const ETHEREUM_CHAIN_ID = 1n;
const PROJECT_ID_STORAGE_KEY = "osht-walletconnect-project-id";

const projectIdInput = document.querySelector("#project-id");
const connectButton = document.querySelector("#connect-button");
const injectedConnectButton = document.querySelector("#injected-connect-button");
const deployButton = document.querySelector("#deploy-button");
const acknowledgeInput = document.querySelector("#acknowledge");
const connectionState = document.querySelector("#connection-state");
const walletDetails = document.querySelector("#wallet-details");
const walletAddressElement = document.querySelector("#wallet-address");
const walletNetworkElement = document.querySelector("#wallet-network");
const ownerMatchElement = document.querySelector("#owner-match");
const statusMessage = document.querySelector("#status-message");
const deploymentResult = document.querySelector("#deployment-result");

let walletConnectProvider;
let activeWalletProvider;
let browserProvider;
let connectedAddress;
let connectedChainId;
let isDeploying = false;

projectIdInput.value = localStorage.getItem(PROJECT_ID_STORAGE_KEY) || "";
projectIdInput.addEventListener("input", () => {
  localStorage.setItem(PROJECT_ID_STORAGE_KEY, projectIdInput.value.trim());
  updateControls();
});
acknowledgeInput.addEventListener("change", updateControls);
connectButton.addEventListener("click", handleWalletButton);
injectedConnectButton.addEventListener("click", connectInjectedWallet);
deployButton.addEventListener("click", deployContract);

function updateControls() {
  const isConnectedToEthereum = Boolean(connectedAddress && connectedChainId === ETHEREUM_CHAIN_ID);
  deployButton.disabled = !isConnectedToEthereum || !acknowledgeInput.checked || isDeploying;
  connectButton.textContent = connectedAddress ? "Disconnect wallet" : "Connect with WalletConnect";
  connectButton.disabled = isDeploying;
  injectedConnectButton.hidden = !getInjectedProvider();
  injectedConnectButton.disabled = Boolean(connectedAddress) || isDeploying;
  connectionState.textContent = connectedAddress ? "CONNECTED" : "NOT CONNECTED";
  connectionState.classList.toggle("state-connected", Boolean(connectedAddress));
}

function getInjectedProvider() {
  const injectedProvider = window.ethereum;
  if (!injectedProvider) return undefined;
  if (Array.isArray(injectedProvider.providers)) {
    return injectedProvider.providers.find((provider) => provider.isCoinbaseWallet || provider.isBaseWallet) || injectedProvider;
  }
  return injectedProvider;
}

function setStatus(message, kind = "") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${kind}`.trim();
}

function updateWalletDetails() {
  const isConnected = Boolean(connectedAddress);
  walletDetails.hidden = !isConnected;
  if (!isConnected) {
    walletAddressElement.textContent = "-";
    walletNetworkElement.textContent = "-";
    ownerMatchElement.hidden = true;
    return;
  }

  walletAddressElement.textContent = `${connectedAddress.slice(0, 8)}...${connectedAddress.slice(-6)}`;
  walletAddressElement.title = connectedAddress;
  walletNetworkElement.textContent = connectedChainId === ETHEREUM_CHAIN_ID ? "Ethereum Mainnet" : `Chain ${connectedChainId}`;

  ownerMatchElement.hidden = false;
  ownerMatchElement.textContent = "Connected wallet will own the deployed contract.";
  ownerMatchElement.classList.remove("owner-match-warning");
}

function resetWallet() {
  if (activeWalletProvider?.removeListener) {
    activeWalletProvider.removeListener("accountsChanged", handleAccountsChanged);
    activeWalletProvider.removeListener("chainChanged", handleChainChanged);
    activeWalletProvider.removeListener("disconnect", handleProviderDisconnect);
  }
  connectedAddress = undefined;
  connectedChainId = undefined;
  activeWalletProvider = undefined;
  browserProvider = undefined;
  walletConnectProvider = undefined;
  updateWalletDetails();
  updateControls();
}

async function handleWalletButton() {
  if (connectedAddress) {
    await disconnectWallet();
    return;
  }

  const projectId = projectIdInput.value.trim();
  if (!projectId) {
    setStatus("Enter a WalletConnect project ID first.", "status-error");
    projectIdInput.focus();
    return;
  }

  connectButton.disabled = true;
  setStatus("Waiting for wallet connection...");
  try {
    walletConnectProvider = await EthereumProvider.init({
      projectId,
      chains: [Number(ETHEREUM_CHAIN_ID)],
      showQrModal: true,
      metadata: {
        name: "OSHT Ethereum Mainnet Deployment",
        description: "Wallet-connected deployment for Murphy's Law Token",
        url: window.location.origin,
        icons: [],
      },
    });

    activeWalletProvider = walletConnectProvider;
    addWalletListeners(activeWalletProvider);

    await walletConnectProvider.connect();
    browserProvider = new BrowserProvider(walletConnectProvider, "any");
    const [address] = await walletConnectProvider.request({ method: "eth_accounts" });
    if (!address) throw new Error("The wallet did not provide an account.");

    connectedAddress = address;
    connectedChainId = BigInt(await walletConnectProvider.request({ method: "eth_chainId" }));
    updateWalletDetails();
    updateControls();

    if (connectedChainId !== ETHEREUM_CHAIN_ID) {
      setStatus("Switch your wallet to Ethereum Mainnet (chain ID 1) before deploying.", "status-error");
    } else {
      setStatus("Wallet connected to Ethereum Mainnet.", "status-success");
    }
  } catch (error) {
    resetWallet();
    setStatus(error.message || "Wallet connection failed.", "status-error");
  } finally {
    connectButton.disabled = false;
  }
}

async function connectInjectedWallet() {
  const injectedProvider = getInjectedProvider();
  if (!injectedProvider) {
    setStatus("Open this page inside a wallet browser to connect without WalletConnect.", "status-error");
    return;
  }

  injectedConnectButton.disabled = true;
  setStatus("Approve the connection in your wallet...");
  try {
    activeWalletProvider = injectedProvider;
    addWalletListeners(activeWalletProvider);
    const accounts = await activeWalletProvider.request({ method: "eth_requestAccounts" });
    if (!accounts.length) throw new Error("The wallet did not provide an account.");

    browserProvider = new BrowserProvider(activeWalletProvider, "any");
    connectedAddress = accounts[0];
    connectedChainId = BigInt(await activeWalletProvider.request({ method: "eth_chainId" }));
    updateWalletDetails();
    updateControls();

    if (connectedChainId !== ETHEREUM_CHAIN_ID) {
      setStatus("Switch your wallet to Ethereum Mainnet (chain ID 1) before deploying.", "status-error");
    } else {
      setStatus("Wallet connected to Ethereum Mainnet.", "status-success");
    }
  } catch (error) {
    resetWallet();
    setStatus(error.message || "Wallet connection failed.", "status-error");
  } finally {
    injectedConnectButton.disabled = false;
  }
}

function addWalletListeners(provider) {
  provider.on("accountsChanged", handleAccountsChanged);
  provider.on("chainChanged", handleChainChanged);
  provider.on("disconnect", handleProviderDisconnect);
}

async function disconnectWallet() {
  const provider = walletConnectProvider;
  if (provider) {
    await provider.disconnect();
  }
  resetWallet();
  setStatus("Wallet disconnected.");
}

function handleProviderDisconnect() {
  resetWallet();
  setStatus("Wallet disconnected.");
}

async function handleAccountsChanged(accounts) {
  if (!accounts.length) {
    resetWallet();
    setStatus("Wallet disconnected.");
    return;
  }
  connectedAddress = accounts[0];
  updateWalletDetails();
  updateControls();
}

function handleChainChanged(chainId) {
  connectedChainId = BigInt(chainId);
  updateWalletDetails();
  updateControls();
  setStatus(
    connectedChainId === ETHEREUM_CHAIN_ID
      ? "Wallet connected to Ethereum Mainnet."
      : "Switch your wallet to Ethereum Mainnet (chain ID 1) before deploying.",
    connectedChainId === ETHEREUM_CHAIN_ID ? "status-success" : "status-error",
  );
}

async function deployContract() {
  if (!browserProvider || !connectedAddress || connectedChainId !== ETHEREUM_CHAIN_ID) {
    setStatus("Connect a wallet on Ethereum Mainnet before deploying.", "status-error");
    return;
  }

  isDeploying = true;
  deploymentResult.hidden = true;
  updateControls();
  setStatus("Confirm the deployment transaction in your wallet.");

  try {
    const network = await browserProvider.getNetwork();
    if (network.chainId !== ETHEREUM_CHAIN_ID) throw new Error("Wallet network changed. Reconnect to Ethereum Mainnet.");

    const signer = await browserProvider.getSigner(connectedAddress);
    const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
    const contract = await factory.deploy();
    const transaction = contract.deploymentTransaction();
    if (!transaction) throw new Error("Wallet did not return a deployment transaction.");

    const txLink = `https://etherscan.io/tx/${transaction.hash}`;
    deploymentResult.replaceChildren();
    const txLabel = document.createElement("span");
    txLabel.textContent = "TRANSACTION";
    const txAnchor = document.createElement("a");
    txAnchor.href = txLink;
    txAnchor.target = "_blank";
    txAnchor.rel = "noopener noreferrer";
    txAnchor.textContent = `${transaction.hash.slice(0, 12)}...${transaction.hash.slice(-8)}`;
    deploymentResult.append(txLabel, txAnchor);
    deploymentResult.hidden = false;
    setStatus("Transaction submitted. Waiting for Ethereum confirmation...");

    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    const addressLabel = document.createElement("span");
    addressLabel.textContent = "CONTRACT";
    const addressAnchor = document.createElement("a");
    addressAnchor.href = `https://etherscan.io/address/${contractAddress}`;
    addressAnchor.target = "_blank";
    addressAnchor.rel = "noopener noreferrer";
    addressAnchor.textContent = contractAddress;
    deploymentResult.append(addressLabel, addressAnchor);
    setStatus("Deployment confirmed on Ethereum Mainnet.", "status-success");
  } catch (error) {
    setStatus(error.message || "Deployment failed.", "status-error");
  } finally {
    isDeploying = false;
    updateControls();
  }
}

updateControls();