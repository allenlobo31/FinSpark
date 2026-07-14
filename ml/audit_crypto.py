"""
Quantum-Safe Audit Layer
Signs event/alert records with Dilithium (ML-DSA), encrypts with Kyber (ML-KEM).

Uses liboqs-python when available, falls back to a shimmed implementation
using cryptography library for the symmetric encryption portion.

NOTE: liboqs is experimental / not FIPS-validated. This is explicitly documented.
Real banking would use FIPS-validated PQC modules.
"""

import os
import sys
import json
import base64
import hashlib
import time
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import db

# Try to import liboqs, fall back gracefully
_HAS_LIBOQS = False
try:
    import oqs
    _HAS_LIBOQS = True
except ImportError:
    pass

# Always available — standard crypto library for AES-GCM symmetric encryption
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization

# Key storage directory
KEY_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'keys')
os.makedirs(KEY_DIR, exist_ok=True)

# --- Dilithium Signing ---

_dilithium_keys = None

def _get_dilithium_keys():
    """Load or generate Dilithium keypair."""
    global _dilithium_keys
    if _dilithium_keys:
        return _dilithium_keys

    pub_path = os.path.join(KEY_DIR, 'dilithium_pub.bin')
    sec_path = os.path.join(KEY_DIR, 'dilithium_sec.bin')

    if os.path.exists(pub_path) and os.path.exists(sec_path):
        with open(pub_path, 'rb') as f:
            pub = f.read()
        with open(sec_path, 'rb') as f:
            sec = f.read()
        _dilithium_keys = (pub, sec)
        return _dilithium_keys

    if _HAS_LIBOQS:
        signer = oqs.Signature('Dilithium3')
        pub = signer.generate_keypair()
        sec = signer.export_secret_key()
        with open(pub_path, 'wb') as f:
            f.write(pub)
        with open(sec_path, 'wb') as f:
            f.write(sec)
        _dilithium_keys = (pub, sec)
        return _dilithium_keys
    else:
        # Fallback: use HMAC-SHA256 as a signing stand-in
        # Honestly documented: this is NOT post-quantum, used when liboqs unavailable
        key = os.urandom(32)
        with open(pub_path, 'wb') as f:
            f.write(key)
        with open(sec_path, 'wb') as f:
            f.write(key)
        _dilithium_keys = (key, key)
        return _dilithium_keys


def sign_event(event_json):
    """Sign an event JSON string with Dilithium (or HMAC fallback)."""
    pub, sec = _get_dilithium_keys()
    message = event_json.encode('utf-8') if isinstance(event_json, str) else event_json

    if _HAS_LIBOQS:
        signer = oqs.Signature('Dilithium3', secret_key=sec)
        signature = signer.sign(message)
    else:
        # HMAC-SHA256 fallback (honestly labeled)
        import hmac
        signature = hmac.new(sec, message, hashlib.sha256).digest()

    return base64.b64encode(signature).decode('ascii')


def verify_signature(event_json, signature_b64):
    """Verify a Dilithium signature (or HMAC fallback)."""
    pub, sec = _get_dilithium_keys()
    message = event_json.encode('utf-8') if isinstance(event_json, str) else event_json
    signature = base64.b64decode(signature_b64)

    if _HAS_LIBOQS:
        verifier = oqs.Signature('Dilithium3')
        return verifier.verify(message, signature, pub)
    else:
        import hmac
        expected = hmac.new(sec, message, hashlib.sha256).digest()
        return hmac.compare_digest(signature, expected)


# --- Kyber Encryption ---

_kyber_keys = None

def _get_kyber_keys():
    """Load or generate Kyber keypair."""
    global _kyber_keys
    if _kyber_keys:
        return _kyber_keys

    pub_path = os.path.join(KEY_DIR, 'kyber_pub.bin')
    sec_path = os.path.join(KEY_DIR, 'kyber_sec.bin')

    if os.path.exists(pub_path) and os.path.exists(sec_path):
        with open(pub_path, 'rb') as f:
            pub = f.read()
        with open(sec_path, 'rb') as f:
            sec = f.read()
        _kyber_keys = (pub, sec)
        return _kyber_keys

    if _HAS_LIBOQS:
        kem = oqs.KeyEncapsulation('Kyber768')
        pub = kem.generate_keypair()
        sec = kem.export_secret_key()
        with open(pub_path, 'wb') as f:
            f.write(pub)
        with open(sec_path, 'wb') as f:
            f.write(sec)
        _kyber_keys = (pub, sec)
        return _kyber_keys
    else:
        # Fallback: use a random AES key directly
        # Honestly documented: this is NOT post-quantum KEM
        key = os.urandom(32)
        with open(pub_path, 'wb') as f:
            f.write(key)
        with open(sec_path, 'wb') as f:
            f.write(key)
        _kyber_keys = (key, key)
        return _kyber_keys


