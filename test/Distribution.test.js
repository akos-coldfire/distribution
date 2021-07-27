const {
    expectEvent,
    expectRevert,
    constants,
    ether
} = require('@openzeppelin/test-helpers');

const BN = require('bn.js');

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should();

const Token = artifacts.require("RewardToken");
const Distribution = artifacts.require("Distribution");
   
contract("Distribution", function (accounts) {
    [owner, beneficiary1, beneficiary2, beneficiary3, signer] = accounts;

    const tName = "Reward";
    const tSymbol = "RWD";
    let tAmount;

    beforeEach(async function () {
        tAmount = ether("1000");
        token = await Token.new(tName, tSymbol, tAmount, {from: owner});
        DT = await Distribution.new(token.address, {from: owner});
        await token.approve(DT.address, tAmount);
    });

    describe("Reward Token Test Cases", function () {

        it("should initialize token correctly", async ()=> {
            (await token.name()).should.be.equal(tName);
            (await token.symbol()).should.be.equal(tSymbol);
            (await token.totalSupply()).should.be.bignumber.equal(tAmount);
        });
    });

    describe("Distribution Test Cases", function () {

        context("Distribution Initializing Phase Test Cases", function() {

            it("should initialize contract with correct token address", async () => {
                (await DT.token()).should.be.equal(token.address);
            });
    
            it("shouldn`t initialize contract with empty token address", async () => {
                await expectRevert(
                    Distribution.new(constants.ZERO_ADDRESS),
                    "Token Address is not Zero"
                );
            });
        });

        context("Distribution Functions Phase Test Cases", function() {

            it("should deposit tokens to distribution contract from only owner", async() => {
                result = await DT.deposit(ether("1"), {from: owner});
                expectEvent(
                    result, "Deposit",
                   {from: owner, to: DT.address, amount: ether("1"), state: (Distribution.State.deposited).toString()}
                );
                ((await token.balanceOf(owner)).toString()).should.be.bignumber.equal(ether("999"));
            });

            it("shouldn`t deposit tokens if amount is zero", async() => {
                await expectRevert(
                    DT.deposit(0, {from: owner}),
                    "Amount cannot be zero"
                );
            });

            it("shouldn`t deposit tokens from someone other than owner", async() => {
                await expectRevert(
                    DT.deposit(ether("2"), {from: beneficiary1}), 
                    "Ownable: caller is not the owner"
                );
            });

            it("shouldn`t deposit tokens to distribution contract if insufficient balance", async() => {
                await expectRevert(
                    DT.deposit(ether("1010"), {from: owner}), 
                    "ERC20: transfer amount exceeds balance"
                );
            });
            
            it("should transfer amount of reward tokens back to the owner", async() => {
                await DT.deposit(ether("1"), {from: owner});
                result = await DT.emergencyWithdraw(ether("1"), {from: owner});
                expectEvent(
                    result,"EmergencyWithdraw",
                    {to: owner, amount: ether("1"), state: (Distribution.State.removed).toString()}
                );
                ((await token.balanceOf(owner)).toString()).should.be.bignumber.equal(ether("1000"));
            });

            it("shouldn`t transfer amount of reward tokens if amount is zero", async() => {
                await expectRevert(
                    DT.emergencyWithdraw(0, {from: owner}), 
                    "Amount cannot be zero"
                );
            });

            it("shouldn`t transfer amount of reward tokens if insufficient tokens balance", async() => {
                await DT.deposit(ether("1000"), {from: owner});
                await expectRevert(
                    DT.emergencyWithdraw(ether("2000"), {from: owner}), 
                    "Insufficient tokens balance"
                );
            });

            it("shouldn`t transfer amount of reward tokens back to the owner from someone other than owner", async() => {
                await DT.deposit(ether("10"), {from: owner});
                await expectRevert(
                    DT.emergencyWithdraw(ether("2"), {from: beneficiary1}), 
                    "Ownable: caller is not the owner"
                );
            });

            it("should add beneficiaries correctly", async() => {
                await DT.deposit(ether("200"), {from: owner});
                await DT.addBeneficiaries([beneficiary1, beneficiary2], [ether("90"), ether("90")], {from: owner});
                await DT.lockRewards(false, {from: owner});
                result = await DT.claim({from: beneficiary1});
                expectEvent(
                    result, "TransferReward",
                    {who: beneficiary1, amount: ether("90"), state: (Distribution.State.distributed).toString()}
                );
                await DT.lockRewards(false, {from: owner});
                result2 = await DT.claim({from: beneficiary2});
                expectEvent(
                    result2, "TransferReward",
                    {who: beneficiary2, amount: ether("90"), state: (Distribution.State.distributed).toString()}
                );
                (await token.balanceOf(beneficiary1)).should.be.bignumber.equal(ether("90"));
                (await token.balanceOf(beneficiary2)).should.be.bignumber.equal(ether("90"));
            });

            it("shouldn`t add beneficiaries correctly if length of arrays is invalid", async() => {
                await DT.deposit(ether("200"), {from: owner});
                await expectRevert(
                    DT.addBeneficiaries([beneficiary1, beneficiary2], [ether("10"), ether("10"), ether("10")], {from: owner}), 
                    "Length of arrays is invalid"
                );
                await DT.lockRewards(false, {from: owner});
                result = await DT.claim({from: beneficiary1});
                expectEvent(
                    result, "TransferReward",
                    {who: beneficiary1, amount: ether("0"), state: (Distribution.State.distributed).toString()}
                );
            });

            it("should add one beneficiary correctly", async() => {
                await DT.deposit(ether("15"), {from: owner});
                await DT.addBeneficiary(beneficiary3, ether("10"), {from: owner});
                await DT.lockRewards(false, {from: owner});
                result = await DT.claim({from: beneficiary3});
                expectEvent(
                    result, "TransferReward",
                    {who: beneficiary3, amount: ether("10"), state: (Distribution.State.distributed).toString()}
                );
                (await token.balanceOf(beneficiary3)).should.be.bignumber.equal(ether("10"));
            });

            it("shouldn`t add beneficiaries if address is zero", async() => {
                await expectRevert(
                    DT.addBeneficiaries([constants.ZERO_ADDRESS, constants.ZERO_ADDRESS], [ether("10"), ether("10")], {from: owner}), 
                    "Address of Beneficiaries cannot be zero"
                );
                await expectRevert(
                    DT.addBeneficiary(constants.ZERO_ADDRESS, ether("100"), {from: owner}), 
                    "Address of Beneficiaries cannot be zero"
                );
            });

            it("shouldn`t add beneficiaries if amount is zero", async() => {
                await expectRevert(
                    DT.addBeneficiaries([beneficiary1, beneficiary2], [0, 0], {from: owner}), 
                    "Balances of Beneficiaries cannot be zero"
                );
                await expectRevert(
                    DT.addBeneficiary(beneficiary1, 0, {from: owner}), 
                    "Balances of Beneficiaries cannot be zero"
                );
            });

            it("shouldn`t add beneficiaries from someone other than owner", async() => {
                await expectRevert(
                    DT.addBeneficiaries([beneficiary1, beneficiary2], [ether("90"), ether("90")], {from: beneficiary1}), 
                    "Ownable: caller is not the owner"
                );
                await expectRevert(
                    DT.addBeneficiary(beneficiary1, ether("90"), {from: beneficiary1}), 
                    "Ownable: caller is not the owner"
                );
            });

            it("should decrease amount of rewards for benefeciary", async() => {
                await DT.deposit(ether("20"), {from: owner});
                await DT.addBeneficiary(beneficiary1, ether("15"), {from: owner});
                result = await DT.decreaseReward(beneficiary1, ether("5"), {from: owner});
                expectEvent(
                    result, "DecreaseReward",
                    {who: beneficiary1, amount: ether("5"), state: (Distribution.State.removed).toString()}
                );
                await DT.lockRewards(false, {from: owner});
                await DT.claim({from: beneficiary1});
                (await token.balanceOf(beneficiary1)).should.be.bignumber.equal(ether("10"));
            });

            it("shouldn`t decrease amount if address is zero or amount is zero", async() => {
                await expectRevert(
                    DT.decreaseReward(constants.ZERO_ADDRESS, ether("10"), {from: owner}), 
                    "Address of Beneficiaries cannot be zero"
                );
                await expectRevert(
                    DT.decreaseReward(beneficiary1, 0, {from: owner}), 
                    "Balances of Beneficiaries cannot be zero"
                );
            });

            it("shouldn`t decrease amount from someone other than owner", async() => {
                await expectRevert(
                    DT.decreaseReward(beneficiary1, ether("10"), {from: beneficiary2}), 
                    "Ownable: caller is not the owner"
                );
            });

            it("shouldn`t transfer reward tokens to beneficiary correct if insufficient token`s balance", async() => {
                await DT.deposit(ether("15"), {from: owner});
                await DT.addBeneficiary(beneficiary3, ether("20"), {from: owner});
                await DT.lockRewards(false, {from: owner});
                await expectRevert(DT.claim({from: beneficiary3}), "ERC20: transfer amount exceeds balance");
                (await token.balanceOf(beneficiary3)).should.be.bignumber.equal(ether("0"));
            });

            it("shouldn`t transfer reward tokens to beneficiary correct if already paid", async() => {
                await DT.deposit(ether("20"), {from: owner});
                await DT.addBeneficiary(beneficiary3, ether("15"), {from: owner});
                await DT.lockRewards(false, {from: owner});
                await DT.claim({from: beneficiary3});
                await expectRevert(DT.claim({from: beneficiary3}), "Amount is paid");
                (await token.balanceOf(beneficiary3)).should.be.bignumber.equal(ether("15"));
            });

            it("should lock rewards for beneficiary", async() => {
                await DT.deposit(ether("15"), {from: owner});
                await DT.addBeneficiary(beneficiary3, ether("10"), {from: owner});
                await DT.lockRewards(true, {from: owner});
                await expectRevert(
                    DT.claim({from: beneficiary3}),
                    "Not allowed - locked"
                );
                (await token.balanceOf(beneficiary3)).should.be.bignumber.equal(ether("0"));
            });

            it("shouldn`t lock/unlock rewards from someone other than owner", async() => {
                await expectRevert(
                    DT.lockRewards(false, {from: beneficiary2}), 
                    "Ownable: caller is not the owner"
                );
            });
            
        });
    });
});
