import {env} from 'cloudflare:workers';
import {database} from '../../../lib/db';

const owner='xWjbEIJx8uodSaRJCxcil9INPoODJ66tbQiFPWmhzO9w693PvDjWXg';
const record={
  provider:'Apple Health · Peloton',
  sourceId:'peloton-2026-09-17T20:31:15-07:00',
  title:'20 min Peloton Ride',
  workoutType:'Indoor cycling',
  minutes:20,
  startedAt:'2026-09-17T20:31:15-07:00',
  endedAt:'2026-09-17T20:51:15-07:00',
  averageHeartRate:101.97,
  maxHeartRate:131,
  activeEnergy:193,
  distanceKm:9.53469,
  averageCadence:null,
  maxCadence:null,
  aerobicEffect:null,
  anaerobicEffect:null,
  trainingLoad:null,
  intensityMinutes:null,
  bodyBatteryBefore:null,
  bodyBatteryAfter:null,
  recoveryHours:null,
  device:'Peloton · Garmin broadcast heart rate',
  importedAt:'2026-09-18T04:55:00.000Z',
  notes:'Completed Sep 17 at 8:31 PM Pacific. Verified through freddy from Apple Health/Peloton: 20 minutes, 193 active kcal, 9.53 km, average heart rate 102 bpm and peak heart rate 131 bpm. Garmin Connect is not currently connected to freddy, so Garmin-only recovery metrics were not available.',
  zones:[]
};

export async function POST(request:Request){
  const token=request.headers.get('x-capacity-import-token');
  if(!token||token!==(env as unknown as {CAPACITY_IMPORT_TOKEN?:string}).CAPACITY_IMPORT_TOKEN)return Response.json({error:'Forbidden'},{status:403});
  const id=owner+':peloton-2026-09-17-203115';
  await database().prepare('INSERT INTO records (id,owner,kind,day,payload) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET day=excluded.day,payload=excluded.payload WHERE records.owner=excluded.owner').bind(id,owner,'health','2026-09-17',JSON.stringify(record)).run();
  return Response.json({ok:true,id});
}
