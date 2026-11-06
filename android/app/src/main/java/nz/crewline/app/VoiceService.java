package nz.crewline.app;
import android.app.*;import android.content.*;import android.os.*;import android.media.*;import android.media.audiofx.*;import java.util.*;import java.util.concurrent.*;import org.json.*;

// Audio is relayed through the same private HTTPS server: no STUN/TURN or extra ports.
// 8 kHz mono G.711 mu-law, 20 ms frames; audio is never written to disk.
public class VoiceService extends Service {
 static volatile VoiceService instance;volatile boolean running=false,muted=false,speaker=false,radio=false;volatile long talkUntil=0;String callId="",base="",token="";volatile String status="Connecting";
 VoiceSocket voice;AudioRecord recorder;AudioManager audio;AudioFocusRequest focus;Thread capture,receive;AcousticEchoCanceler echo;NoiseSuppressor noise;PowerManager.WakeLock wake;
 final Map<String,AudioTrack> players=new HashMap<>();
 public void onCreate(){super.onCreate();instance=this;audio=(AudioManager)getSystemService(AUDIO_SERVICE);NotificationChannel ch=new NotificationChannel("voice","Voice calls",NotificationManager.IMPORTANCE_LOW);((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(ch);}
 public int onStartCommand(Intent i,int flags,int startId){if(i==null||"HANGUP".equals(i.getAction())){stopSelf();return START_NOT_STICKY;}if(running)return START_NOT_STICKY;radio=i.getBooleanExtra("radio",false);muted=radio;talkUntil=0;callId=i.getStringExtra("call");if(callId==null||!callId.matches("[a-f0-9]{48}")){stopSelf();return START_NOT_STICKY;}base=Store.prefs(this).getString("server","");token=Store.token(this);
  PendingIntent open=PendingIntent.getActivity(this,4,new Intent(this,MainActivity.class).putExtra("communications",true),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT),stop=PendingIntent.getService(this,5,new Intent(this,VoiceService.class).setAction("HANGUP"),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
  startForeground(52,new Notification.Builder(this,"voice").setContentTitle("Crewline voice call").setContentText("Microphone active • tap to open controls").setSmallIcon(android.R.drawable.ic_btn_speak_now).setContentIntent(open).addAction(new Notification.Action.Builder(null,"Hang up",stop).build()).setOngoing(true).build());
  running=true;wake=((PowerManager)getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"Crewline:voice");wake.acquire(4*60*60*1000L);
  receive=new Thread(()->{try{
   focus=new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT).setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build()).setOnAudioFocusChangeListener(change->{if(change==AudioManager.AUDIOFOCUS_LOSS||change==AudioManager.AUDIOFOCUS_LOSS_TRANSIENT){status="Call stopped: audio focus lost";stopSelf();}},new Handler(getMainLooper())).build();
   if(audio.requestAudioFocus(focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED)throw new Exception("Microphone/audio is in use by another app");audio.setMode(AudioManager.MODE_IN_COMMUNICATION);audio.setSpeakerphoneOn(false);
   Api.callAt(base,token,"/calls/"+callId+"/join","POST",new JSONObject());
   voice=new VoiceSocket();voice.connect(base,token,callId);if(!running)return;
   int minimum=AudioRecord.getMinBufferSize(8000,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT);if(minimum<0)throw new Exception("Phone does not support 8 kHz voice audio");
   recorder=new AudioRecord(MediaRecorder.AudioSource.VOICE_COMMUNICATION,8000,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT,Math.max(minimum,3200));if(recorder.getState()!=AudioRecord.STATE_INITIALIZED)throw new Exception("Cannot initialise microphone");
   if(AcousticEchoCanceler.isAvailable()){echo=AcousticEchoCanceler.create(recorder.getAudioSessionId());if(echo!=null)echo.setEnabled(true);}if(NoiseSuppressor.isAvailable()){noise=NoiseSuppressor.create(recorder.getAudioSessionId());if(noise!=null)noise.setEnabled(true);}
   recorder.startRecording();status="Connected";Store.prefs(this).edit().putString("callStatus",status).apply();capture=new Thread(()->captureLoop(),"crewline-microphone");capture.start();
   while(running){byte[] packet=voice.read();String sender=new String(packet,0,48,"US-ASCII");String playback=radio?"radio":sender;synchronized(players){AudioTrack player=players.get(playback);if(player==null){int min=AudioTrack.getMinBufferSize(8000,AudioFormat.CHANNEL_OUT_MONO,AudioFormat.ENCODING_PCM_16BIT);player=new AudioTrack.Builder().setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build()).setAudioFormat(new AudioFormat.Builder().setSampleRate(8000).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).setEncoding(AudioFormat.ENCODING_PCM_16BIT).build()).setBufferSizeInBytes(Math.max(min,3200)).setTransferMode(AudioTrack.MODE_STREAM).build();player.play();players.put(playback,player);for(AudioTrack p:players.values())p.setVolume(1f/(float)Math.sqrt(players.size()));}byte[] decoded=VoiceCodec.unpack(packet,48);player.write(decoded,0,decoded.length,AudioTrack.WRITE_NON_BLOCKING);}}
  }catch(Exception e){if(running){status=e.getMessage();Store.prefs(this).edit().putString("callStatus",status==null?"Call ended":status).apply();}}finally{if(voice!=null)voice.close();stopSelf();}},"crewline-call");receive.start();return START_NOT_STICKY;
 }
 void captureLoop(){try{byte[] packet=new byte[320];while(running){int p=0;while(p<320&&running){int n=recorder.read(packet,p,320-p,AudioRecord.READ_BLOCKING);if(n<0)throw new Exception("Microphone stopped");p+=n;}if(!running)break;
   // The WebSocket ping/pong keeps muted listeners connected. Silence frames
   // would otherwise be forwarded to every listener and multiply traffic.
   if(radio?android.os.SystemClock.elapsedRealtime()>talkUntil:muted)continue;
   voice.send(VoiceCodec.pack(packet),2);
  }}catch(Exception e){if(running){Store.prefs(this).edit().putString("callStatus","Audio connection lost").apply();stopSelf();}}}
 static JSONObject state(Context c){JSONObject o=new JSONObject();try{VoiceService s=instance;o.put("active",s!=null&&s.running);o.put("id",s==null?"":s.callId);o.put("muted",s!=null&&(s.radio?android.os.SystemClock.elapsedRealtime()>s.talkUntil:s.muted));o.put("radio",s!=null&&s.radio);o.put("speaker",s!=null&&s.speaker);o.put("status",s==null?Store.prefs(c).getString("callStatus",""):s.status);}catch(Exception ignored){}return o;}
 void speaker(boolean enabled){speaker=enabled;audio.setSpeakerphoneOn(enabled);}
 public void onDestroy(){running=false;if("Connected".equals(status)||"Connecting".equals(status))Store.prefs(this).edit().putString("callStatus","Call ended").apply();if(voice!=null)voice.close();if(recorder!=null){try{recorder.stop();}catch(Exception ignored){}}
  // Join workers away from the UI thread, then release shared audio objects.
  new Thread(()->{try{if(capture!=null)capture.join(1500);if(receive!=null)receive.join(1500);}catch(Exception ignored){}if(recorder!=null)recorder.release();if(echo!=null)echo.release();if(noise!=null)noise.release();synchronized(players){for(AudioTrack p:players.values()){p.stop();p.release();}players.clear();}if(focus!=null)audio.abandonAudioFocusRequest(focus);audio.setSpeakerphoneOn(false);audio.setMode(AudioManager.MODE_NORMAL);if(instance==this)instance=null;try{Api.callAt(base,token,"/calls/"+callId+"/leave","POST",new JSONObject());}catch(Exception ignored){}},"crewline-call-cleanup").start();if(wake!=null&&wake.isHeld())wake.release();super.onDestroy();}
 public IBinder onBind(Intent i){return null;}
}
