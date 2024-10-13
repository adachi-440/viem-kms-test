import { AwsKmsSigner } from "@cloud-cryptographic-wallet/aws-kms-signer";
import * as dotenv from "dotenv";
import { toKmsAccount } from "./kms-account";
import { createWalletClient, http, parseEther, TypedDataDefinition } from "viem";
import { arbitrumSepolia } from "viem/chains";

dotenv.config();

async function main() {
  const keyId = process.env.KMS_KEY_ID;
  if (!keyId) {
    throw new Error("KMS_KEY_ID is not set");
  }
  const signer = new AwsKmsSigner(keyId);
  const kmsAccount = await toKmsAccount({ signer });

  const walletClient = createWalletClient({
    account: kmsAccount,
    chain: arbitrumSepolia,
    transport: http(),
  })

  const typedData: TypedDataDefinition = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Person: [
        { name: 'name', type: 'string' },
        { name: 'wallet', type: 'address' },
      ],
      Mail: [
        { name: 'from', type: 'Person' },
        { name: 'to', type: 'Person' },
        { name: 'contents', type: 'string' },
      ],
    },
    primaryType: 'Mail',
    domain: {
      name: 'Ether Mail',
      version: '1',
      chainId: 1,
      verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
    },
    message: {
      from: {
        name: 'Cow',
        wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
      },
      to: {
        name: 'Bob',
        wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
      },
      contents: 'Hello, Bob!',
    },
  };
  const signature = await walletClient.signTypedData(typedData);
  console.log(signature);

  const tx = await walletClient.sendTransaction({
    to: "0x1aaaeb006AC4DE12C4630BB44ED00A764f37bef8",
    value: parseEther("0.0001"),
  });

  console.log(tx);
}

main().catch((e) => console.error(e));
