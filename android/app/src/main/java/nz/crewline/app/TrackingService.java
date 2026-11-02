package nz.crewline.app;
import android.app.*;import android.content.*;import android.location.*;import android.os.*;import org.json.*;import java.util.concurrent.*;

// User-started location foreground service: remains active when Activity is paused or screen locked.
public class TrackingService extends Service implements LocationListener {
 static volatile TrackingService instance;
 static final ExecutorService network=Executors.newSingleThreadExecutor();
 LocationManager manager;Store store;boolean sharing,exploring,cameras;CameraAlerts cameraAlerts;String epoch="";String serverUrl="",sessionToken="";volatile boolean uploadPending=false;long lastSent=0;boolean destroyed=false;int generation=0;
 static JSONObject state(Context c){JSONObject o=new JSONObject();try{o.put("sharing",instance!=null&&instance.sharing);o.put("exploring",instance!=null&&instance.exploring);o.put("cameras",instance!=null&&instance.cameras);o.put("cameraStatus",Store.prefs(c).getString("cameraStatus",""));o.put("status",Store.prefs(c).getString("trackingStatus","Stopped"));}catch(Exception ignored){}return o;}
 public void onCreate(){super.onCreate();instance=this;serverUrl=Store.prefs(this).getString("server","");sessionToken=Store.token(this);store=new Store(this);manager=(LocationManager)getSystemService(LOCATION_SERVICE);NotificationChannel ch=new NotificationChannel("drive","Drive tracking",NotificationManager.IMPORTANCE_LOW);((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(ch);}
 public int onStartCommand(Intent intent,int flags,int id){
  if(intent==null){stopSelf();return START_NOT_STICKY;}
  if("STOP".equals(intent.getAction())){stopSelf();return START_NOT_STICKY;}
  boolean wantShare=intent.getBooleanExtra("sharing",false);exploring=intent.getBooleanExtra("exploring",false);cameras=intent.getBooleanExtra("cameras",false);if(cameras&&cameraAlerts==null)try{cameraAlerts=new CameraAlerts(this);}catch(Exception e){cameras=false;status("Camera data unavailable: "+e.getMessage());}
  if(!wantShare&&!exploring&&!cameras){stopSelf();return START_NOT_STICKY;}
  PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
  PendingIntent stop=PendingIntent.getService(this,0,new Intent(this,TrackingService.class).setAction("STOP"),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
  Notification notice=new Notification.Builder(this,"drive").setContentTitle("Crewline drive active").setContentText("Location "+(wantShare?"shared with crew":"private")+(exploring?" • exploration recording":"")+(cameras?" • camera alerts":"")).setSmallIcon(android.R.drawable.ic_menu_mylocation).setContentIntent(open).addAction(new Notification.Action.Builder(null,"Stop all",stop).build()).setOngoing(true).build();
  startForeground(51,notice);
  if(wantShare!=sharing){sharing=wantShare;generation++;final int g=generation;epoch="";
   if(wantShare)network.execute(()->{try{JSONObject r=Api.callAt(serverUrl,sessionToken,"/sharing","PUT",new JSONObject());new Handler(getMainLooper()).post(()->{if(!destroyed&&generation==g){epoch=r.optString("epoch");status("Sharing enabled; waiting for GPS");}});}catch(Exception e){status("Sharing connection: "+e.getMessage());new Handler(getMainLooper()).post(()->{if(generation==g){sharing=false;if(!exploring&&!cameras)stopSelf();}});}});
   else network.execute(()->{try{Api.callAt(serverUrl,sessionToken,"/sharing","DELETE",null);status("Ghost Mode enabled");}catch(Exception e){status("Ghost Mode local; remote marker expires within 60 seconds");}});
  }
  try{manager.removeUpdates(this);boolean available=false;for(String provider:new String[]{LocationManager.GPS_PROVIDER,LocationManager.NETWORK_PROVIDER})if(manager.getAllProviders().contains(provider)){manager.requestLocationUpdates(provider,5000,0,this);if(manager.isProviderEnabled(provider))available=true;}if(!available)status("Enable phone Location to track your drive");}catch(SecurityException e){status("Location permission missing");stopSelf();}
  return START_NOT_STICKY;
 }
 void status(String s){Store.prefs(this).edit().putString("trackingStatus",s).apply();}
 public void onLocationChanged(Location l){if(destroyed||l.getAccuracy()>100||SystemClock.elapsedRealtimeNanos()-l.getElapsedRealtimeNanos()>60000000000L)return;
  Store.prefs(this).edit().putString("lastLat",Double.toString(l.getLatitude())).putString("lastLon",Double.toString(l.getLongitude())).apply();
  if(cameras&&cameraAlerts!=null)cameraAlerts.location(l);
  if(exploring)store.reveal(Store.owner(this),l);
  if(sharing&&!epoch.isEmpty()&&!uploadPending&&SystemClock.elapsedRealtime()-lastSent>=4500){lastSent=SystemClock.elapsedRealtime();uploadPending=true;final String e=epoch;final int g=generation;
   network.execute(()->{try{JSONObject b=new JSONObject();b.put("lat",l.getLatitude());b.put("lon",l.getLongitude());b.put("epoch",e);Api.callAt(serverUrl,sessionToken,"/location","PUT",b);status("Crew location updated");}catch(Exception ex){status("Location upload: "+ex.getMessage());}finally{uploadPending=false;}});
  }else if(!sharing)status(cameras?"Camera alerts active · location private":"Exploring privately");
 }
 public void onProviderEnabled(String p){status("Location enabled; waiting for GPS");}public void onProviderDisabled(String p){status("Location provider disabled: "+p);}public void onStatusChanged(String p,int s,Bundle b){}
 public void onDestroy(){destroyed=true;generation++;sharing=false;exploring=false;cameras=false;epoch="";manager.removeUpdates(this);instance=null;store.close();network.execute(()->{try{Api.callAt(serverUrl,sessionToken,"/sharing","DELETE",null);status("Stopped");}catch(Exception e){status("Stopped locally; remote marker expires within 60 seconds");}});super.onDestroy();}
 public IBinder onBind(Intent i){return null;}
}
