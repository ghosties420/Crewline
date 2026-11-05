# Camera data provenance and limits

Source: https://github.com/nzjjay/nz-cctv — Jay J (2026), CC BY-NC 4.0.
Input `docs/cameras.json` Git blob: `e9e503d07356c86b0d9cbfb33d46922a927bd47c`, retrieved 3 November 2026. SHA-256 is recorded in the output JSON. The upstream README and licence are included alongside this file. Licence: https://creativecommons.org/licenses/by-nc/4.0/ . The source describes agency publications and OIA requests; Crewline has not independently verified each location or every underlying release.

Changes: filter, normalize and regroup records for a road-focused map. Of 9,715 source rows, 600 explicit ANPR records and 3,454 CCTV records are included. No inference from manufacturer or nearby cameras is used to label ANPR. Road CCTV is selected by road/traffic business category or an explicit road address, excluding known indoor facilities, transit facilities, parking and separately supplied enforcement categories. A road address does not prove what the camera can see. Unknown/ambiguous sites are omitted rather than advertised as road-facing cameras. Some included ANPR cameras may monitor car parks or access points. Duplicates across source datasets may remain; a record count is not a verified unique-device count.

Per-camera observation dates are absent. The upstream README contains collection/agency dates, some as old as 2022, and some conflicting availability notes. The UI therefore says "Not supplied per camera" and gives the retrieval date separately. Nothing is presented as live, verified, complete, or a list of every NZ camera. No feeds or footage are accessed. This dataset does not change the NZTA approach-warning database or add ANPR/CCTV audible warnings.

To reproduce:

```bash
python3 server/import-surveillance.py /path/to/upstream-cameras.json
```

The input must be the pinned Git blob above. Review the source and licence before importing any newer snapshot. No silent network updates are made by the app.

Noncommercial reuse only. Retain credit and licence links when redistributing this subset. Commercial use needs separate permission or replacement data. Publication of an agency record is not itself a guarantee that every possible downstream use is permitted.
