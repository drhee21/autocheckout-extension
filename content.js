(function() {
    // Check for Shopify store indicators in the DOM
    const hasShopify = document.querySelector('[data-shopify]') ||
                      document.querySelector('script[src*="shopify"]');
    
    if (!hasShopify) {
        // Wait for Shopify indicators to load (up to 5 seconds)
        let attempts = 0;
        const checkShopify = setInterval(() => {
            attempts++;
            
            // Check for Shopify indicators in the DOM
            const hasShopifyNow = document.querySelector('[data-shopify]') ||
                                document.querySelector('script[src*="shopify"]');
            
            if (hasShopifyNow) {
                clearInterval(checkShopify);
                createButton();
            } else if (attempts >= 50) { // 5 seconds (50 * 100ms)
                clearInterval(checkShopify);
                return;
            }
        }, 100);
        
        return;
    }
    
    createButton();

function createButton() {
    // Create the AUTOCHECKOUT button
    const button = document.createElement('button');
    button.textContent = 'AUTOCHECKOUT';
    button.style.position = 'fixed';
    button.style.right = '20px';
    button.style.bottom = '20px';
    button.style.zIndex = '9999';
    button.style.padding = '12px 24px';
    button.style.background = '#0078d4';
    button.style.color = '#fff';
    button.style.border = 'none';
    button.style.borderRadius = '6px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '16px';

    // Add button to the DOM
    document.body.appendChild(button);

    // Button click handler
    button.addEventListener('click', () => {
        // Update button text to show loading state
        button.textContent = 'Adding to cart...';
        button.disabled = true;
        
        chrome.storage.local.get(['address1', 'address2', 'city', 'state', 'country', 'postal', 'email', 'phone'], (result) => {
            // Create checkout using Shopify Storefront Cart GraphQL API
            const storeDomain = window.location.hostname;
            const apiVersion = '2025-07';
            const graphqlEndpoint = `https://${storeDomain}/api/${apiVersion}/graphql.json`;
            
            // Extract variant ID from URL query parameters
            const urlParams = new URLSearchParams(window.location.search);
            const variantId = urlParams.get('variant');
            
            if (!variantId) {
                console.error('No variant ID found in URL parameters');
                return;
            }
            
            const mutation = `
                mutation cartCreate($input: CartInput) {
                    cartCreate(input: $input) {
                        cart {
                            id
                            checkoutUrl
                            lines(first: 5) {
                                edges {
                                    node {
                                        merchandise {
                                            ... on ProductVariant {
                                                title
                                            }
                                        }
                                        quantity
                                    }
                                }
                            }
                        }
                        userErrors {
                            field
                            message
                        }
                        warnings {
                            message
                        }
                    }
                }
            `;
            
            const variables = {
                input: {
                    lines: [
                        {
                            quantity: 1,
                            merchandiseId: `gid://shopify/ProductVariant/${variantId}`
                        }
                    ]
                }
            };
            
            fetch(graphqlEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Storefront-Access-Token': '' // TODO: Add storefront access token
                },
                body: JSON.stringify({
                    query: mutation,
                    variables: variables
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.data && data.data.cartCreate && data.data.cartCreate.cart) {
                    const cartId = data.data.cartCreate.cart.id;
                    
                    // Update cart with buyer identity using stored information
                    const buyerIdentityMutation = `
                        mutation cartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
                            cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
                                cart {
                                    id
                                    buyerIdentity {
                                        email
                                        phone
                                        countryCode
                                    }
                                }
                                userErrors {
                                    field
                                    message
                                }
                                warnings {
                                    message
                                }
                            }
                        }
                    `;
                    
                    const buyerIdentityVariables = {
                        cartId: cartId,
                        buyerIdentity: {
                            email: result.email,
                            phone: result.phone,
                            countryCode: result.country
                        }
                    };
                    
                    // Update button text for buyer identity update
                    button.textContent = 'Submitting information...';
                    
                    // Update buyer identity
                    fetch(graphqlEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Shopify-Storefront-Access-Token': '' // TODO: Add storefront access token
                        },
                        body: JSON.stringify({
                            query: buyerIdentityMutation,
                            variables: buyerIdentityVariables
                        })
                    })
                    .then(response => response.json())
                    .then(identityData => {
                        if (identityData.data && identityData.data.cartBuyerIdentityUpdate && identityData.data.cartBuyerIdentityUpdate.cart) {
                            // Redirect to checkout after successful identity update
                            const checkoutUrl = data.data.cartCreate.cart.checkoutUrl;
                            if (checkoutUrl) {
                                window.location.href = checkoutUrl;
                            }
                        } else if (identityData.data && identityData.data.cartBuyerIdentityUpdate && identityData.data.cartBuyerIdentityUpdate.userErrors) {
                            // Still redirect to checkout even if identity update fails
                            const checkoutUrl = data.data.cartCreate.cart.checkoutUrl;
                            if (checkoutUrl) {
                                window.location.href = checkoutUrl;
                            }
                        } else {
                            // Still redirect to checkout
                            const checkoutUrl = data.data.cartCreate.cart.checkoutUrl;
                            if (checkoutUrl) {
                                window.location.href = checkoutUrl;
                            }
                        }
                    })
                    .catch(identityError => {
                        // Still redirect to checkout even if identity update fails
                        const checkoutUrl = data.data.cartCreate.cart.checkoutUrl;
                        if (checkoutUrl) {
                            window.location.href = checkoutUrl;
                        }
                    });
                    
                } else if (data.data && data.data.cartCreate && data.data.cartCreate.userErrors) {
                    // Reset button state on error
                    button.textContent = 'AUTOCHECKOUT';
                    button.disabled = false;
                } else {
                    // Reset button state on error
                    button.textContent = 'AUTOCHECKOUT';
                    button.disabled = false;
                }
            })
            .catch(error => {
                // Reset button state on error
                button.textContent = 'AUTOCHECKOUT';
                button.disabled = false;
            });
        });
    });
}

})();
