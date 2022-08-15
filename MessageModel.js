
const { MessageEmbed, Client, Intents, MessageAttachment } = require('discord.js');
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});
client.login(process.env.DISCORD_TOKEN);
const recently_listed_channel = "904483034638745733";
const recently_sold_channel = "901599928105725962";
console.log(`logged into discord with token == ${process.env.DISCORD_TOKEN}`)
const axios = require('axios');
const {GetTokenID} = require('./indexer.js')
const { toBech32Address, fromBech32Address } = require('@zilliqa-js/crypto')
const Big = require('big.js')
const zilkroad_logo_uri =
  "https://pbs.twimg.com/profile_images/1456396384819625984/uCeLltRG_400x400.jpg";



async function CreateMessageObject(fungible_symbol, fungible_amount, fungible_tax, fungible_address_b16, 
                            nonfungible_symbol, nonfungible_address_b16, token_id, nonfungible_bps,
                            buyer_address_b16, seller_address_b16, royalty_address_b16, tx_hash, block_num)
{

    const fs = fungible_symbol ?? false
    const fa = fungible_amount ?? false
    const ftax = fungible_tax ?? false
    const faddr = fungible_address_b16 ?? false
    const nfs = nonfungible_symbol ?? false
    const nfaddr = nonfungible_address_b16 ?? false
    const tid = token_id ?? false
    const bps = nonfungible_bps ?? false
    var buyaddr = buyer_address_b16 ?? false
    var selladdr = seller_address_b16 ?? false
    var royaladdr = royalty_address_b16 ?? false
    const tx = tx_hash ?? false
    const block = block_num ?? false
    const zilkroad_url = `https://staging.zilkroad.io/collection/${nonfungible_address_b16}/${token_id}`
    console.log(fungible_amount)
    const usd = await getUSDValuefromTokens(fs, fa)
    var text
    var colour
    const now = new Date().toUTCString();

    if(buyaddr === '0x0000000000000000000000000000000000000000')
    {
        text = `Item listed at ${now} @ block ${block}`
        colour = `000000`
    }
    else
    {
        text = `Item sold at ${now} @ block ${block}`
        colour = `FFFFFF`
    }
console.log(`${nonfungible_address_b16}/${token_id} / ${fungible_address_b16}`)
console.log(`${JSON.stringify(nonfungible_address_b16)}/${token_id}`)
    const token = await GetTokenID(nonfungible_address_b16, token_id)
console.log(`${buyaddr} / ${selladdr} / ${token.data.tokenUri} / ${Object.values(token.data.tokenUri)}`)
    return {
        text : text,
        colour: colour,
        token_uri: token.data.tokenUri,
        fungible_symbol: fs,
        fungible_amount: fa,
        usd_value: usd,
        fungible_tax: ftax,
        fungible_address_b16: faddr,
        fungible_address_b32 : toBech32Address(fungible_address_b16),
        nonfungible_symbol: nfs,
        nonfungible_address_b16: nfaddr,
        nonfungible_address_b32 : toBech32Address(nonfungible_address_b16),
        token_id: tid,
        nonfungible_bps: bps,
        buyer_address_b16: buyaddr,
        buyer_address_b32 : toBech32Address(buyaddr),
        seller_address_b16: selladdr,
        seller_address_b32 : toBech32Address(seller_address_b16),
        royalty_address_b16: royaladdr,
        royalty_address_b32 : toBech32Address(royaladdr),
        tx_url: `https://viewblock.io/zilliqa/tx/0x${tx}`,
        zilkroad_url: zilkroad_url,
        block_num: block
    }
}

async function SendSoldMessage(messageObject)
{
    console.log(messageObject)
    const exampleEmbed = new MessageEmbed()
        .setColor(messageObject.colour)
        .setTitle(messageObject.text)
        .setURL(messageObject.zilkroad_url)
        .setDescription(messageObject.zilkroad_url)
        .setThumbnail(`https://zildexr-testnet.b-cdn.net/${messageObject.nonfungible_address_b16}/${messageObject.token_id}`)
        .addFields(
            { name: 'Buyer', value: messageObject.buyer_address_b32},
            { name: 'Seller', value: messageObject.seller_address_b32},
            { name: 'Amount', value: `${messageObject.fungible_amount} ${messageObject.fungible_symbol}`},           
            { name: 'Royalty Recipient', value: messageObject.royalty_address_b32},
            { name: 'Royalty Amount', value: `${messageObject.fungible_symbol}/${messageObject.fungible_tax}`},
            { name: 'TransactionID', value: `${messageObject.tx_url}`}
        )
        .setImage(`https://zildexr-testnet.b-cdn.net/${messageObject.nonfungible_address_b16}/${messageObject.token_id}`)
        .setTimestamp()
        .setFooter(`zilkroad.io`, zilkroad_logo_uri);


    const channel = client.channels.cache.get(recently_sold_channel);
    channel.send({ embeds: [exampleEmbed] });
}

async function SendListedMessage(messageObject)
{
    console.log(messageObject)
    const exampleEmbed = new MessageEmbed()
        .setColor(messageObject.colour)
        .setTitle(messageObject.text)
        .setURL(messageObject.zilkroad_url)
        .setDescription(messageObject.zilkroad_url)
        .setThumbnail(`https://zildexr-testnet.b-cdn.net/${messageObject.nonfungible_address_b16}/${messageObject.token_id}`)
        .addFields(
            { name: 'Lister', value: messageObject.seller_address_b32},
            { name: 'Amount', value: `${messageObject.fungible_amount} ${messageObject.fungible_symbol}`},
            { name: 'NFT address', value: `${messageObject.nonfungible_address_b32}`},           
            { name: 'NFT Symbol/Token', value: `${messageObject.nonfungible_symbol}/${messageObject.token_id}`},
            { name: 'TransactionID', value: `${messageObject.tx_url}`},
            { name: 'USD', value: `${messageObject.usd_value}`}
        )
        .setTimestamp()
        .setImage(`https://zildexr-testnet.b-cdn.net/${messageObject.nonfungible_address_b16}/${messageObject.token_id}`)
        .setFooter(`zilkroad.io`, zilkroad_logo_uri);


    const channel = client.channels.cache.get(recently_listed_channel);
    channel.send({ embeds: [exampleEmbed] });
}

// to do
// add sold message 
// add 1 token call
// refactor calls into indexer and call it utils
module.exports =
{
    CreateMessageObject,
    SendListedMessage,
    SendSoldMessage
}

async function getUSDValuefromTokens(ticker, numberOfTokens) 
{
  // account for wzil
  const final_ticker = ticker.toLowerCase() == "wzil" ? "zil" : ticker;
  const token_info =
  (
    await axios.get(`https://api.zilstream.com/tokens/${final_ticker}`)
  )
  const usd_rate = token_info.data.rate_usd;
  const decimals = token_info.data.decimals;

  const numberWithDecimal = new Big(numberOfTokens).div(new Big(10).pow(decimals));
  console.log(`${numberWithDecimal} blockchain amount`)

  // TODO break each one into new method
  const tradedValueUSD = new Big(usd_rate).mul(numberWithDecimal).round(2);
  const oneTokenAsUSD = new Big(usd_rate).round(2);
  console.log(`trade value of ${ticker} is ${tradedValueUSD} // 1 token as USD 2DP ${oneTokenAsUSD}`)
  return tradedValueUSD
}