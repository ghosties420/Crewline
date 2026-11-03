# NZ CCTV Camera Map

This project intends to visually show the locations, purpose, and owner of public CCTV cameras across New Zealand. This serves several purposes:
- Research: There are numerous research projects underway globally around the use of CCTV. This aims to capture as many cameras used by public entities to help with data collection for research purposes. For example, you may overlay this data against crash, crime, or other data-sets to understand relationships between CCTV coverage and another factor.
- For victims of crime, this hopefully provides meaningful insight into public safety and helps liasion with Police to find evidence.
- There are many Official Information Act requests made every year to various government agencies requesting the locations of CCTV cameras, this aims to reduce these requests and free up government time on OIA requests which are high overhead.
- Principle 6 of the Privacy Act gives people the basic right to access information about themselves, including CCTV recordings. If you need to find information about yourself via CCTV, this project aims to ease that for you.
- There are many, many requests made every year to Auckland Transport requesting traffic incident footage, often in areas without CCTV coverage, which again takes up valuable council time. By viewing this map first, it may reduce these requests if there is no coverage.
- Feel safer: Knowing where cameras are hopefully provides re-assurance about the safety in the areas you are in.

The data provided is not updated frequently, and should not be relied upon as the source of truth. For the latest information, please contact your relevant council.

All data on this map is publicly sourced, either directly from Council websites, or from past Official Information Act requests from others.

