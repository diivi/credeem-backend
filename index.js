import * as nearAPI from "near-api-js";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import {inspect} from "util";
dotenv.config();

const { connect, keyStores, KeyPair, Contract } = nearAPI;
const app = express();
app.use(express.json());

// store all businesses and their tokens in memory
const businesses_and_tokens = {};

// connect to near with an in-memory keystore
const myKeyStore = new keyStores.InMemoryKeyStore();
const PRIVATE_KEY = process.env.PRIVATE_KEY;
// creates a public / private key pair using the provided private key
const keyPair = KeyPair.fromString(PRIVATE_KEY);
// adds the keyPair you created to keyStore
await myKeyStore.setKey("testnet", "divy4n5h.testnet", keyPair);

const connectionConfig = {
  networkId: "testnet",
  keyStore: myKeyStore,
  nodeUrl: "https://rpc.testnet.near.org",
  walletUrl: "https://wallet.testnet.near.org",
  helperUrl: "https://helper.testnet.near.org",
  explorerUrl: "https://explorer.testnet.near.org",
};

const nearConnection = await connect(connectionConfig);

const mainAccountName = "divy4n5h"
const mainAccount = await nearConnection.account(`${mainAccountName}.testnet`);

app.get("/ping", async (req, res) => {
  res.send("pong");
});

app.post("/business/create", async (req, res) => {
  // create a sub account for the business. These subaccounts will have tokens associated with them.
  console.log(req.body)
  const { businessName } = req.body;
  const businessAccountName = `${businessName}.${mainAccountName}.testnet`;
  try{
    await mainAccount.createAccount(businessAccountName, keyPair.publicKey, "3000000000000000000000000");
    // add private key to keystore
    await myKeyStore.setKey("testnet", businessAccountName, keyPair);
  } catch (e) {
    return res.status(400).send("Account already exists");
  }

  // create a token contract for the business
  const businessAccount = await nearConnection.account(businessAccountName);
  try{
    await businessAccount.deployContract(
      fs.readFileSync("./contracts/fungible_token.wasm"),
    );
  } catch (e) {
    return res.status(400).send("Contract deployment failed");
  }

  // create a token for the business
  const symbolName = businessName.substring(0, 3).toUpperCase();
  try {
    const businessTokenContract = new Contract(
      businessAccount,
      businessAccountName,
      {
        changeMethods: ["ft_transfer", "ft_transfer_call", "new"],
        viewMethods: ["ft_balance_of", "ft_total_supply"],
      },
    );
    await businessTokenContract.new({
      owner_id: businessAccountName,
      total_supply: "1000000000000000000000000",
      metadata: {
        spec: "ft-1.0.0",
        name: `${businessName} Credits`,
        symbol: symbolName,
        decimals: 8,
      },
    });
  } catch (e) {
    console.log(e)
    return res.status(400).send("Token creation failed");
  }
  
  // store the business name and token in memory
  businesses_and_tokens[businessName] = symbolName;
  return res.status(200).json({businessName, symbolName});
});

app.listen(3000, () => {
  console.log("server started");
});
