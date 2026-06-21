const CART_ACTION_UI_TIMEOUT_MS = 4500;

export function waitForCartUi(action: Promise<void>, timeoutMs = CART_ACTION_UI_TIMEOUT_MS): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, timeoutMs);
    action
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timer));
  });
}