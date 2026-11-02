package nz.crewline.app;
import java.util.*;
public class CameraProximityCheck {
 static void check(boolean b,String m){if(!b)throw new AssertionError(m);}
 public static void main(String[] args){CameraProximity.Camera c=new CameraProximity.Camera("one","Test camera",-41,174);CameraProximity d=new CameraProximity(Arrays.asList(c));check(Math.abs(CameraProximity.distance(-41,174,-41.001,174)-111.195)<1,"distance");check(d.update(-41.006,174,10,12,0)==null,"outside radius");check(d.update(-41.004,174,10,12,5000)==c,"approaching at 444m");check(d.update(-41.003,174,10,12,20000)==null,"duplicate suppressed");d.update(-41.02,174,10,12,30000);check(d.update(-41.004,174,10,12,40000)==c,"rearm beyond 1km");CameraProximity bad=new CameraProximity(Arrays.asList(c));bad.update(-41.004,174,10,12,0);check(bad.update(-41.0045,174,10,12,5000)==null,"moving away");check(bad.update(-41.003,174,80,12,10000)==null,"poor accuracy");check(bad.update(-41.003,174,10,0,15000)==null,"stationary");check(bad.update(-41.003,174,Double.NaN,12,20000)==null,"invalid accuracy");System.out.println("PASS: camera distance, approach, radius, repeat suppression, rearm, departure, accuracy, stationary checks");}
}
