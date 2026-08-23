# bitcoin-forensics

## Assumptions (pending real dataset)
- Timestamps assumed UTC if no timezone info is present in source data.
  **Must re-verify once the organizer's actual dataset is provided** —
  if it uses local time or mixed timezones, this normalization is wrong
  and needs revisiting before the graph/ML layers trust timing correlation.
- fee / script_type: pipeline supports both fields but defaults to null
  if absent from source data. Not yet confirmed whether the real dataset
  includes them.
  
- GeoIP enrichment: some src/dst IPs may return null country/ASN. This
  is expected — either the IP falls in a private/reserved range (10.x,
  127.x, 100.64.0.0/10, etc.) with no geographic data by design, or the
  free GeoLite2-ASN database has sparser coverage than GeoLite2-City for
  some public IPs. City and ASN lookups are now independent, so a partial
  result (e.g. country known, ASN unknown) is preserved instead of being
  discarded entirely. Real organizer-provided IPs should resolve at a
  meaningfully higher rate.