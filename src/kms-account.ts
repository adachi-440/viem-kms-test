import { Address, serializeSignature, SignTransactionReturnType, toAccount } from 'viem/accounts';

import { type Signer, Bytes } from '@cloud-cryptographic-wallet/signer';
import { getAddress, SignableMessage, Hex, hashMessage, fromBytes, TransactionSerializable, SerializeTransactionFn, serializeTransaction, keccak256, TypedData, TypedDataDefinition, HashTypedDataParameters, hashTypedData } from 'viem';

export interface SignerConfig {
  signer: Signer;
}

const getAccountAddress = async (signer: Signer): Promise<Address> => {
  const address = (await signer.getPublicKey()).toAddress();
  return getAddress(address.toString());
};

export const toKmsAccount = async (
  config: SignerConfig
) => {
  const signer = config.signer;
  const address = await getAccountAddress(signer);

  const signMessage = async ({
    message,
  }: {
    message: SignableMessage;
  }): Promise<Hex> => {
    const hash = Bytes.fromString(hashMessage(message));
    const signature = await signer.sign(hash);
    return serializeSignature({
      r: fromBytes(signature.r.asUint8Array, 'hex'),
      s: fromBytes(signature.s.asUint8Array, 'hex'),
      v: BigInt(signature.v),
    });
  };

  const signTransaction = async <
    TTransactionSerializable extends TransactionSerializable,
  >(
    transaction: TTransactionSerializable,
    args?: {
      serializer?: SerializeTransactionFn<TTransactionSerializable>;
    }
  ) => {
    if (!args?.serializer) {
      return signTransaction(transaction, {
        serializer: serializeTransaction,
      });
    }
    const serialized = args.serializer(transaction);
    const hash = keccak256(serialized);
    const signature = await signer.sign(Bytes.fromString(hash));
    const sig = {
      r: fromBytes(signature.r.asUint8Array, 'hex'),
      s: fromBytes(signature.s.asUint8Array, 'hex'),
      v: BigInt(signature.v),
    };
    return args.serializer(transaction, sig);
  };

  const signTypedData = async <T extends TypedData | Record<string, unknown>, P extends keyof T | "EIP712Domain" = keyof T>(
    parameters: TypedDataDefinition<T, P>
  ) => {
    const typedDataParam: HashTypedDataParameters<T, P> =
      parameters;
    const typedHash = hashTypedData(typedDataParam);
    const signature = await signer.sign(Bytes.fromString(typedHash));
    const sig = {
      r: fromBytes(signature.r.asUint8Array, 'hex'),
      s: fromBytes(signature.s.asUint8Array, 'hex'),
      v: BigInt(signature.v),
    };
    return serializeSignature(sig);
  };

  return toAccount({
    address,
    signMessage,
    signTransaction,
    signTypedData,
    publicKey: address
  });
};
