import React, { useRef, useState, useEffect } from 'react';
import { useBlockstack } from 'react-blockstack';

import { fetchAccount, txIdToStatus } from './StacksAccount';
import { getUserAddress } from './StacksAccount';
import { useConnect } from '@blockstack/connect';
const BigNum = require('bn.js');

export function OwnerAddressSpendField({ title, path, placeholder, stxAddress }) {
  const { userSession } = useBlockstack();
  const { doSTXTransfer } = useConnect();
  const textfield = useRef();
  const spinner = useRef();
  const [status, setStatus] = useState();
  const [account, setAccount] = useState();

  useEffect(() => {
    fetchAccount(stxAddress)
      .catch(e => {
        setStatus('Failed to access your account', e);
        console.log(e);
      })
      .then(async acc => {
        setAccount(acc);
        console.log({ acc });
      });
  }, [stxAddress]);

  const sendAction = async () => {
    spinner.current.classList.remove('d-none');

    var username = textfield.current.value.trim();
    var usernameString = username;
    if (username.indexOf('.') < 0) {
      usernameString = `${username} (${username}.id.blockstack)`;
      username = `${username}.id.blockstack`;
    }

    // check recipient
    const recipient = await getUserAddress(userSession, username);
    if (!recipient) {
      setStatus(`Recipient ${usernameString} has not yet used the app`);
      spinner.current.classList.add('d-none');
      return;
    }

    // check balance
    const acc = await fetchAccount(stxAddress);
    const balance = acc ? parseInt(acc.balance, 16) : 0;
    if (balance < 1000) {
      setStatus('Your balance is below 1000 uSTX');
      spinner.current.classList.add('d-none');
      return;
    }

    console.log('STX address of recipient ' + recipient.address);
    try {
      setStatus(`Sending transaction`);

      await doSTXTransfer({
        recipient: recipient.address,
        amount: new BigNum(1000),
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
      Send Test STXs (from your own Stacks address)
      <div className="NoteField input-group ">
        <div className="input-group-prepend">
          <span className="input-group-text">{title}</span>
        </div>
        <input
          type="text"
          ref={textfield}
          className="form-control"
          defaultValue={''}
          placeholder={placeholder}
          disabled={!account}
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
            Send
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
