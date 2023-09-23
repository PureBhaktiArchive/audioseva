// API Reference: https://www.wix.com/velo/reference/api-overview/introduction
// “Hello, World!” Example: https://learn-code.wix.com/en/article/1-hello-world
import { checkout } from 'backend/stripe.jsw';
import { currencyOptions } from 'public/currencies.js';
import wixLocation from 'wix-location';
import wixWindowFrontend from 'wix-window-frontend';

$w.onReady(function () {
  $w('#dropdownCurrency').options = currencyOptions();
  $w('#buttonDonate').onClick(donate);
});

/**
 *	Adds an event handler that runs when the element is clicked.
 *	 @param {$w.MouseEvent} event
 */
async function donate(event) {
  if (!$w('#inputAmount').valid || !$w('#dropdownCurrency').valid) {
    $w('#textError').text = 'Enter valid amount and pick a currency';
    $w('#textError').expand();
    return;
  }

  $w('#textError').collapse();
  $w('#buttonDonate').disable();
  try {
    const checkoutURL = await checkout(
      $w('#inputAmount').value,
      $w('#dropdownCurrency').value,
      $w('#radioRecurring').value === 'monthly'
    );
    if (wixWindowFrontend.viewMode === 'Preview') {
      console.log(checkoutURL);
      $w('#buttonDonate').enable();
    } else wixLocation.to(checkoutURL);
  } catch (error) {
    $w('#textError').text = error;
    $w('#textError').expand();
    $w('#buttonDonate').enable();
  }
}
