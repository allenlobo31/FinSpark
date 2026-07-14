"""
RSA vs Kyber Comparison Demo
Demonstrates the same log entry encrypted with RSA-2048 vs Kyber-768.
Shows key sizes, ciphertext sizes, timing, and explains post-quantum resistance.
"""

import os
import sys
import json
import time
import base64
import hashlib

# Standard crypto for RSA
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ml'))

try:
    import oqs
    HAS_LIBOQS = True
except ImportError:
    HAS_LIBOQS = False

def rsa_encrypt_decrypt(plaintext):
    """RSA-2048 hybrid encryption (RSA-OAEP + AES-256-GCM)."""
    # Generate RSA keypair
    t0 = time.perf_counter()
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    keygen_time = time.perf_counter() - t0

    # Get key sizes
    pub_bytes = public_key.public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    priv_bytes = private_key.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())

    # Encrypt: generate AES key, encrypt with AES-GCM, wrap AES key with RSA-OAEP
    t1 = time.perf_counter()
    aes_key = os.urandom(32)
    nonce = os.urandom(12)
    aesgcm = AESGCM(aes_key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)

    wrapped_key = public_key.encrypt(
        aes_key,
        padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
    )
    encrypt_time = time.perf_counter() - t1

    # Decrypt
    t2 = time.perf_counter()
    unwrapped_key = private_key.decrypt(
        wrapped_key,
        padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
    )
    recovered = aesgcm.decrypt(nonce, ciphertext, None)
    decrypt_time = time.perf_counter() - t2

    return {
        'algorithm': 'RSA-2048 + AES-256-GCM',
        'public_key_size': len(pub_bytes),
        'private_key_size': len(priv_bytes),
        'ciphertext_size': len(wrapped_key) + len(nonce) + len(ciphertext),
        'wrapped_key_size': len(wrapped_key),
        'keygen_time_ms': round(keygen_time * 1000, 3),
        'encrypt_time_ms': round(encrypt_time * 1000, 3),
        'decrypt_time_ms': round(decrypt_time * 1000, 3),
        'round_trip_ok': recovered == plaintext,
    }


