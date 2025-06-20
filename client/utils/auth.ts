export function createCodeVerifier() {
  const array = new Uint32Array(32);
  window.crypto.getRandomValues(array);
  // The octet sequence is then base64url-encoded to produce a
  // 43-octet URL safe string to use as the code verifier.
  const base64String = btoa(String.fromCharCode(...new Uint8Array(array)));
  return base64String.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * code_challenge = BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))
 */
export async function createCodeChallenge(codeVerifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const base64String = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64String.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
