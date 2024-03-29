require("dotenv").config();
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const {
  toBech32Address
} = require('@zilliqa-js/crypto');
const { MessageType } = require("@zilliqa-js/subscriptions");
const config = require('./config.js')
const axios = require('axios')

const zilliqa = process.env.is_testnet ? new Zilliqa(config.testnet_zilliqa) : new Zilliqa(config.mainnet_zilliqa);
const ws_url = process.env.is_testnet ? config.testnet_ws : config.mainet_ws
console.log(`is_testnet == ${process.env.is_testnet}`)
console.log(`network == ${zilliqa.network.provider.nodeURL}`)
const Big = require('big.js')
Big.NE = -60
Big.PE = 60

var testnetPrefix
process.env.is_testnet ? testnetPrefix = '?network=testnet' : ""
console.log(`testnetPrefix == ${testnetPrefix}`)
  
const {    
  CreateMessageObject,
  SendListedMessage,
  SendSoldMessage} = require('./MessageModel.js')

const {
  GetRoyaltyBPSForToken,
  GetTransactionsForBlock,
  GetTransactionHashForBlock} = require('./indexer.js')

const getVname = (params, vname) =>
  params.find((param) => param.vname === vname).value;

async function ListenAndRespondToEvents() {
  const subscriber = zilliqa.subscriptionBuilder.buildEventLogSubscriptions(
    ws_url,
    {
      // smart contract address you want to listen on
      addresses: [process.env.nft_marketplace_address],
    }
  );
  console.log(`Starting listener ${process.env.nft_marketplace_address} on ${ws_url}`);

  subscriber.emitter.on(MessageType.EVENT_LOG, async (event) => {
      if (event.value) {
        console.log("event");
        for (const value of event.value) {
          for (const eventLog of value.event_logs) {
            if (eventLog._eventname === "Sold") {
              message_to_send = await HandleSold(eventLog);
              await SendSoldMessage(message_to_send);
            }
            if (eventLog._eventname === "Listed") {
               message_to_send = await HandleListed(eventLog)
               await SendListedMessage(message_to_send);
            }
          }
        }
      }
  })
  await subscriber.start();
}

async function HandleSold(eventLog)
{
  console.log(`In Sold `)  
  const block = getVname(eventLog.params, "block");
  console.log(`block ${block}`)  
  const order_id = getVname(eventLog.params, "order_id");
  console.log(`i ${order_id}`)  
  const nonfungible = getVname(eventLog.params, "nonfungible");
  console.log(` nonfungible${nonfungible}`)  
  const token_id = getVname(eventLog.params, "token_id");
  console.log(` token_id${token_id}`)  
  const fungible = getVname(eventLog.params, "fungible");
  console.log(`fungible ${fungible}`)  
  const fungible_amount = getVname(eventLog.params, "sell_price");
  console.log(`fungible_amount ${fungible_amount}`)  
  const seller = getVname(eventLog.params, "seller");
  console.log(`seller ${seller}`)  
  const buyer = getVname(eventLog.params, "buyer");
  console.log(`buyer ${buyer}`)  
  const marketplace_recipient = getVname(eventLog.params, "marketplace_recipient");
  console.log(`marketplace_recipient ${marketplace_recipient}`)  
  const tax_amount = getVname(eventLog.params, "tax_amount");
  console.log(`tax_amount ${tax_amount}`)  
  const royalty_recipient = getVname(eventLog.params, "royalty_recipient");
  console.log(`royalty_recipient ${royalty_recipient}`)  
  const royalty_amount = getVname(eventLog.params, "royalty_amount");
  console.log(`royalty_amount ${royalty_amount}`)

  const tx = await getTX(order_id, 'sold')

  const nonfungible_contract = zilliqa.contracts.at(toBech32Address(nonfungible.replace('0x','')));
  const fungible_contract = zilliqa.contracts.at(toBech32Address(fungible.replace('0x','')));
  const nft_state = await nonfungible_contract.getInit();
  const ft_state = await fungible_contract.getInit();

  const nft_symbol = nft_state.reduce(
    (prev, value) => ({ ...prev, [value.vname]: value }),
    {}
  ).symbol.value;  
  console.log(nft_symbol)
  console.log(`nft_symbol ${nft_symbol}`)  
  const fungible_symbol = ft_state.reduce(
    (prev, value) => ({ ...prev, [value.vname]: value }),
    {}
  ).symbol.value; 
  console.log(`fungible_symbol ${fungible_symbol}`)  
  console.log(fungible_symbol)

  const fungible_decimals = ft_state.reduce(
    (prev, value) => ({ ...prev, [value.vname]: value }),
    {}
  ).decimals.value; 
  console.log(`fungible_decimals ${fungible_decimals}`) 

  const amount_decimals = new Big(fungible_amount).div(new Big(10).pow(parseInt(fungible_decimals))).toString()
  const tax_decimals = new Big(royalty_amount).div(new Big(10).pow(parseInt(fungible_decimals))).toString()

  const bps = await GetRoyaltyBPSForToken(nonfungible)

  const message_to_send = await CreateMessageObject(fungible_symbol, amount_decimals, tax_decimals, fungible,
                                nft_symbol, nonfungible, token_id, bps,
                                buyer, seller, royalty_recipient, block, tx)
  
  return message_to_send;
}