def kyber_encrypt_decrypt(plaintext):
    """Kyber-768 hybrid encryption (Kyber KEM + AES-256-GCM)."""
    if not HAS_LIBOQS:
        return {
            'algorithm': 'Kyber-768 + AES-256-GCM',
            'error': 'liboqs not installed — install liboqs-python to run this comparison',
            'note': 'Run: pip install liboqs-python (requires liboqs C library)',
        }

    # Generate Kyber keypair
    t0 = time.perf_counter()
    kem = oqs.KeyEncapsulation('Kyber768')
    pub = kem.generate_keypair()
    sec = kem.export_secret_key()
    keygen_time = time.perf_counter() - t0

    # Encrypt: encapsulate shared secret, use it as AES key
    t1 = time.perf_counter()
    ciphertext_kem, shared_secret = kem.encap_secret(pub)
    aes_key = shared_secret[:32]
    nonce = os.urandom(12)
    aesgcm = AESGCM(aes_key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    encrypt_time = time.perf_counter() - t1

    # Decrypt
    t2 = time.perf_counter()
    kem_dec = oqs.KeyEncapsulation('Kyber768', secret_key=sec)
    shared_secret_dec = kem_dec.decap_secret(ciphertext_kem)
    aes_key_dec = shared_secret_dec[:32]
    aesgcm_dec = AESGCM(aes_key_dec)
    recovered = aesgcm_dec.decrypt(nonce, ciphertext, None)
    decrypt_time = time.perf_counter() - t2

    return {
        'algorithm': 'Kyber-768 + AES-256-GCM',
        'public_key_size': len(pub),
        'private_key_size': len(sec),
        'ciphertext_size': len(ciphertext_kem) + len(nonce) + len(ciphertext),
        'encapsulated_key_size': len(ciphertext_kem),
        'keygen_time_ms': round(keygen_time * 1000, 3),
        'encrypt_time_ms': round(encrypt_time * 1000, 3),
        'decrypt_time_ms': round(decrypt_time * 1000, 3),
        'round_trip_ok': recovered == plaintext,
    }


def main():
    # Sample audit log entry — the SAME data encrypted both ways
    sample_event = {
        "event_type": "risk_score",
        "event_id": 1,
        "user": "ravi_dba",
        "role": "dba_senior",
        "risk_score": 87.5,
        "pattern_class": "malicious",
        "features": {
            "time_deviation": 3.2,
            "peer_deviation": 2.8,
            "data_volume": 4.1,
            "query_novelty": 0.95,
            "access_entropy": 3.5
        },
        "timestamp": "2026-07-14T12:00:00+05:30"
    }

    plaintext = json.dumps(sample_event).encode('utf-8')

    print('\n' + '=' * 70)
    print('  RSA-2048 vs Kyber-768 Encryption Comparison')
    print('  Same audit log entry encrypted with both algorithms')
    print('=' * 70)

    print(f'\n  Plaintext size: {len(plaintext)} bytes')
    print(f'  Plaintext: {json.dumps(sample_event, indent=2)[:200]}...\n')

    # RSA
    print('-' * 70)
    rsa_result = rsa_encrypt_decrypt(plaintext)
    print(f'  RSA-2048 + AES-256-GCM:')
    print(f'    Public key size:   {rsa_result["public_key_size"]:>6} bytes')
    print(f'    Private key size:  {rsa_result["private_key_size"]:>6} bytes')
    print(f'    Ciphertext size:   {rsa_result["ciphertext_size"]:>6} bytes')
    print(f'    Keygen time:       {rsa_result["keygen_time_ms"]:>8.3f} ms')
    print(f'    Encrypt time:      {rsa_result["encrypt_time_ms"]:>8.3f} ms')
    print(f'    Decrypt time:      {rsa_result["decrypt_time_ms"]:>8.3f} ms')
    print(f'    Round-trip OK:     {rsa_result["round_trip_ok"]}')

    # Kyber
    print('\n' + '-' * 70)
    kyber_result = kyber_encrypt_decrypt(plaintext)
    print(f'  Kyber-768 + AES-256-GCM:')
    if 'error' in kyber_result:
        print(f'    {kyber_result["error"]}')
        print(f'    {kyber_result["note"]}')
    else:
        print(f'    Public key size:   {kyber_result["public_key_size"]:>6} bytes')
        print(f'    Private key size:  {kyber_result["private_key_size"]:>6} bytes')
        print(f'    Ciphertext size:   {kyber_result["ciphertext_size"]:>6} bytes')
        print(f'    Keygen time:       {kyber_result["keygen_time_ms"]:>8.3f} ms')
        print(f'    Encrypt time:      {kyber_result["encrypt_time_ms"]:>8.3f} ms')
        print(f'    Decrypt time:      {kyber_result["decrypt_time_ms"]:>8.3f} ms')
        print(f'    Round-trip OK:     {kyber_result["round_trip_ok"]}')

    # Explanation
    print('\n' + '=' * 70)
    print('  WHY KYBER IS QUANTUM-RESISTANT AND RSA IS NOT')
    print('=' * 70)
    print('''
  RSA-2048 security relies on the difficulty of factoring large integers.
  Shor's algorithm on a quantum computer can factor these in polynomial
  time, completely breaking RSA. A sufficiently powerful quantum computer
  would recover the RSA private key from the public key.

  Kyber-768 is based on the Module Learning With Errors (MLWE) problem
  from lattice-based cryptography. No known quantum algorithm can solve
  MLWE efficiently. This makes Kyber resistant to both classical and
  quantum attacks.

  Key size trade-off:
  - Kyber public keys (~1,184 bytes) are larger than RSA-2048 (~294 bytes)
  - But Kyber encapsulated keys (~1,088 bytes) are similar to RSA ciphertexts (~256 bytes)
  - Kyber is generally FASTER than RSA for key generation and encapsulation

  NIST standardized Kyber as ML-KEM (FIPS 203) in August 2024.
  RSA should be phased out for new deployments by 2030 per NIST guidance.
''')

    if not HAS_LIBOQS:
        print('  [NOTE] liboqs-python is not installed on this system.')
        print('  The Kyber comparison above could not run.')
        print('  Install with: pip install liboqs-python')
        print('  (Requires liboqs C library to be installed first)')
        print()


if __name__ == '__main__':
    main()