[![View CCTV Map](https://img.shields.io/badge/View%20CCTV%20Map-blue?style=for-the-badge&logo=googlemaps&logoColor=white)](https://nzjjay.github.io/nz-cctv/)

There have been several news articles on surveillance in New Zealand
- https://www.auckland.ac.nz/en/news/2025/07/30/smile-for-the-camera-when-smart-technology-tips-into-surveillance.html
- https://www.rnz.co.nz/news/crime-and-justice/552520/the-cameras-watching-over-us

  
---

### Current data sources

| City / Region | Agency | Dataset | Cameras | Last Updated |
|---|---|---|---|---|
| Auckland | Auckland Transport | Public-facing CCTV & ANPR cameras (OIA release) https://fyi.org.nz/request/33410-cctv-and-anpr-cameras | 4,990 | Feb 2026 |
| Hamilton | Hamilton City Council (CitySafe) | CCTV & ANPR camera locations (LGOIMA release) https://fyi.org.nz/request/32029-cctv-and-anpr-cameras | 837 | Aug 2025 |
| Christchurch | Christchurch City Council | Public CCTV & ANPR camera locations (OIA release) https://fyi.org.nz/request/29318-cctv-and-anpr-cameras | 287 | Mar 2026 |
| Wellington | Wellington City Council | City Safety CCTV camera locations (ArcGIS open layer) https://www.arcgis.com/home/item.html?id=500e7a1fac434fe784eda87bac2c2e3a | 173 | Jun 2026 |
| Taupo / Mangakino / Turangi | Taupo District Council | Public-facing CCTV cameras (OIA release) https://fyi.org.nz/request/29152-cctv-and-anpr-cameras | 69 | Nov 2024 |
| Queenstown / Wanaka / Arrowtown | Queenstown Lakes District Council | CCTV cameras (ArcGIS open layer) https://experience.arcgis.com/experience/80c97d34e5764669bb9aab99e40d5b8d/ | 239 | Jun 2026 |
| Rotorua | Rotorua Lakes Council | CCTV & ANPR cameras (OIA release) https://www.rotorualakescouncil.nz/our-council/news/news?item=id:2h7fiuxzh17q9sji5su5 | 124 | 2025 |
| Invercargill | Invercargill City Council | CCTV camera locations (map image via OIA — coordinates approximate) https://www.icc.govt.nz/community/community-safety-cctv-cameras | 25 | Apr 2025 |
| Lower Hutt | Hutt City Council | CCTV camera locations (ArcGIS dashboard) https://maps.huttcity.govt.nz/portal/apps/dashboards/ebb7fe2569804241ba64ce7dad8efd8c | 196 | Jun 2025 |
| Napier | Napier City Council | CCTV camera locations at NCC facilities (ArcGIS open layer) https://www.napier.govt.nz/assets/Document-Library/Publications/Maps/napier-cctv-camera-locations-map.pdf | 25 | Jun 2026 |
| Nelson | Nelson City Council | CCTV & traffic camera locations (LGOIMA releases) https://www.nelsoncity.co.nz/assets/Our-council/Downloads/official-information/lgoima-responses/2021/LGOIMA-CCTV-24NOV2021_Redacted-Council-Property-Management.pdf | 67 | Mar 2022 |
| Nationwide | NZ Transport Agency (NZTA) | Safety cameras — in enforcement & under construction (OIA release) | 115 | Sep 2025 |
| Nationwide | NZ Transport Agency (NZTA) | Live traffic cameras (ArcGIS public layer) | 224 | Jun 2026 |
| Whakatane / Murupara / Edgecumbe / Matata / Thornton / Awakeri / Te Teko / Taneatua | Whakatane District Council | CCTV & ANPR camera asset register (OIA release) | 80 | Jun 2025 |
| Katikati / Waihi Beach / Omokoroa / Paengaroa / Te Puke / Pukehina / Pahoia / Te Puna | Western Bay of Plenty District Council | Community CCTV grant scheme camera locations (public website) https://www.westernbay.govt.nz/community/grants-and-funding/cctv | 29 | Jun 2025 |
| Tauranga / Mount Maunganui / Papamoa / Rotorua | Tauranga City Council | CCTV & ANPR camera register (LGOIMA release) https://fyi.org.nz/request/29315-cctv-and-anpr-cameras | 381 | Nov 2024 |
| Dunedin | Dunedin City Council / NZTA | Traffic camera locations (LGOIMA release) https://fyi.org.nz/request/29319-cctv-and-anpr-cameras | 59 | 2024 |
| Westport | Buller District Council | CCTV camera locations (OIA release) https://bullerdc.govt.nz/media/wvpignxk/request-for-buller-council-camera-network-information.pdf | 6 | 2024 |
| Cape Reinga | Far North District Council | CCTV camera locations | 2 | Jun 2026 |
| Whangarei | Whangarei District Council | CCTV camera locations (OIA release — agency does not hold exact coordinates) https://www.wdc.govt.nz/Community/Safer-communities/CCTV | 31 | Jun 2026 |
| Palmerston North | Palmerston North City Council | CCTV camera locations (LGOIMA release — agency does not hold exact coordinates) https://fyi.org.nz/request/29153-cctv-and-anpr-cameras | 165 | 2024 |
| Cambridge / Te Awamutu / Kihikihi / Leamington / Ngāhinapōuri / Wharepapa South | Waipa District Council | CCTV camera locations (public website) https://www.waipadc.govt.nz/our-services/roads-and-footpaths/roads/closed-circuit-television-cctv | 25 | Jun 2026 |
| Nationwide | NZ Transport Agency (NZTA) | State highway operations & traffic CCTV camera coordinates (OIA release — supersedes the earlier Auckland-only OIA-22477 dataset) | 694 | Jul 2026 |
| Thames / Coromandel / Whitianga / Whangamata / Tairua / Pauanui / Matarangi | Thames-Coromandel District Council | CCTV register (council OIA release — site addresses geocoded, no exact coordinates held) | 29 sites (~96 cameras) | 2025 |
| Whanganui | Whanganui District Council | CCTV camera locations (RNZ OIA dataset) | 26 | Apr 2022 |
| Porirua | Porirua City Council | CCTV camera locations (RNZ OIA dataset) | 64 | Apr 2022 |
| Upper Hutt | Upper Hutt City Council | CCTV camera locations (RNZ OIA dataset) | 53 | Apr 2022 |
| Masterton / Carterton / South Wairarapa | Masterton District Council / Carterton District Council / South Wairarapa District Council | CCTV camera locations (RNZ OIA dataset) | 29 | Apr 2022 |
| New Plymouth / Stratford / South Taranaki | New Plymouth District Council / Stratford District Council / South Taranaki District Council / Taranaki Regional Council | CCTV camera locations (RNZ OIA dataset) | 79 | Apr 2022 |
| Waimakariri / Ashburton / Hurunui / Kaikōura / Mackenzie / Waimate | Canterbury councils | CCTV camera locations (RNZ OIA dataset) | 176 | Apr 2022 |
| Timaru / Waitaki | South Canterbury councils | CCTV camera locations (RNZ OIA dataset) | 31 | Apr 2022 |
| Gisborne | Gisborne District Council | CCTV camera locations (RNZ OIA dataset) | 13 | Apr 2022 |
| Wairoa | Wairoa District Council | CCTV camera locations (RNZ OIA dataset) | 14 | Apr 2022 |
| Hawke's Bay | Hawkes Bay Regional Council / Central Hawke's Bay District Council | CCTV camera locations (RNZ OIA dataset) | 9 | Apr 2022 |
| Nelson / Tasman | Tasman District Council | CCTV camera locations (RNZ OIA dataset) | 46 | Apr 2022 |
| Waikato | South Waikato / Waitomo / Otorohanga / Matamata-Piako / Kaipara | CCTV camera locations (RNZ OIA dataset) | 56 | Apr 2022 |
| Kawerau | Kawerau District Council | CCTV camera locations (RNZ OIA dataset) | 25 | Apr 2022 |
| Ōpōtiki | Opotiki District Council | CCTV camera locations (RNZ OIA dataset) | 12 | Apr 2022 |
| Northland | Northland Regional Council / Kaipara District Council | CCTV camera locations (RNZ OIA dataset) | 27 | Apr 2022 |
| Otago / Southland | Central Otago / Clutha / Gore / Waitaki | CCTV camera locations (RNZ OIA dataset) | 34 | Apr 2022 |
| West Coast | West Coast Regional Council / Grey District Council / Westland District Council | CCTV camera locations (RNZ OIA dataset) | 8 | Apr 2022 |
| Rangitīkei | Rangitikei District Council | CCTV camera locations (RNZ OIA dataset) | 4 | Apr 2022 |
| Wellington | Wellington Regional Council | CCTV camera locations (RNZ OIA dataset) | 73 | Apr 2022 |
| Nationwide | NZ Police | CCTV camera locations (RNZ OIA dataset) | 45 | Apr 2022 |
| Nationwide | NIWA / GNS / Metservice | Environmental monitoring camera locations (RNZ OIA dataset) | 58 | Apr 2022 |

---

## Pending data sources

| City / Region | Agency | Status | Notes |
|---|---|---|---|
| New Plymouth | New Plymouth District Council | Refused (OIA) / Partial (RNZ 2022) | Refused under s7(2)(j) LGOIMA — [fyi.org.nz/request/29151](https://fyi.org.nz/request/29151-cctv-and-anpr-cameras); 42 approximate locations added via RNZ 2022 dataset |
| Waikato Region | Waikato Regional Council | Minimal held | Minimal information held — [fyi.org.nz/request/29316](https://fyi.org.nz/request/29316-cctv-and-anpr-cameras) |
| Bay of Plenty | Bay of Plenty Regional Council | Available, not added | Only covers their own assets, not public safety cameras — [fyi.org.nz/request/29317](https://fyi.org.nz/request/29317-cctv-and-anpr-cameras) |
| Palmerston North | Palmerston North City Council | Available, not usable | Do not hold co-ordinates on cameras — [fyi.org.nz/request/29153](https://fyi.org.nz/request/29153-cctv-and-anpr-cameras) |
| Dunedin | Dunedin City Council | Available, not usable | Do not hold co-ordinates on cameras — [fyi.org.nz/request/29319](https://fyi.org.nz/request/29319-cctv-and-anpr-cameras) |
| Auckland | Auckland Council | Not requested | City safety / public space cameras operated directly by Auckland Council (distinct from Auckland Transport) |
| Manawatū-Whanganui Region | Horizons Regional Council | Not requested | |
| Canterbury Region | Environment Canterbury | Not requested | |
| Southland Region | Environment Southland | Not requested | |
| Otago Region | Otago Regional Council | Not requested | |
| Hauraki | Hauraki District Council | Not requested | |
| Horowhenua | Horowhenua District Council | Not requested | |
| Kāpiti Coast | Kāpiti Coast District Council | Not requested | |
| Manawatū | Manawatū District Council | Not requested | |
| Ruapehu | Ruapehu District Council | Not requested | |
| Tararua | Tararua District Council | Not requested | |
| Waikato | Waikato District Council | Not requested | |
| Chatham Islands | Chatham Islands Council | Not requested | |
| Marlborough | Marlborough District Council | Not requested | Unitary authority |
| Selwyn | Selwyn District Council | Not requested | |
| Southland | Southland District Council | Not requested | |

---

## Privacy Act 2020

The placement and operation of CCTV cameras in public spaces is governed by the **[Privacy Act 2020](https://www.legislation.govt.nz/act/public/2020/0031/latest/LMS23223.html)** (NZ). Key principles relevant to public CCTV include:

- **Information Privacy Principle 1** — Agencies must only collect personal information (including imagery) for a lawful purpose connected to their functions.
- **Information Privacy Principle 3** — Where practicable, individuals should be aware they are being recorded and why.
- **Information Privacy Principle 4** — Personal information must not be collected by unlawful means or by means that intrude to an unreasonable extent on personal affairs.

The Office of the Privacy Commissioner has published guidance on CCTV use: [privacy.org.nz/privacy-act-2020/codes-of-practice/](https://www.privacy.org.nz/privacy-act-2020/codes-of-practice/)

This project only maps **publicly disclosed** camera locations obtained through official information requests or published open data. No imagery or footage is collected or displayed.

---

## Contributing

CCTV camera networks exist across New Zealand — councils, NZTA, Police, and private operators all run cameras in public spaces. This map is only as complete as the data behind it.

### How to add a new data source

If you have access to publicly available camera data for a New Zealand agency (via OIA release, open data portal, or official publication):

1. **Fork this repository**
2. Add your source data and updated `docs/cameras.json`
3. Update the data sources table in this README
4. **Open a Pull Request** describing the agency, how the data was obtained, and the date of the data

### Don't have the data yet?

- **Open a Discussion** in the [Discussions tab](../../discussions) to suggest an agency or region to target with an OIA request
- **Leave a comment on an Issue** if you have partial information or want to collaborate on a request

### OIA request tips

Please do not make OIA requests if you don't have to. This wastes valuable resources of government agencies. New Zealand's **[Official Information Act 1982](https://www.legislation.govt.nz/act/public/1982/0156/latest/DLM64785.html)** gives you the right to request camera location data from government agencies. A useful template:

> *"Please provide the locations (street address or GPS coordinates) of all CCTV cameras operated by [Agency] in public spaces, including camera type and whether automatic number plate recognition (ANPR) is used."*

[FYI.org.nz](https://fyi.org.nz) makes it easy to submit and track OIA requests publicly.

---

## Licence

This project (data and code) is licensed under the **[Creative Commons Attribution-NonCommercial 4.0 International licence (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/)**. You may share and adapt the material for non-commercial purposes with attribution. Commercial use is not permitted.

Camera location data is sourced from New Zealand government agencies and is reproduced here for non-commercial public interest purposes.

## Thank-you

A special thank-you to past OIA requestors who have already done much of the hard mahi required to collate this data.
