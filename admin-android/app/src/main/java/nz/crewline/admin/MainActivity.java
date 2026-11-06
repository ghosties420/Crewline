package nz.crewline.admin;

import android.app.*;
import android.os.*;
import android.content.*;
import android.net.Uri;
import android.webkit.*;
import android.view.*;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import org.json.*;
import java.io.*;
import java.net.*;
import java.security.KeyStore;
import java.util.concurrent.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.KeyGenerator;
import android.util.Base64;

public final class MainActivity extends Activity {
 private static final String ORIGIN="https://appassets.androidplatform.net/";
 private final ExecutorService queue=Executors.newSingleThreadExecutor();
 private WebView web;
 private android.content.SharedPreferences prefs;
 private String token="";

 @Override public void onCreate(Bundle saved){super.onCreate(saved);
  getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE,WindowManager.LayoutParams.FLAG_SECURE);
  prefs=getSharedPreferences("admin",MODE_PRIVATE);token=readToken();
  web=new WebView(this);setContentView(web);
  if(Build.VERSION.SDK_INT>=30)web.setOnApplyWindowInsetsListener((v,insets)->{
   android.graphics.Insets i=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());
   v.setPadding(i.left,i.top,i.right,i.bottom);return insets;
  });
  WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(false);
  s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  s.setJavaScriptCanOpenWindowsAutomatically(false);s.setSupportMultipleWindows(false);
  web.addJavascriptInterface(new Bridge(),"Native");web.setWebChromeClient(new WebChromeClient());
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return true;}
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){
    if(!"appassets.androidplatform.net".equals(r.getUrl().getHost()))return null;
    String p=r.getUrl().getPath();if(p==null||p.contains(".."))return notFound();
    try{String file=p.equals("/")?"index.html":p.substring(1);
     String mime=file.endsWith(".css")?"text/css":file.endsWith(".js")?"application/javascript":"text/html";
     return new WebResourceResponse(mime,"UTF-8",getAssets().open(file));
    }catch(IOException e){return notFound();}
   }
   private WebResourceResponse notFound(){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",null,new ByteArrayInputStream(new byte[0]));}
  });web.loadUrl(ORIGIN);
 }
 private String readToken(){try{
  String stored=prefs.getString("session","");if(stored.isEmpty())return "";
  byte[] raw=Base64.decode(stored,Base64.NO_WRAP),nonce=new byte[12];
  System.arraycopy(raw,0,nonce,0,12);
  Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,nonce));
  return new String(c.doFinal(raw,12,raw.length-12),"UTF-8");
 }catch(Exception e){prefs.edit().remove("session").apply();return "";}}
 private javax.crypto.SecretKey key()throws Exception{
  KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
  if(store.containsAlias("crewline-admin-token"))return ((KeyStore.SecretKeyEntry)store.getEntry("crewline-admin-token",null)).getSecretKey();
  KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
  generator.init(new KeyGenParameterSpec.Builder("crewline-admin-token",KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
   .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
  return generator.generateKey();
 }
 private void saveToken(String value)throws Exception{
  token=value;if(value.isEmpty()){prefs.edit().remove("session").apply();return;}
  Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());
  byte[] data=c.doFinal(value.getBytes("UTF-8")),nonce=c.getIV(),raw=new byte[nonce.length+data.length];
  System.arraycopy(nonce,0,raw,0,nonce.length);System.arraycopy(data,0,raw,nonce.length,data.length);
  prefs.edit().putString("session",Base64.encodeToString(raw,Base64.NO_WRAP)).apply();
 }
 private static String checkedServer(String input)throws Exception{
  URI u=new URI(input.trim());if(!"https".equals(u.getScheme())||u.getHost()==null||u.getUserInfo()!=null||u.getQuery()!=null||u.getFragment()!=null||(!u.getPath().isEmpty()&&!u.getPath().equals("/")))
   throw new IOException("Enter the HTTPS Crewline server address");return u.toString().replaceAll("/+$","");
 }
 private JSONObject api(String server,String auth,String path,String method,JSONObject data)throws Exception{
  if(!path.startsWith("/")||path.startsWith("//"))throw new IOException("Invalid path");
  HttpURLConnection c=(HttpURLConnection)new URL(server+path).openConnection();
  try{c.setInstanceFollowRedirects(false);c.setConnectTimeout(8000);c.setReadTimeout(8000);c.setRequestMethod(method);
   c.setRequestProperty("Content-Type","application/json");if(!auth.isEmpty())c.setRequestProperty("Authorization","Bearer "+auth);
   if(data!=null){c.setDoOutput(true);try(OutputStream out=c.getOutputStream()){out.write(data.toString().getBytes("UTF-8"));}}
   int status=c.getResponseCode();InputStream stream=status<400?c.getInputStream():c.getErrorStream();
   if(stream==null)throw new IOException("HTTP "+status);
   ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(InputStream in=stream){byte[] chunk=new byte[4096];int count;
    while((count=in.read(chunk))!=-1){bytes.write(chunk,0,count);if(bytes.size()>2*1024*1024)throw new IOException("Response too large");}}
   JSONObject result=new JSONObject(bytes.toString("UTF-8"));if(status<200||status>=300)throw new IOException(result.optString("error","HTTP "+status));return result;
  }finally{c.disconnect();}
 }
 private void result(String id,Object data,String error){runOnUiThread(()->{
  if(!isDestroyed())web.evaluateJavascript("window.nativeResult("+JSONObject.quote(id)+","+(data==null?"null":data.toString())+","+(error==null?"null":JSONObject.quote(error))+")",null);
 });}
 public final class Bridge {
  @JavascriptInterface public void request(String id,String action,String json){
   queue.execute(()->{try{JSONObject b=new JSONObject(json);Object out=new JSONObject();String server=prefs.getString("server","");
    switch(action){
     case "boot":out=new JSONObject().put("server",server).put("signedIn",!token.isEmpty()).put("name",prefs.getString("name",""));break;
     case "login":{
      String url=checkedServer(b.getString("server"));JSONObject response=api(url,"","/login","POST",new JSONObject().put("name",b.getString("name")).put("password",b.getString("password")));
      String fresh=response.getString("token");JSONObject state=api(url,fresh,"/state","GET",null);
      String role=state.getJSONObject("me").optString("site_role");
      if(!role.equals("admin")&&!role.equals("moderator"))throw new IOException("This account has no staff access");
      saveToken(fresh);prefs.edit().putString("server",url).putString("name",b.getString("name")).apply();out=new JSONObject().put("role",role);break;
     }
     case "api":{
      if(token.isEmpty())throw new IOException("Sign in again");String path=b.getString("path"),method=b.optString("method","GET");
      if(!path.matches("/admin/(dashboard|metrics|contact|signup|users|reports|content)(\\?kind=(post|message|event|event-message|vehicle|convoy)&target=[a-zA-Z0-9]+)?")||!method.matches("GET|PUT|DELETE"))throw new IOException("Unsupported admin action");
      out=api(server,token,path,method,b.optJSONObject("body"));break;
     }
     case "logout":{
      if(!token.isEmpty())try{api(server,token,"/logout","POST",null);}catch(Exception ignored){}
      saveToken("");out=new JSONObject().put("ok",true);break;
     }
     case "terminal":{
      String host=b.getString("host").trim(),username=b.getString("user").trim();int port=b.optInt("port",22);
      if(!host.matches("[A-Za-z0-9.-]{1,253}")||!username.matches("[A-Za-z0-9_-]{1,32}")||port<1||port>65535)throw new IOException("Invalid SSH address");
      Uri uri=Uri.parse("ssh://"+username+"@"+host+":"+port);
      runOnUiThread(()->{try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception e){new AlertDialog.Builder(MainActivity.this).setTitle("SSH app required").setMessage("Install a trusted Android SSH client, or use Termux with the SSH command shown in Crewline Admin.").setPositiveButton("OK",null).show();}});
      break;
     }
     default:throw new IOException("Unknown action");
    }result(id,out,null);
   }catch(Exception e){result(id,null,e.getMessage()==null?"Request failed":e.getMessage());}});
  }
 }
 @Override protected void onDestroy(){web.removeJavascriptInterface("Native");web.destroy();queue.shutdownNow();super.onDestroy();}
}
