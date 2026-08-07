# Research: Trenitalia v GoBright ("Trenìt!"), Trib. Roma 2019 — and our exposure

Agent-verified summary (full sources at bottom). Desk synthesis for M1 rulings.

## What actually happened
- Interim (cautelare) proceedings, Tribunale di Roma, sez. impresa, R.G.
  34006/2019. Ex parte order for Trenitalia 26 Jun 2019 (app suspended in
  July); revoked inter partes 4–5 Sep 2019; Trenitalia's requests rejected
  in full; app back online 6 Sep 2019. No appeal, merits judgment, or
  settlement on the public record; the app operates to this day.
- NOT decided on the spin-off doctrine: GoBright conceded Trenitalia's
  database-maker status, so a valid sui generis right was ASSUMED — and
  Trenitalia lost anyway.
- Ratio: Trenìt!'s scraping was per-user-query, on-demand, selective — no
  massive or permanent copying — hence extraction/reuse of NON-substantial
  parts, free under art. 102-ter l. aut. / art. 8 Dir. 96/9. Trenitalia's
  own evidence (~800k hits/day, ~30% of ViaggiaTreno traffic) held
  non-massive. Open Data Directive (EU) 2019/1024 used as interpretive lens
  to read "substantial part" restrictively. No prejudice to investment
  shown; blocking a comparator in a rail duopoly had anticompetitive
  overtones.
- Re-publication to the app's own users — our exact analogue — is precisely
  what was held lawful.
- CJEU CV-Online Latvia C-762/19 (2021) since raised the rightsholder bar
  further: infringement requires substantial taking AND a demonstrated risk
  the maker cannot recoup its investment.

## The limits the precedent draws (what is NOT safe)
1. Art. 102-bis co. 9 / art. 7(5): REPEATED AND SYSTEMATIC extraction of
   non-substantial parts that accretes toward the whole database remains
   actionable. Bulk-mirroring or maintaining a full live replica of the
   dataset is the wrong side of the line the court drew. Per-query,
   demand-driven access is the safe side.
2. Branding: keep "Trenitalia"/"ViaggiaTreno" OUT of project name/domain;
   descriptive use only. (Our repo is literally `trenitalia-maps`, site
   titled "Trenitalia Live" — rename advised in every scenario.)
3. Interim, first-instance, fact-specific — persuasive, not binding; the
   sui generis right itself was never tested here.
4. Practical residual risk: nuisance C&D / silent IP-blocking, not merits
   loss. Trenitalia showed willingness to obtain an ex parte shutdown.

## Desk synthesis — interaction with the oracle direction
The finding does NOT green-light the full-world Merkle oracle over real
data: continuously polling ALL trains to maintain a complete current-state
mirror is systematic wholesale harvesting — exactly the accretion pattern
the safe zone excludes (gray at best with no historical retention; the
historical archive variant is clearly red).

It DOES green-light a demand-driven shape, which composes with the thesis
elegantly: fetch upstream ONLY per viewer demand (Trenit-safe), pool the
community's fetched knowledge, commit Merkle roots over THAT rolling shared
cache, distribute partials + proofs p2p. The oracle then commits "what the
community has collectively learned", not a mirrored database — legally
per-query, architecturally still non-equivocating, and it makes per-train
staleness an honest, visible property of the system.

## Options for the operator
A. Stay sim-only (current ruling): zero legal surface; rename still advised.
B. Reopen real data in the demand-driven shape above: per-query proxy,
   no systematic sweep, no historical archive, attribution, modest rates,
   renamed project. RECOMMENDED if real data returns.
C. Full-state mirror over real data: advise against (accretion line).

## Key sources
https://portolano.it/en/newsletter/portolano-cavallo-inform-digital-ip/screen-scraping-to-what-extent-is-it-lawful
https://www.albertinilawfirm.eu/2019/10/21/un-interessante-caso-di-utilizzo-di-banca-dati-altrui-e-quindi-di-applicazione-del-diritto-sui-generis-sulla-medesima/
https://www.scribd.com/document/427675460/Tribunale-di-Roma-Ordinanza-sul-caso-Trenit-vs-Trenitalia
https://ipcuria.eu/case?reference=C-762%2F19
https://www.twobirds.com/en/insights/2021/uk/cv-online-latvia-cjeu-complicates-the-enforcement-of-database-rights
https://www.lexia.it/en/2024/10/31/web-scraping/
https://www.forumpa.it/open-government/open-data/trenitalia-e-trenit-tra-considerazioni-e-diritti-fantasiosi/
https://github.com/MarcoBuster/railway-opendata/blob/master/docs/VIAGGIATRENO.md
