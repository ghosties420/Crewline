package nz.crewline.admin;

import android.app.*;
import android.content.*;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.jcraft.jsch.*;
import java.io.*;
import java.security.KeyStore;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;

/** An actual SSH2 PTY inside the Admin app; no Termux or other-profile app needed. */
final class SshTerminal {
 interface Events {void onTerminalEvent(String kind,String message);}
 private final Activity activity;
 private final Events events;
 private final android.content.SharedPreferences prefs;
 private volatile Session session;
 private volatile ChannelShell channel;
 private volatile OutputStream writer;
 private volatile Thread reader;

 SshTerminal(Activity activity,Events events){this.activity=activity;this.events=events;
  this.prefs=activity.getSharedPreferences("admin-ssh",Context.MODE_PRIVATE);}

 private javax.crypto.SecretKey encryptionKey()throws Exception{
  KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
  String alias="crewline-admin-ssh-key";
  if(store.containsAlias(alias))return ((KeyStore.SecretKeyEntry)store.getEntry(alias,null)).getSecretKey();
  KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
  generator.init(new KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
   .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
  return generator.generateKey();
 }
 private String protect(byte[] clear)throws Exception{
  Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,encryptionKey());
  byte[] nonce=c.getIV(),body=c.doFinal(clear),raw=new byte[nonce.length+body.length];
  System.arraycopy(nonce,0,raw,0,nonce.length);System.arraycopy(body,0,raw,nonce.length,body.length);
  return Base64.encodeToString(raw,Base64.NO_WRAP);
 }
 private byte[] unprotect(String stored)throws Exception{
  byte[] raw=Base64.decode(stored,Base64.NO_WRAP);if(raw.length<29)throw new IOException("SSH key data is invalid");
  byte[] nonce=new byte[12];System.arraycopy(raw,0,nonce,0,12);
  Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,encryptionKey(),new GCMParameterSpec(128,nonce));
  return c.doFinal(raw,12,raw.length-12);
 }
 /** Each GrapheneOS profile gets its own key; public key is safe to copy. */
 synchronized String publicKey()throws Exception{
  String publicPart=prefs.getString("public-key","");if(!publicPart.isEmpty())return publicPart;
  if(prefs.contains("private-key"))throw new IOException("SSH key needs recovery; do not silently replace an authorised key");
  com.jcraft.jsch.KeyPair pair=com.jcraft.jsch.KeyPair.genKeyPair(new JSch(),com.jcraft.jsch.KeyPair.RSA,3072);
  try{
   ByteArrayOutputStream privateBytes=new ByteArrayOutputStream(),publicBytes=new ByteArrayOutputStream();
   pair.writePrivateKey(privateBytes);pair.writePublicKey(publicBytes,"crewline-admin");
   String protectedKey=protect(privateBytes.toByteArray());
   publicPart=publicBytes.toString("UTF-8").trim();
   prefs.edit().putString("private-key",protectedKey).putString("public-key",publicPart).commit();
   return publicPart;
  }finally{pair.dispose();}
 }
 boolean connected(){ChannelShell c=channel;return c!=null&&c.isConnected();}
 void connect(String host,String user,int port,String password)throws Exception{
  if(!host.matches("[A-Za-z0-9.-]{1,253}")||!user.matches("[A-Za-z0-9_-]{1,32}")||port<1||port>65535)
   throw new IOException("Check SSH host, username and port");
  disconnect();
  JSch jsch=new JSch();File hosts=new File(activity.getFilesDir(),"ssh-known-hosts");
  if(!hosts.exists()&&!hosts.createNewFile())throw new IOException("Cannot initialise known hosts");
  jsch.setKnownHosts(hosts.getAbsolutePath());
  byte[] privateKey=unprotect(prefs.getString("private-key",""));
  try{jsch.addIdentity("crewline-admin",privateKey,null,null);}finally{java.util.Arrays.fill(privateKey,(byte)0);}
  Session s=jsch.getSession(user,host,port);
  s.setConfig("StrictHostKeyChecking","ask");
  s.setConfig("PreferredAuthentications","publickey,password,keyboard-interactive");
  s.setUserInfo(new UserInfo(){
   @Override public String getPassphrase(){return null;}
   @Override public String getPassword(){return password==null?"":password;}
   @Override public boolean promptPassword(String message){return password!=null&&!password.isEmpty();}
   @Override public boolean promptPassphrase(String message){return false;}
   @Override public void showMessage(String message){events.onTerminalEvent("notice",message);}
   @Override public boolean promptYesNo(String message){
    // Never offer to accept a changed/revoked known host key.
    String check=message.toLowerCase(java.util.Locale.ROOT);
    if(check.contains("changed")||check.contains("revoked")||check.contains("offending"))return false;
    AtomicBoolean accepted=new AtomicBoolean(false);CountDownLatch latch=new CountDownLatch(1);
    activity.runOnUiThread(()->new AlertDialog.Builder(activity).setTitle("Verify SSH host key")
      .setMessage(message+"\n\nCompare this fingerprint against the server's SSH host key before trusting it.")
      .setPositiveButton("Trust this key",(d,w)->{accepted.set(true);latch.countDown();})
      .setNegativeButton("Cancel",(d,w)->latch.countDown())
      .setOnCancelListener(d->latch.countDown()).show());
    try{return latch.await(60,TimeUnit.SECONDS)&&accepted.get();}
    catch(InterruptedException e){Thread.currentThread().interrupt();return false;}
   }
  });
  try{
   s.connect(15000);session=s;
   ChannelShell shell=(ChannelShell)s.openChannel("shell");shell.setPty(true);shell.setPtyType("xterm");
   InputStream input=shell.getInputStream();OutputStream output=shell.getOutputStream();
   shell.connect(10000);channel=shell;writer=output;
   events.onTerminalEvent("connected",host);
   reader=new Thread(()->{
    try{byte[] buffer=new byte[2048];int n;while((n=input.read(buffer))!=-1){
     if(n>0)events.onTerminalEvent("output",new String(buffer,0,n,java.nio.charset.StandardCharsets.UTF_8));
    }}catch(IOException e){if(connected())events.onTerminalEvent("notice",e.getMessage());}
    finally{disconnect();events.onTerminalEvent("closed","SSH session ended");}
   },"crewline-admin-ssh-output");reader.setDaemon(true);reader.start();
  }catch(Exception e){s.disconnect();throw e;}
 }
 synchronized void send(String input)throws IOException{
  if(!connected()||writer==null)throw new IOException("Connect to SSH first");
  if(input.length()>8192)throw new IOException("Terminal input too long");
  writer.write(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));writer.flush();
 }
 synchronized void disconnect(){
  if(channel!=null)channel.disconnect();if(session!=null)session.disconnect();
  channel=null;session=null;writer=null;
 }
}
