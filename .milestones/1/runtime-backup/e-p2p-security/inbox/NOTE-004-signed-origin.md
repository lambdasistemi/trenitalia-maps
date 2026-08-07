# Ruling: trust = origin signatures, and that's it (pause still holds)
Supersedes the reputation direction in NOTE-003. Blockchain reputation is
DROPPED. Mechanism for P2P-SAMPLE-INTEGRITY: samples signed at origin;
peers verify the signature — trust in distributed knowledge reduces to
authenticity at source. Your remaining design space, deliberately small:
replay/staleness protection (timestamps/sequence in the signed payload),
flood/abuse bounds on the gossip layer, and key distribution to clients.
Threat-model those three; nothing heavier.