async function HandleListed(eventLog)
{
  console.log(`In Listed `)  
  const nonfungible = getVname(eventLog.params, "nonfungible");
  console.log(`nonfungible ${nonfungible}`)  
  const token_id = getVname(eventLog.params, "token_id");
  console.log(`tid ${token_id}`)  
  const fungible = getVname(eventLog.params, "fungible");
  console.log(`fungible ${fungible}`)  
  const sell_price = getVname(eventLog.params, "sell_price");
  console.log(`sellprice ${sell_price}`)  
  const lister = getVname(eventLog.params, "lister");
  console.log(`lister ${lister}`)  
  const block = getVname(eventLog.params, "block");
  console.log(`block ${block}`)  
  const order_id = getVname(eventLog.params, "oid");
  console.log(`order ${order_id}`)  

  const tx = await getTX(order_id, 'listed')

  console.log(`bech32 nft ${nonfungible.replace('0x','')}`)
  console.log(`bech32 ft ${fungible.replace('0x','')}`)
  const nonfungible_contract = zilliqa.contracts.at(nonfungible.replace('0x',''));
  const fungible_contract = zilliqa.contracts.at(fungible.replace('0x',''));
  console.log(nonfungible_contract)
  console.log(fungible_contract)
  const nft_state = await nonfungible_contract.getInit();
  const ft_state = await fungible_contract.getInit();
  console.log(nft_state)
  console.log(ft_state)

  const nft_symbol = nft_state.reduce(
    (prev, value) => ({ ...prev, [value.vname]: value }),
    {}
  ).symbol.value; 
  console.log(nft_symbol)
  console.log(`nft_symbol ${nft_symbol}`)  
  const fungible_symbol = ft_state.reduce(
    (prev, value) => ({ ...prev, [value.vname]: value }),
    {}
  ).symbol.value; 
  console.log(`fungible_symbol ${fungible_symbol}`)  

  const fungible_decimals = ft_state.reduce(
    (prev, value) => ({ ...prev, [value.vname]: value }),
    {}
  ).decimals.value; 
  console.log(`fungible_decimals ${fungible_decimals}`) 

  const amount_decimals = new Big(sell_price).div(new Big(10).pow(parseInt(fungible_decimals))).toString()

  const bps = await GetRoyaltyBPSForToken(nonfungible)

  const message_to_send = await CreateMessageObject(fungible_symbol, amount_decimals, 0, fungible,
                                nft_symbol, nonfungible, token_id, bps,
                                `0x0000000000000000000000000000000000000000`, lister, `0x0000000000000000000000000000000000000000`, block, tx)
  
  return message_to_send;
}

ListenAndRespondToEvents();

async function getTX(order_id, type)
{
  var retrys = 0
  const maxRetry = 5
  const milliesToWait = 2000
  try{
    var tx 
    for(var i=0; i<=5; i++)
    {
      tx = await axios.get(`https://testnet-public-api.zilkroad.io/order/${type}/${order_id}`)
      if(tx.data[0]?.tx_hash)
      {
        console.log(`got tx up`)
        return 'https://viewblock.io/zilliqa/tx/' + tx.data[0].tx_hash + testnetPrefix
      }
      else if(retrys == maxRetry)
      {
        console.error(`giving up getting tx `)
        return 'https://viewblock.io/zilliqa/tx/' + testnetPrefix
      }
      else {
        retrys++
        await new Promise(r => setTimeout(r, milliesToWait));
        console.log(`no hit, awaiting ${i++}/${maxRetry}`)
      }
    }
  }
  catch(e)
  {
    console.error(`TX error`, e)
  }
}