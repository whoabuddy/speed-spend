import React, { useRef, useState, useEffect } from 'react';

import {
  fetchAccount,
  txIdToStatus,
  CONTRACT_ADDRESS,
  HODL_TOKEN_CONTRACT,
  fetchHodlTokenBalance,
} from './StacksAccount';
import { useConnect } from '@blockstack/connect';
import {
  uintCV,
  makeStandardFungiblePostCondition,
  makeContractFungiblePostCondition,
  FungibleConditionCode,
  createAssetInfo,
} from '@blockstack/stacks-transactions';
const BigNum = require('bn.js');

export function UnHodlTokenButton({ title, placeholder, ownerStxAddress }) {
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

    var amountString = textfield.current.value.trim();
    const amount = parseInt(amountString);

    // check balance
    const acc = await fetchHodlTokenBalance(ownerStxAddress);
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
        functionName: 'unhodl',
        functionArgs: [uintCV(amount)],
        postConditions: [
          makeStandardFungiblePostCondition(
            ownerStxAddress,
            FungibleConditionCode.LessEqual,
            new BigNum(amount),
            new createAssetInfo(CONTRACT_ADDRESS, HODL_TOKEN_CONTRACT, 'hodl-token')
          ),
          makeContractFungiblePostCondition(
            CONTRACT_ADDRESS,
            HODL_TOKEN_CONTRACT,
            FungibleConditionCode.LessEqual,
            new BigNum(amount),
            new createAssetInfo(CONTRACT_ADDRESS, HODL_TOKEN_CONTRACT, 'spendable-token')
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
      Unhodl tokens (make them spendable)
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
            Unhodl
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
