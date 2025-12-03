#ifndef ROOT_CA_H
#define ROOT_CA_H

// Root CA certificate for HTTPS connections
// Domain: cides06.gm.fh-koeln.de
// Generated: Mon Nov 10 04:05:48 PM CET 2025

const char* root_ca = 
"---\n"
"Server certificate\n"
"subject=CN = cides06.gm.fh-koeln.de\n"
"issuer=C = US, O = Let's Encrypt, CN = E8\n"
"---\n"
"No client certificate CA names sent\n"
"Peer signing digest: SHA256\n"
"Peer signature type: ECDSA\n"
"Server Temp Key: X25519, 253 bits\n"
"---\n"
"SSL handshake has read 2427 bytes and written 404 bytes\n"
"Verification: OK\n"
"---\n"
"New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384\n"
"Server public key is 256 bit\n"
"Secure Renegotiation IS NOT supported\n"
"Compression: NONE\n"
"Expansion: NONE\n"
"No ALPN negotiated\n"
"Early data was not sent\n"
"Verify return code: 0 (ok)\n"
"---\n";

#endif // ROOT_CA_H
