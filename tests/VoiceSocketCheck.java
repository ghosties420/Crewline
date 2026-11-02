package nz.crewline.app;
import java.util.*;
// Uses the actual Android client's transport class against a local TLS test server.
public class VoiceSocketCheck {
 public static void main(String[] args)throws Exception{
  for(int sample=-32768;sample<=32767;sample+=17)if(Math.abs(sample-VoiceCodec.decode(VoiceCodec.encode(sample)))>1024)throw new Exception("Codec distortion exceeded bound");
  try(VoiceSocket a=new VoiceSocket();VoiceSocket b=new VoiceSocket()){
   a.connect(args[0],args[1],args[3]);b.connect(args[0],args[2],args[3]);
   byte[] pcm=new byte[160];Arrays.fill(pcm,(byte)67);a.send(pcm,2);byte[] result=b.read();if(result.length!=208||result[48]!=67)throw new Exception("PCM relay failed");
   Arrays.fill(pcm,(byte)91);b.send(pcm,2);if(a.read()[48]!=91)throw new Exception("Reverse PCM relay failed");
   System.out.println("PASS: native Java TLS/WebSocket transport sends and receives voice packets");
  }
 }
}
