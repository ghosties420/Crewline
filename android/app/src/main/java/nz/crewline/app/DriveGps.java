package nz.crewline.app;
import android.location.*;import android.os.*;import android.view.WindowManager;import org.json.*;
// Foreground-only GPS. It never calls the network or starts crew location sharing.
final class DriveGps implements LocationListener {
 final MainActivity activity;final LocationManager manager;boolean active;
 DriveGps(MainActivity a){activity=a;manager=(LocationManager)a.getSystemService(android.content.Context.LOCATION_SERVICE);}
 void start()throws Exception{stop();if(!manager.isProviderEnabled(LocationManager.GPS_PROVIDER))throw new Exception("Enable phone Location and try outdoors");active=true;try{manager.requestLocationUpdates(LocationManager.GPS_PROVIDER,250,0,this,Looper.getMainLooper());activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);}catch(Exception e){stop();throw e;}}
 void stop(){active=false;manager.removeUpdates(this);activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);}
 public void onLocationChanged(Location l){if(!active)return;try{JSONObject s=new JSONObject();s.put("t",l.getElapsedRealtimeNanos()/1000000.0);s.put("age",(SystemClock.elapsedRealtimeNanos()-l.getElapsedRealtimeNanos())/1000000.0);s.put("speed",l.hasSpeed()?l.getSpeed():JSONObject.NULL);s.put("accuracy",l.hasAccuracy()?l.getAccuracy():JSONObject.NULL);s.put("speedAccuracy",l.hasSpeedAccuracy()?l.getSpeedAccuracyMetersPerSecond():JSONObject.NULL);s.put("mock",l.isFromMockProvider());activity.web.evaluateJavascript("window.driveSample&&window.driveSample("+s.toString()+")",null);}catch(Exception ignored){}}
 public void onProviderDisabled(String p){activity.web.evaluateJavascript("window.drivePaused&&window.drivePaused()",null);stop();}
 public void onProviderEnabled(String p){}public void onStatusChanged(String p,int s,Bundle b){}
}
