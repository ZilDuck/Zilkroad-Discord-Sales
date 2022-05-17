const axios = require('axios');
require("dotenv").config(); 
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const config = require('./config.js')

const testnetString = process.env.IS_TESTNET ? "?network=testnet" : ""
process.env.IS_TESTNET ? console.log("INDEXER TESTNET") : console.log("INDEXER MAINNET") 
const zilliqa = process.env.IS_TESTNET ? new Zilliqa(config.testnet_zilliqa) : new Zilliqa(config.mainnet_zilliqa);

const key = process.env.indexer_key
module.exports =
{
    indexApiKey: key,

    // Contract - GetContractDetails
    GetContractDetails: async function(nft_contract)
    {
        const response = await axios.get(`https://api.zildexr.com/contract/${nft_contract}${testnetString}`,
                                        { headers: { "X-API-KEY": key } });
        return response
    },

    // Contract - GetContractDetails
    GetContractCode: async function(nft_contract)
    {
        const response = await axios.get(`https://api.zildexr.com/contract/${nft_contract}/code${testnetString}`,
                                        { headers: { "X-API-KEY": key } });
        return response
    },

    // Contract - GetContractState
    GetContractState: async function(nft_contract)
    {
        const response = await axios.get(`https://api.zildexr.com/contract/${nft_contract}/state${testnetString}`,
                                        { headers: { "X-API-KEY": key } });
        return response
    },

    // Address - GetNFTsForAddress
    GetNFTsForAddress: async function(nft_contract)
    {
        const response = await axios.get(`https://api.zildexr.com/address/${nft_contract}/nft${testnetString}`,
                                        { headers: { "X-API-KEY": key } });
        return response
    },

    // Address - GetDeployedContractForAddress
    GetDeployedContractsForAddress: async function(nft_contract)
    {
        const response = await axios.get(`https://api.zildexr.com/address/${nft_contract}/contract${testnetString}`,
                                        { headers: { "X-API-KEY": key } });
        return response
    },

    // NFT - GetPaginedTokenIDs   
    GetPaginatedTokenIDs: async function(nft_contract, token_id_from, token_id_to)
    {
        //prodpeak to tell me todo
    },

    // NFT - GetTokenID
    GetTokenID: async function(nft_contract, token_id)
    {
        const response = await axios.get(`https://api.zildexr.com/nft/${nft_contract}/${token_id}${testnetString}`,
                                        { headers: { "X-API-KEY": key } });
        console.log(response)
        return response
    },

    // NFT - RefreshTokenID
    RefreshTokenID: async function(nft_contract, token_id)
    {
        const response = await axios.get(`https://api.zildexr.com/nft/${nft_contract}/${token_id}/refresh${testnetString}`,
                                        { headers: { "X-API-KEY": key } });
        return response
    },

    // NFT - GetMetadataForTokenID
    GetMetadataForTokenID: async function(nft_contract, token_id)
    {
        const response = await axios.get(`https://api.zildexr.com/nft/${nft_contract}/${token_id}/metadata${testnetString}`,
                                        { headers: { "X-API-KEY": key } });
        return response
    },

    // NFT - GetActionsForTokenID
    GetActionsForTokenID: async function(nft_contract, token_id)
    {
        const response = await axios.get(`https://api.zildexr.com/nft/${nft_contract}/${token_id}/actions${testnetString}`,
                                        { headers: { "X-API-KEY": key } });
        return response.data
    },

    // NFT - GetStatisticsForMetadata
    GetStatisticsForMetadata: async function(nft_contract)
    {
        const response = await axios.get(`https://api.zildexr.com/contract/${nft_contract}/attributes${testnetString}`,
                                        { headers: { "X-API-KEY": key } });
        return response
    },

    GetRoyaltyBPSForToken: async function (nft_contract) {
        const stateResult = await zilliqa.blockchain.getSmartContractSubState(
            nft_contract,
            'royalty_fee_bps',
        );
        console.log(stateResult)
        return '10'
    },

GetTransactionsForBlock: async function(block_data)
{
  let block_transactions = block_data.filter(function (object) {
    return object.vname == "block" || object.vname == "this_block";
  });
  await Promise.all(
    block_transactions.map(async (object) => {
      object.transactions = await zilliqa.blockchain.getTxnBodiesForTxBlock(object.value);
    })
  );
  return block_transactions;
},

GetTransactionHashForBlock: function(block_transactions, nonfungible_contract, token_id, user)
{
  // If we can garuntee that there will always be 1 block transaction, result, event_logs, and not multiple
  // this would be a lot simpler, commented version is the simpler one
  var updateBlock = false;
  var id;
  block_transactions.forEach(function(block) {
    block.transactions.result.forEach(function(result) {
      id = result.ID;
      console.log("Result: %s\n\tJSON: %j", result, result)
      if ( !'event_logs' in result.receipt ) {
        console.log("Event logs can't be found for result, skipping");
        return;
      }
      result.receipt.event_logs.forEach(function(eventLogs) {
        if ( updateBlock ) {
          return;
        }
        var components = eventLogs.params.filter(function(object) {
          // When testing SoldTest on testnet, the buyer and seller have the same ID
          // So we add this extra check on that level to make sure it's bound to
          // the object where it's either the user or buyer to account for all three
          // cases [Listing, Delisting, Sold]
          return object.value === token_id ||
                 (
                   object.value === nonfungible_contract && object.vname === "nonfungible"
                 ) ||
                 (
                   object.value === user && object.vname === "user"
                 ) ||
                 (
                   object.value === user && object.vname === "buyer"
                 ) ||
                 (
                   object.value === user && object.vname === "delister"
                 ) ||
                 (
                   object.value === user && object.vname === "lister"
                 )
        });
        if ( components.length == 2 ) {
          updateBlock = true;
          return;
        }
        console.log(components.length)
      });
    });
    if ( updateBlock && id != null) {
    const url = process.env.IS_TESTNET ? `https://viewblock.io/zilliqa/tx/0x${block.id}` : `https://viewblock.io/zilliqa/tx/0x${block.id}?network=testnet` 
      block.id = url;
    } else {
      console.log("Could not get transaction hash for some reason");
    }
  });

}
}
