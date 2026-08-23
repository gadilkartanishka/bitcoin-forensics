# bitcoin-forensics
## Assumptions (pending real dataset)
- Timestamps assumed UTC if no timezone info is present in source data.
  **Must re-verify once the organizer's actual dataset is provided** —
  if it uses local time or mixed timezones, this normalization is wrong
  and needs revisiting before the graph/ML layers trust timing correlation.
- fee / script_type: pipeline supports both fields but defaults to null
  if absent from source data. Not yet confirmed whether the real dataset
  includes them.