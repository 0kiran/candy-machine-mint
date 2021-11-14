import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Button, CircularProgress, Snackbar, TextField } from "@material-ui/core";
import { Card, Stack } from "@mui/material";
import Item from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@material-ui/lab/Alert";
import Toolbar from '@mui/material/Toolbar';
import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';

import { useForm } from "react-hook-form";

import * as anchor from "@project-serum/anchor";

// ASSETS
import lanafrogs from './lanafrogs.gif';
import background from "./bbackground.png";
import discordlogo from "./discordimg.svg";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";


import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui";

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
} from "./candy-machine";

const ConnectButton = styled(WalletDialogButton)``;

const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div``; // add your styles here

const MintButton = styled(Button)``; // add your styles here

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
  passphrase: string;
}

const Home = (props: HomeProps) => {
  

  const { register, formState: { errors }, handleSubmit } = useForm();
  const [registered, setRegistered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(true);
  const onSubmit = (data: any) => { String(data.passphrase) === props.passphrase ? setRegistered(true) : setIsCorrect(false) }

  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRemaining, setItemsRemaining] = useState(0);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();



  const refreshCandyMachineState = () => {
    (async () => {
      if (!wallet) return;

      const {
        candyMachine,
        goLiveDate,
        itemsAvailable,
        itemsRemaining,
      } = await getCandyMachineState(
        wallet as anchor.Wallet,
        props.candyMachineId,
        props.connection
      );

      setItemsAvailable(itemsAvailable);
      setItemsRemaining(itemsRemaining);


      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
    })();
  };

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet && candyMachine?.program) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
      refreshCandyMachineState();
    }
  };

  useEffect(() => {
    (async () => {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(refreshCandyMachineState, [
    wallet,
    props.candyMachineId,
    props.connection,
  ]);

  return (

    <main style={{
      backgroundImage: `url(${background})`,
    }}>

        <AppBar style={{ background: '#121212' }}  elevation={6}>
          <Toolbar>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
            >
              <img style={{ maxHeight: 45 }} className={"lanafrogslogo"} alt="lanafrogslogo" src={"lanafrogslogo.png"} />
            </IconButton>
            <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
              Lana Frogs NFT - Presale Mint
            </Typography>
            <Button href="https://discord.gg/gZn3sB56Jh" color="inherit"><img style={{ maxHeight: 35 }} alt="join our discord!" src={discordlogo} /></Button>
          </Toolbar>
        </AppBar>

      <div className="contentBlock">

        <Stack spacing={2}>
          <Item>

            <Card sx={{ backgroundColor: '#121212', mx: "25%", mt: "5%", minWidth: "50%" }} elevation={6}>
              <Stack spacing={2}>
                <div>
                  <img src={lanafrogs} alt="LANAFROGS" className="lanafrog" />
                </div>

                {!registered && (
                  <Item style={{ backgroundColor: '#121212' }}>
                    <form onSubmit={handleSubmit(onSubmit)}>
                      <div style={{ padding: 20 }}>
                        {isCorrect ? <TextField id="outlined-basic" label="Passphrase" variant="outlined" {...register("passphrase", { required: true, maxLength: 20 })} />
                          : <TextField
                            error
                            id="filled-error"
                            label="Incorrect phrase"
                            {...register("passphrase", { required: true, maxLength: 20 })}
                          />}
                      </div>

                      {errors.passphrase?.type === 'required' && <div style={{ paddingBottom: 20 }}> <Typography color="white" variant="body1" component="div" sx={{ flexGrow: 1 }}>
                        Passphrase is required.
                      </Typography></div>}


                      <Button variant="contained" type="submit">Enter</Button>
                    </form>
                  </Item>
                )}


                {wallet && (
                  <Item>
                    <Card sx={{ backgroundColor: '#121212', minWidth: "10%", mx: "20%" }} variant="outlined">
                      <Typography
                        sx={{ fontSize: 14 }}
                        color="white"
                        gutterBottom
                      >
                        <p>Wallet {shortenAddress(wallet.publicKey.toBase58() || "")}</p>
                        <p>Balance: {(balance || 0).toLocaleString()} SOL</p>
                        <p>Remaining: {itemsRemaining} out of {itemsAvailable}</p>
                      </Typography>
                    </Card>
                  </Item>
                )}


                {registered ? (
                  <Item>
                    <MintContainer>
                      {!wallet ? (
                        <ConnectButton style={{ marginBottom: "2%" }}>Connect Wallet</ConnectButton>
                      ) : (
                        <MintButton
                          disabled={isSoldOut || isMinting || !isActive}
                          onClick={onMint}
                          style={{ marginBottom: 10 }}
                          variant="contained"
                        >
                          {isSoldOut ? (
                            "SOLD OUT"
                          ) : isActive ? (
                            isMinting ? (
                              <CircularProgress />
                            ) : (
                              "MINT"
                            )
                          ) : (
                            <Countdown
                              date={startDate}
                              onMount={({ completed }) => completed && setIsActive(true)}
                              onComplete={() => setIsActive(true)}
                              renderer={renderCounter}
                            />
                          )}
                        </MintButton>
                      )}
                    </MintContainer>
                    
                  </Item>
                ) : <div></div>}

              </Stack>
              
            </Card>
          </Item>
        </Stack>
        <Snackbar
          open={alertState.open}
          autoHideDuration={6000}
          onClose={() => setAlertState({ ...alertState, open: false })}
        >
          <Alert
            onClose={() => setAlertState({ ...alertState, open: false })}
            severity={alertState.severity}
          >
            {alertState.message}
          </Alert>
        </Snackbar>
      </div>
    </main>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};


export default Home;
