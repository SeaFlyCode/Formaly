export interface BrowserSupportStatus {
  supported: boolean
  message: string
}

export function checkBrowserSupport(): BrowserSupportStatus {
  const supported = typeof WebAssembly === 'object'

  return {
    supported,
    message: supported
      ? ''
      : "Votre navigateur ne supporte pas WebAssembly. La conversion PDF et la suppression de fond ne fonctionneront pas correctement. Merci d'utiliser une version récente de Chrome, Firefox, Safari ou Edge.",
  }
}
