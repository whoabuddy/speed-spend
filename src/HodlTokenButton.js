import React, { useRef, useState, useEffect } from 'react';

import {
  fetchAccount,
  txIdToStatus,
  CONTRACT_ADDRESS,
  HODL_TOKEN_CONTRACT,
  fetchSpendableTokenBalance,
} from './StacksAccount';
import { useConnect } from '@blockstack/connect';
import {
  uintCV,
  PostConditionMode,
  makeContractFungiblePostCondition,
  FungibleConditionCode,
  createAssetInfo,
  makeStandardFungiblePostCondition,
} from '@blockstack/stacks-transactions';
const BigNum = require('bn.js');

export function HodlTokenButton({ title, path, placeholder, ownerStxAddress }) {
  const { doContractCall } = useConnect();
  const textfield = useRef();
  const spinner = useRef();
  const [status, setStatus] = useState();

  useEffect(() => {
    fetchAccount(ownerStxAddress)
      .catch(e => {
        setStatus('Failed to access your account', e);
        console.log(e);
      })
      .then(async acc => {
        console.log({ acc });
      });
  }, [ownerStxAddress]);

  const sendAction = async () => {
    spinner.current.classList.remove('d-none');

    var amountAsString = textfield.current.value.trim();
    var amount = parseInt(amountAsString);

    // check balance
    const acc = await fetchSpendableTokenBalance(ownerStxAddress);
    const balance = acc ? parseInt(acc.balance, 16) : 0;
    if (balance < amount) {
      setStatus(`Your balance is below ${amount} uSTX`);
      spinner.current.classList.add('d-none');
      return;
    }

    try {
      setStatus(`Sending transaction`);

      await doContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: HODL_TOKEN_CONTRACT,
        functionName: 'hodl',
        functionArgs: [uintCV(amount)],
        postConditionMode: PostConditionMode.Allow,
        postConditions: [
          makeStandardFungiblePostCondition(
            ownerStxAddress,
            FungibleConditionCode.LessEqual,
            new BigNum(amount),
            new createAssetInfo(CONTRACT_ADDRESS, HODL_TOKEN_CONTRACT, 'spendable-token')
          ),
          makeContractFungiblePostCondition(
            CONTRACT_ADDRESS,
            HODL_TOKEN_CONTRACT,
            FungibleConditionCode.LessEqual,
            new BigNum(amount),
            new createAssetInfo(CONTRACT_ADDRESS, HODL_TOKEN_CONTRACT, 'hodl-token')
          ),
        ],
        appDetails: {
          name: 'Speed Spend',
          icon: 'https://speed-spend.netlify.app/speedspend.png',
        },
        finished: data => {
          console.log(data);
          setStatus(txIdToStatus(data.txId));
          spinner.current.classList.add('d-none');
        },
      });
    } catch (e) {
      console.log(e);
      setStatus(e.toString());
      spinner.current.classList.add('d-none');
    }
  };

  return (
    <div>
      Hodl tokens (make them not spendable)
      <div className="NoteField input-group ">
        <input
          type="decimal"
          ref={textfield}
          className="form-control"
          defaultValue={''}
          placeholder={placeholder}
          onKeyUp={e => {
            if (e.key === 'Enter') sendAction();
          }}
          onBlur={e => {
            setStatus(undefined);
          }}
        />
        <div className="input-group-append">
          <button className="btn btn-outline-secondary" type="button" onClick={sendAction}>
            <div
              ref={spinner}
              role="status"
              className="d-none spinner-border spinner-border-sm text-info align-text-top mr-2"
            />
            Hodl
          </button>
        </div>
      </div>
      {status && (
        <>
          <div>{status}</div>
        </>
      )}
    </div>
  );
}