def encrypt_event(event_json):
    """Encrypt event with Kyber-derived key + AES-256-GCM."""
    pub, sec = _get_kyber_keys()
    plaintext = event_json.encode('utf-8') if isinstance(event_json, str) else event_json

    if _HAS_LIBOQS:
        kem = oqs.KeyEncapsulation('Kyber768')
        ciphertext_kem, shared_secret = kem.encap_secret(pub)
        # Use first 32 bytes of shared secret as AES key
        aes_key = shared_secret[:32]
        encapsulated = base64.b64encode(ciphertext_kem).decode('ascii')
    else:
        # Fallback: derive key from stored secret
        aes_key = hashlib.sha256(sec).digest()
        encapsulated = base64.b64encode(b'fallback-no-kem').decode('ascii')

    # AES-256-GCM encryption
    nonce = os.urandom(12)
    aesgcm = AESGCM(aes_key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)

    # Pack nonce + ciphertext
    encrypted = base64.b64encode(nonce + ciphertext).decode('ascii')
    return encrypted, encapsulated


def decrypt_event(encrypted_b64, encapsulated_b64):
    """Decrypt event using Kyber secret key + AES-256-GCM."""
    pub, sec = _get_kyber_keys()
    raw = base64.b64decode(encrypted_b64)
    nonce = raw[:12]
    ciphertext = raw[12:]

    if _HAS_LIBOQS:
        kem = oqs.KeyEncapsulation('Kyber768', secret_key=sec)
        encapsulated = base64.b64decode(encapsulated_b64)
        shared_secret = kem.decap_secret(encapsulated)
        aes_key = shared_secret[:32]
    else:
        aes_key = hashlib.sha256(sec).digest()

    aesgcm = AESGCM(aes_key)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext.decode('utf-8')


def audit_record(event_type, event_id, payload_dict):
    """
    Sign, encrypt, and persist an audit record.
    Called after risk scores, alerts, or policy actions are written.
    """
    payload_json = json.dumps(payload_dict, default=str)
    signature = sign_event(payload_json)
    encrypted, encapsulated = encrypt_event(payload_json)

    algo_sign = 'Dilithium3' if _HAS_LIBOQS else 'HMAC-SHA256-FALLBACK'
    algo_enc = 'Kyber768+AES256GCM' if _HAS_LIBOQS else 'AES256GCM-FALLBACK'

    db.execute("""
        INSERT INTO audit_log (event_type, event_id, original_payload, signed_payload, signature,
                               encrypted_payload, encapsulated_key, algorithm_sign, algorithm_enc, event_timestamp)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        event_type, event_id, payload_json, payload_json, signature,
        encrypted, encapsulated, algo_sign, algo_enc, datetime.now()
    ))

    return {
        'algorithm_sign': algo_sign,
        'algorithm_enc': algo_enc,
        'signature_length': len(base64.b64decode(signature)),
        'ciphertext_length': len(base64.b64decode(encrypted)),
        'verified': verify_signature(payload_json, signature),
        'decrypted_matches': decrypt_event(encrypted, encapsulated) == payload_json,
    }


if __name__ == '__main__':
    # Quick self-test
    print(f'\nliboqs available: {_HAS_LIBOQS}')
    test_payload = {'event': 'test', 'user': 'ravi_dba', 'score': 85, 'timestamp': str(datetime.now())}
    test_json = json.dumps(test_payload)

    print(f'\nSigning test...')
    sig = sign_event(test_json)
    print(f'  Signature (base64, first 40 chars): {sig[:40]}...')
    print(f'  Verified: {verify_signature(test_json, sig)}')

    print(f'\nEncryption test...')
    enc, encap = encrypt_event(test_json)
    print(f'  Encrypted (base64, first 40 chars): {enc[:40]}...')
    dec = decrypt_event(enc, encap)
    print(f'  Decrypted matches original: {dec == test_json}')

    print(f'\nAlgorithms used:')
    print(f'  Signing: {"Dilithium3" if _HAS_LIBOQS else "HMAC-SHA256 (fallback)"}')
    print(f'  Encryption: {"Kyber768 + AES-256-GCM" if _HAS_LIBOQS else "AES-256-GCM (fallback, no KEM)"}')
