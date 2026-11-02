#!/usr/bin/env node
// Import an operator-reviewed JSON export. Fetching NZTA automatically is not assumed:
// their site may block automated requests, and a partial scrape must not replace data.
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
const [input,flag]=process.argv.slice(2);if(!input||flag!=='--reviewed'){console.error('Usage: node server/import-cameras.mjs /path/reviewed.json --reviewed');process.exit(1);}
const data=JSON.parse(readFileSync(input,'utf8'));if(!/^\d{4}-\d{2}-\d{2}$/.test(data.sourceUpdated)||!data.source||!data.sourceUrl||!data.license||!Array.isArray(data.cameras)||data.cameras.length<1||data.cameras.length>10000)throw Error('Invalid metadata');
const ids=new Set();for(const c of data.cameras){if(typeof c.id!=='string'||ids.has(c.id)||typeof c.road!=='string'||typeof c.type!=='string'||!Number.isFinite(c.lat)||!Number.isFinite(c.lon)||c.lat< -48||c.lat> -33||c.lon<165||c.lon>180)throw Error('Invalid camera record');ids.add(c.id);}
const file=new URL('./cameras.json',import.meta.url),old=JSON.parse(readFileSync(file,'utf8'));if(data.cameras.length<old.cameras.length*0.8)throw Error('More than 20% of records missing; investigate before replacing the dataset');
writeFileSync(new URL('./cameras.json.previous',import.meta.url),JSON.stringify(old,null,2));const tmp=new URL('./cameras.json.tmp',import.meta.url);writeFileSync(tmp,JSON.stringify(data,null,2)+'\n');renameSync(tmp,file);console.log('Imported '+ids.size+' camera locations. Rebuild/restart the server, then use Update camera database in the app. Copy this file to Android assets before building a new APK.');
