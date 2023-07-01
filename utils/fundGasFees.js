import * as nearAPI from "near-api-js";

const fundUserForGasFees = async (userAccount , nearConnection) => {
    const mainAccountName = "credeem"
    const mainAccount = await nearConnection.account(`${mainAccountName}.testnet`);

    await mainAccount.sendMoney(userAccount, '200000000000000000000000')
}

export default fundUserForGasFees;