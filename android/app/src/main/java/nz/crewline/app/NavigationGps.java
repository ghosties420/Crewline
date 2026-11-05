package nz.crewline.app;
import android.location.*;import android.os.*;import android.view.WindowManager;import org.json.*;
// Separate foreground listener: never uploads locations or enables crew sharing.
final class NavigationGps implements LocationListener {
 final MainActivity activity;final LocationManager manager;boolean wanted=false,listening=false;String session="";long last=0;Location latest;
 NavigationGps(MainActivity a){activity=a;manager=(LocationManager)a.getSystemService(android.content.Context.LOCATION_SERVICE);}
 void start(String token)throws Exception{stop();session=token;wanted=true;try{resume();}catch(Exception e){stop();throw e;}}
 void resume()throws Exception{if(!wanted||listening)return;if(!activity.radioForeground)throw new Exception("Open Crewline to follow your location");if(!manager.isProviderEnabled(LocationManager.GPS_PROVIDER))throw new Exception("Enable phone Location to resume navigation");manager.requestLocationUpdates(LocationManager.GPS_PROVIDER,250,0,this,Looper.getMainLooper());listening=true;last=0;activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);}
 void pause(){latest=null;manager.removeUpdates(this);listening=false;if(!activity.driveGps.active)activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);}
 void stop(){wanted=false;pause();}
 JSONObject pingPoint()throws Exception{if(latest==null||!listening||!activity.radioForeground)return null;double age=(SystemClock.elapsedRealtimeNanos()-latest.getElapsedRealtimeNanos())/1000000.0;if(age<0||age>3000)return null;return new JSONObject().put("lat",latest.getLatitude()).put("lon",latest.getLongitude());}
 public void onLocationChanged(Location l){if(!wanted||!listening||!activity.radioForeground)return;long time=l.getElapsedRealtimeNanos();double age=(SystemClock.elapsedRealtimeNanos()-time)/1000000.0;if(time<=last||age<0||age>3000||!l.hasAccuracy()||l.getAccuracy()>50)return;last=time;latest=new Location(l);try{JSONObject s=new JSONObject().put("session",session).put("lat",l.getLatitude()).put("lon",l.getLongitude()).put("accuracy",l.getAccuracy()).put("age",age).put("t",time/1000000.0);activity.web.evaluateJavascript("window.navigationSample&&window.navigationSample("+s.toString()+")",null);}catch(Exception ignored){}}
 public void onProviderDisabled(String p){latest=null;activity.web.evaluateJavascript("window.navigationPaused&&window.navigationPaused()",null);}
 public void onProviderEnabled(String p){}public void onStatusChanged(String p,int s,Bundle b){}
}
