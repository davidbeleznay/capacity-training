import {env} from 'cloudflare:workers';
import {database} from '../../../lib/db';

const owner='xWjbEIJx8uodSaRJCxcil9INPoODJ66tbQiFPWmhzO9w693PvDjWXg';
const strength={
  provider:'Garmin Connect',
  sourceId:'24403336019',
  title:'Strength',
  workoutType:'Strength training',
  minutes:10.05,
  startedAt:'2026-09-17T20:53:50-07:00',
  endedAt:'2026-09-17T21:03:53-07:00',
  averageHeartRate:105,
  maxHeartRate:161,
  activeEnergy:78,
  distanceKm:0,
  averageCadence:null,
  maxCadence:null,
  aerobicEffect:null,
  anaerobicEffect:null,
  trainingLoad:null,
  intensityMinutes:null,
  bodyBatteryBefore:null,
  bodyBatteryAfter:null,
  recoveryHours:null,
  device:'Garmin vívoactive 6',
  importedAt:'2026-09-18T05:05:00.000Z',
  notes:'Garmin activity 24403336019. Recorded immediately after the Peloton ride as a separate strength session. Garmin captured 603 seconds, 78 active kcal, 105 bpm average heart rate and 161 bpm peak heart rate, with 349 heart-rate samples.',
  zones:[]
};
const wellness={
  provider:'Garmin Connect',
  sourceId:'garmin-daily-2026-09-17',
  bodyBatteryMin:52,
  bodyBatteryMax:67,
  bodyBatteryCharged:6,
  bodyBatteryDrained:19,
  restingHeartRate:69,
  averageStress:27,
  maxStress:98,
  moderateIntensityMinutes:15,
  vigorousIntensityMinutes:6,
  steps:2287,
  activeEnergy:333,
  importedAt:'2026-09-18T05:05:00.000Z',
  notes:'Garmin daily context. This summary is displayed separately and is not counted as a workout.'
};

export async function POST(request:Request){
  const token=request.headers.get('x-capacity-import-token');
  if(!token||token!==(env as unknown as {CAPACITY_IMPORT_TOKEN?:string}).CAPACITY_IMPORT_TOKEN)return Response.json({error:'Forbidden'},{status:403});
  const db=database();
  await db.batch([
    db.prepare('INSERT INTO records (id,owner,kind,day,payload) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET day=excluded.day,payload=excluded.payload WHERE records.owner=excluded.owner').bind(owner+':garmin-24403336019',owner,'health','2026-09-17',JSON.stringify(strength)),
    db.prepare('INSERT INTO records (id,owner,kind,day,payload) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET day=excluded.day,payload=excluded.payload WHERE records.owner=excluded.owner').bind(owner+':garmin-daily-2026-09-17',owner,'wellness','2026-09-17',JSON.stringify(wellness))
  ]);
  return Response.json({ok:true,imported:2});
}
