import { AwsKmsSigner } from "@cloud-cryptographic-wallet/aws-kms-signer";
import * as dotenv from "dotenv";
import { toKmsAccount } from "../src/kms-account";
import { createWalletClient, http, TypedDataDefinition } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

dotenv.config();

const main = async () => {
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`
  if (!privateKey) {
    throw new Error("PRIVATE_KEY is not set")
  }
  const kmsKeyId = process.env.KMS_KEY_ID
  if (!kmsKeyId) {
    throw new Error("KMS_KEY_ID is not set")
  }

  const kmsSigner = new AwsKmsSigner(kmsKeyId)
  const kmsAccount = await toKmsAccount({ signer: kmsSigner })

  const privateKeyAccount = privateKeyToAccount(privateKey)

  const kmsWalletClient = createWalletClient({
    account: kmsAccount,
    chain: arbitrumSepolia,
    transport: http(),
  })

  const privateKeyWalletClient = createWalletClient({
    account: privateKeyAccount,
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

  const start = Date.now()
  await kmsWalletClient.signTypedData(typedData)
  const end = Date.now()
  console.log(`KMS: ${end - start}ms`)

  const start2 = Date.now()
  await privateKeyWalletClient.signTypedData(typedData)
  const end2 = Date.now()
  console.log(`Private Key: ${end2 - start2}ms`)
}

main()
