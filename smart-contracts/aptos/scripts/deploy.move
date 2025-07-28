script {
    use cross_chain_swap::cross_chain_swap_aptos;
    use cross_chain_swap::token_registry;

    fun deploy(deployer: &signer) {
        let deployer_addr = std::signer::address_of(deployer);
        
        // Initialize CrossChainSwapAptos with deployer as fee recipient
        cross_chain_swap_aptos::initialize(deployer, deployer_addr);
        
        // Initialize TokenRegistry
        token_registry::initialize(deployer);
    }
}