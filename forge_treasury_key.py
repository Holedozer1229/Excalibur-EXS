import hashlib

# THE AXIOM (Public)
AXIOM = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"

def generate_merlin_credentials(name, email, kings_secret):
    # Create the "Merlin Vector"
    vector = f"{name}|{email}|{kings_secret}".encode()
    # 1.2 Million Rounds for the King's Key
    master_seed = hashlib.pbkdf2_hmac('sha512', AXIOM.encode(), vector, 1200000, 64)
    
    merlin_id = hashlib.sha256(master_seed[:32]).hexdigest()[:16]
    access_key = master_seed[32:].hex()
    
    print("--- MERLIN'S PORTAL CREDENTIALS ---")
    print(f"IDENTITY: King Arthur ({name})")
    print(f"PORTAL ID: MERLIN-{merlin_id}")
    print(f"ACCESS KEY: {access_key}")
    print("-----------------------------------")
    print("SAVE THIS. This key controls the $EXS Treasury.")

if __name__ == "__main__":
    name = input("Enter your name: ")
    email = input("Enter your email: ")
    kings_secret = input("Enter your Kings Secret phrase: ")
    generate_merlin_credentials(name, email, kings_secret)
