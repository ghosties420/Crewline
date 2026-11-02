package nz.crewline.app;
import java.util.*;
// Pure Java approach detector. No road matching: the UI explicitly labels proximity alerts.
public final class CameraProximity {
 public static final class Camera {public final String id,label;public final double lat,lon;public Camera(String i,String n,double a,double o){id=i;label=n;lat=a;lon=o;}}
 final List<Camera> cameras;final Set<String> alerted=new HashSet<>();final Map<String,Double> previous=new HashMap<>();long lastAlert=-30000;
 public CameraProximity(List<Camera> list){cameras=list;}
 public static double distance(double a,double o,double b,double p){double x=Math.toRadians(b-a),y=Math.toRadians(p-o),h=Math.sin(x/2)*Math.sin(x/2)+Math.cos(Math.toRadians(a))*Math.cos(Math.toRadians(b))*Math.sin(y/2)*Math.sin(y/2);return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));}
 public Camera update(double lat,double lon,double accuracy,double speed,long now){if(!Double.isFinite(lat)||!Double.isFinite(lon)||!Double.isFinite(accuracy)||accuracy>50||accuracy<0||!Double.isFinite(speed)||speed<2)return null;Camera best=null;double nearest=501;
 for(Camera c:cameras){double d=distance(lat,lon,c.lat,c.lon);Double old=previous.put(c.id,d);if(d>1000)alerted.remove(c.id);if(d<=500&&old!=null&&old-d>3&&!alerted.contains(c.id)&&d<nearest){best=c;nearest=d;}}
 if(best!=null&&now-lastAlert>=10000){alerted.add(best.id);lastAlert=now;return best;}return null;
 }
}
